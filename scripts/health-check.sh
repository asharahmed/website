#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://127.0.0.1"
METRICS_PATH="/var/www/html/status/metrics.json"

require_url() {
  local url="$1"
  curl -fsS "${url}" >/dev/null
}

require_json_key_from_file() {
  local file_path="$1"
  local key="$2"
  local payload
  local attempt
  if [[ ! -f "${file_path}" ]]; then
    echo "Missing metrics file at ${file_path}" >&2
    return 1
  fi
  for attempt in {1..10}; do
    payload="$(cat "${file_path}")"
    if [[ -n "${payload}" ]]; then
      python3 -c 'import json,sys; key=sys.argv[1]; payload=sys.stdin.read(); \
if not payload.strip(): raise SystemExit("Empty JSON payload"); \
data=json.loads(payload); \
sys.exit(0) if key in data else (_ for _ in ()).throw(SystemExit(f"Missing key: {key}"))' \
        "${key}" <<<"${payload}"
      return 0
    fi
    sleep 1
  done
  echo "Empty response from ${file_path} after retries" >&2
  return 1
}

require_json_key() {
  local url="$1"
  local key="$2"
  local payload
  local attempt
  for attempt in {1..10}; do
    payload="$(curl -fsS --retry 3 --retry-connrefused --retry-delay 1 "${url}")"
    if [[ -n "${payload}" ]]; then
      python3 -c 'import json,sys; key=sys.argv[1]; payload=sys.stdin.read(); \
if not payload.strip(): raise SystemExit("Empty JSON payload"); \
data=json.loads(payload); \
sys.exit(0) if key in data else (_ for _ in ()).throw(SystemExit(f"Missing key: {key}"))' \
        "${key}" <<<"${payload}"
      return 0
    fi
    sleep 2
  done
  echo "Empty response from ${url} after retries" >&2
  return 1
}

echo "Health check: homepage"
require_url "${BASE_URL}/"

echo "Health check: status page"
require_url "${BASE_URL}/status/"

echo "Health check: metrics payload"
require_json_key_from_file "${METRICS_PATH}" "generated_at"

echo "Health check passed."
