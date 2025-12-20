#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://127.0.0.1"
METRICS_PATH="/var/www/html/status/metrics.json"

require_url() {
  local url="$1"
  curl -fsS "${url}" >/dev/null
}

validate_metrics_file() {
  local file_path="$1"
  local key="$2"
  local attempt

  if [[ ! -f "${file_path}" ]]; then
    echo "Missing metrics file at ${file_path}" >&2
    return 1
  fi

  for attempt in {1..10}; do
    if python3 - "${file_path}" "${key}" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
key = sys.argv[2]

payload = path.read_text(encoding="utf-8")
if not payload.strip():
    raise SystemExit("Empty JSON payload")
data = json.loads(payload)
if key not in data:
    raise SystemExit(f"Missing key: {key}")
PY
    then
      return 0
    fi
    sleep 1
  done

  echo "Empty response from ${file_path} after retries" >&2
  return 1
}

echo "Health check: homepage"
require_url "${BASE_URL}/"

echo "Health check: status page"
require_url "${BASE_URL}/status/"

echo "Health check: metrics payload"
validate_metrics_file "${METRICS_PATH}" "generated_at"

echo "Health check passed."
