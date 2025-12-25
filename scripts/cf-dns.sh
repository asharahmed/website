#!/usr/bin/env bash
set -euo pipefail

TOKEN_FILE="${CF_TOKEN_FILE:-/etc/website/env}"

if [ ! -f "$TOKEN_FILE" ]; then
  echo "cf-dns: token file not found: $TOKEN_FILE" >&2
  exit 1
fi

set -a
. "$TOKEN_FILE"
set +a

if [ -z "${CF_API_TOKEN:-}" ]; then
  echo "cf-dns: CF_API_TOKEN is missing" >&2
  exit 1
fi

usage() {
  echo "Usage:" >&2
  echo "  scripts/cf-dns.sh set <zone> <name> <type> <content> [ttl] [proxied]" >&2
  echo "Example:" >&2
  echo "  scripts/cf-dns.sh set asharahmed.com www A 159.203.35.5 300 false" >&2
}

cf_api() {
  local method=$1
  local path=$2
  local data=${3:-}

  if [ -n "$data" ]; then
    curl -sS -X "$method" "https://api.cloudflare.com/client/v4${path}" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "$data"
  else
    curl -sS -X "$method" "https://api.cloudflare.com/client/v4${path}" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json"
  fi
}

json_field() {
  local path=$1
  python3 -c 'import json, sys
data = json.load(sys.stdin)
path = sys.argv[1].split(".")
cur = data
for part in path:
    if part.endswith("]"):
        name, idx = part[:-1].split("[")
        cur = cur.get(name, [])
        cur = cur[int(idx)] if len(cur) > int(idx) else None
    else:
        cur = cur.get(part) if isinstance(cur, dict) else None
    if cur is None:
        break
print("" if cur is None else cur)' "$path"
}

command=${1:-}
if [ "$command" != "set" ]; then
  usage
  exit 1
fi

zone=${2:-}
name=${3:-}
type=${4:-}
content=${5:-}
ttl=${6:-300}
proxied=${7:-false}

if [ -z "$zone" ] || [ -z "$name" ] || [ -z "$type" ] || [ -z "$content" ]; then
  usage
  exit 1
fi

zone_id=$(cf_api GET "/zones?name=${zone}" | json_field "result[0].id")
if [ -z "$zone_id" ]; then
  echo "cf-dns: zone not found: $zone" >&2
  exit 1
fi

record_json=$(cf_api GET "/zones/${zone_id}/dns_records?type=${type}&name=${name}")
record_id=$(printf '%s' "$record_json" | json_field "result[0].id")

payload=$(printf '{"type":"%s","name":"%s","content":"%s","ttl":%s,"proxied":%s}' \
  "$type" "$name" "$content" "$ttl" "$proxied")

if [ -n "$record_id" ]; then
  cf_api PUT "/zones/${zone_id}/dns_records/${record_id}" "$payload" >/dev/null
  echo "Updated ${name} (${type}) in ${zone}."
else
  cf_api POST "/zones/${zone_id}/dns_records" "$payload" >/dev/null
  echo "Created ${name} (${type}) in ${zone}."
fi
