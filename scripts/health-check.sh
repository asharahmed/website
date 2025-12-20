#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://127.0.0.1"

require_url() {
  local url="$1"
  curl -fsSL "${url}" >/dev/null
}

require_json_key() {
  local url="$1"
  local key="$2"
  local payload
  local attempt
  for attempt in {1..10}; do
    payload="$(curl -fsSL --retry 3 --retry-connrefused --retry-delay 1 "${url}")"
    if [[ -n "${payload}" ]]; then
      python3 - "${key}" <<'PY'
import json
import sys

key = sys.argv[1]
payload = sys.stdin.read()
if not payload.strip():
    raise SystemExit("Empty JSON payload")
data = json.loads(payload)
if key not in data:
    raise SystemExit(f"Missing key: {key}")
PY
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
require_json_key "${BASE_URL}/status/metrics.json" "generated_at"

echo "Health check passed."
