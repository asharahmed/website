#!/usr/bin/env bash
set -euo pipefail

OUT="/var/www/html/status/metrics.json"
TMP="/var/www/html/status/metrics.json.tmp"
PREV="/var/tmp/status-metrics.prev"
PREV_IO="/var/tmp/status-metrics.io"
HIST="/var/tmp/status-metrics.history"
MAX_POINTS=60

read -r _ user nice system idle iowait irq softirq steal _ _ < /proc/stat

prev_total=0
prev_idle=0
if [ -f "$PREV" ]; then
  read -r prev_total prev_idle < "$PREV"
fi

total=$((user + nice + system + idle + iowait + irq + softirq + steal))
idle_all=$((idle + iowait))
echo "$total $idle_all" > "$PREV"

cpu_usage=""
if [ "$prev_total" -gt 0 ] && [ "$total" -gt "$prev_total" ]; then
  delta_total=$((total - prev_total))
  delta_idle=$((idle_all - prev_idle))
  cpu_usage=$(awk -v dt="$delta_total" -v di="$delta_idle" 'BEGIN { if (dt>0) { printf "%.2f", (dt-di)*100/dt } }')
fi

cores=$(getconf _NPROCESSORS_ONLN)

mem_total_kb=$(awk '/MemTotal:/ {print $2}' /proc/meminfo)
mem_available_kb=$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)
mem_used_kb=$((mem_total_kb - mem_available_kb))
mem_usage=$(awk -v t="$mem_total_kb" -v u="$mem_used_kb" 'BEGIN { if (t>0) { printf "%.2f", (u*100)/t } }')

swap_total_kb=$(awk '/SwapTotal:/ {print $2}' /proc/meminfo)
swap_free_kb=$(awk '/SwapFree:/ {print $2}' /proc/meminfo)
swap_used_kb=$((swap_total_kb - swap_free_kb))
swap_usage=""
if [ "$swap_total_kb" -gt 0 ]; then
  swap_usage=$(awk -v t="$swap_total_kb" -v u="$swap_used_kb" 'BEGIN { printf "%.2f", (u*100)/t }')
fi

read -r disk_total disk_used disk_avail disk_pct < <(df -P -B1 / | awk 'NR==2 {print $2, $3, $4, $5}')
disk_pct=${disk_pct%%%}

