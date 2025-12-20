#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Please run as root (sudo)." >&2
  exit 1
fi

CONF="/etc/nginx/sites-available/default"
BACKUP="/etc/nginx/sites-available/default.bak.$(date +%Y%m%d%H%M%S)"

if ! [ -f "$CONF" ]; then
  echo "Nginx config not found at $CONF" >&2
  exit 1
fi

if rg -q "proxy_pass http://127.0.0.1:8080" "$CONF"; then
  echo "Proxy block already present. Skipping." >&2
else
  cp "$CONF" "$BACKUP"

  python3 - <<'PY'
from pathlib import Path
path = Path('/etc/nginx/sites-available/default')
text = path.read_text()

if 'proxy_pass http://127.0.0.1:8080' in text:
    raise SystemExit(0)

needle = "    location / {\n        try_files $uri $uri/ =404;\n    }\n"
proxy_block = "    location / {\n        proxy_pass http://127.0.0.1:8080;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n"

if needle not in text:
    raise SystemExit('Expected location / block not found; aborting')

path.write_text(text.replace(needle, proxy_block, 1))
PY

  echo "Updated $CONF (backup: $BACKUP)."
fi

nginx -t
systemctl reload nginx

echo "Host Nginx now proxies / to 127.0.0.1:8080."
