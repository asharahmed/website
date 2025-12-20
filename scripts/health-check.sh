#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://127.0.0.1"

require_url() {
  local url="$1"
  curl -fsS "${url}" >/dev/null
}

require_json_key() {
  local url="$1"
  local key="$2"
  local payload
  payload="$(curl -fsS "${url}")"
  python3 - "${key}" <<'PY'
import json
import sys

key = sys.argv[1]
payload = sys.stdin.read()
data = json.loads(payload)
if key not in data:
    raise SystemExit(f"Missing key: {key}")
PY
}

echo "Health check: homepage"
require_url "${BASE_URL}/"

echo "Health check: status page"
require_url "${BASE_URL}/status/"

echo "Health check: metrics payload"
require_json_key "${BASE_URL}/status/metrics.json" "timestamp"

echo "Health check passed."
