#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Please run as root (sudo)." >&2
  exit 1
fi

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)

install -d /var/www/html
rsync -a --delete "$REPO_DIR/" /var/www/html/ \
  --exclude '.git' \
  --exclude '.github' \
  --exclude 'ops' \
  --exclude 'scripts' \
  --exclude '*.md'

install -d /usr/local/bin
install -m 755 "$SCRIPT_DIR/bin/status-metrics.sh" /usr/local/bin/status-metrics.sh

install -d /etc/systemd/system
install -m 644 "$SCRIPT_DIR/systemd/status-metrics.service" /etc/systemd/system/status-metrics.service
install -m 644 "$SCRIPT_DIR/systemd/status-metrics.timer" /etc/systemd/system/status-metrics.timer

systemctl daemon-reload
systemctl enable --now status-metrics.timer

/usr/local/bin/status-metrics.sh

echo "Installed web root, metrics script, and systemd timer."