root_source=$(findmnt -n -o SOURCE /)
disk_name=""
if [[ "$root_source" == /dev/* ]]; then
  disk_name=${root_source#/dev/}
fi
if [[ "$disk_name" == mapper/* ]]; then
  disk_name=""
fi
if [ -z "$disk_name" ]; then
  disk_name=$(lsblk -no PKNAME "$root_source" 2>/dev/null || true)
fi
if [ -z "$disk_name" ]; then
  disk_name=$(df -P / | awk 'NR==2 {print $1}' | sed 's#/dev/##')
fi

read -r _ _ _ _ _ sectors_read _ _ _ sectors_written _ _ _ < <(awk -v dev="$disk_name" '$3==dev {print $0}' /proc/diskstats)

bytes_read=""
bytes_written=""
if [[ "$sectors_read" =~ ^[0-9]+$ ]]; then
  bytes_read=$((sectors_read * 512))
fi
if [[ "$sectors_written" =~ ^[0-9]+$ ]]; then
  bytes_written=$((sectors_written * 512))
fi

io_read_bps=""
io_write_bps=""
if [ -n "$bytes_read" ] && [ -n "$bytes_written" ]; then
  now_ts=$(date +%s)
  prev_ts=0
  prev_read=0
  prev_write=0
  if [ -f "$PREV_IO" ]; then
    read -r prev_ts prev_read prev_write < "$PREV_IO"
  fi
  echo "$now_ts $bytes_read $bytes_written" > "$PREV_IO"
  if [ "$prev_ts" -gt 0 ] && [ "$now_ts" -gt "$prev_ts" ] && [ "$bytes_read" -ge "$prev_read" ] && [ "$bytes_written" -ge "$prev_write" ]; then
    delta_sec=$((now_ts - prev_ts))
    delta_read=$((bytes_read - prev_read))
    delta_write=$((bytes_written - prev_write))
    io_read_bps=$(awk -v d="$delta_read" -v s="$delta_sec" 'BEGIN { if (s>0) { printf "%.2f", d/s } }')
    io_write_bps=$(awk -v d="$delta_write" -v s="$delta_sec" 'BEGIN { if (s>0) { printf "%.2f", d/s } }')
  fi
fi

read -r load1 load5 load15 _ < /proc/loadavg
uptime_seconds=$(awk '{printf "%.0f", $1}' /proc/uptime)

hostname=$(hostname)
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

service_state() {
  systemctl is-active "$1" 2>/dev/null || echo "unknown"
}

nginx_state=$(service_state nginx)
ssh_state=$(service_state ssh)
docker_state=$(service_state docker)
metrics_state=$(service_state status-metrics.timer)

cpu_history=$(awk -F= '$1=="cpu" {print $2}' "$HIST" 2>/dev/null || true)
memory_history=$(awk -F= '$1=="memory" {print $2}' "$HIST" 2>/dev/null || true)
disk_history=$(awk -F= '$1=="disk" {print $2}' "$HIST" 2>/dev/null || true)
io_history=$(awk -F= '$1=="io" {print $2}' "$HIST" 2>/dev/null || true)
load_history=$(awk -F= '$1=="load" {print $2}' "$HIST" 2>/dev/null || true)

append_history() {
  local series="$1"
  local value="${2:-null}"
  if [ -n "$series" ]; then
    series="${series},${value}"
  else
    series="$value"
  fi
  echo "$series" | awk -v max="$MAX_POINTS" -F',' '{
    start=NF-max+1; if (start<1) start=1;
    for (i=start;i<=NF;i++) {
      printf (i==start?"":",") $i
    }
  }'
}

io_total_bps=""
if [ -n "$io_read_bps" ] || [ -n "$io_write_bps" ]; then
  io_total_bps=$(awk -v r="${io_read_bps:-0}" -v w="${io_write_bps:-0}" 'BEGIN { printf "%.2f", r+w }')
fi

cpu_history=$(append_history "$cpu_history" "${cpu_usage:-null}")
memory_history=$(append_history "$memory_history" "${mem_usage:-null}")
disk_history=$(append_history "$disk_history" "${disk_pct:-null}")
io_history=$(append_history "$io_history" "${io_total_bps:-null}")
load_history=$(append_history "$load_history" "${load1:-null}")

cat > "$HIST" <<EOF_HIST
cpu=$cpu_history
memory=$memory_history
disk=$disk_history
io=$io_history
load=$load_history
EOF_HIST

cat > "$TMP" <<EOF_JSON
{
  "generated_at": "$timestamp",
  "hostname": "$hostname",
  "uptime_seconds": $uptime_seconds,
  "load_average": [$load1, $load5, $load15],
  "cpu": {
    "usage_percent": ${cpu_usage:-null},
    "cores": $cores
  },
  "memory": {
    "total_bytes": $((mem_total_kb * 1024)),
    "used_bytes": $((mem_used_kb * 1024)),
    "available_bytes": $((mem_available_kb * 1024)),
    "usage_percent": ${mem_usage:-null}
  },
  "swap": {
    "total_bytes": $((swap_total_kb * 1024)),
    "used_bytes": $((swap_used_kb * 1024)),
    "usage_percent": ${swap_usage:-null}
  },
  "disk": {
    "mount": "/",
    "total_bytes": $disk_total,
    "used_bytes": $disk_used,
    "available_bytes": $disk_avail,
    "usage_percent": ${disk_pct:-null}
  },
  "io": {
    "read_bps": ${io_read_bps:-null},
    "write_bps": ${io_write_bps:-null},
    "total_bps": ${io_total_bps:-null}
  },
  "services": {
    "nginx": "$nginx_state",
    "ssh": "$ssh_state",
    "docker": "$docker_state",
    "status-metrics": "$metrics_state"
  },
  "history": {
    "cpu": [${cpu_history}],
    "memory": [${memory_history}],
    "disk": [${disk_history}],
    "io": [${io_history}],
    "load": [${load_history}]
  }
}
EOF_JSON

mv "$TMP" "$OUT"
