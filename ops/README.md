# Ops

Operational assets needed to run the status portal.

## Contents
- `ops/bin/status-metrics.sh`: Generates `/status/metrics.json`.
- `ops/systemd/status-metrics.service`: Systemd service definition.
- `ops/systemd/status-metrics.timer`: 10-second timer for metrics refresh.
- `ops/nginx/default.conf`: Example Nginx site config with `/status/nginx` stub_status.

## Install
Run as root on the target server:

```bash
sudo ./ops/install.sh
```

This will:
- Sync repo contents to `/var/www/html`.
- Install the metrics script to `/usr/local/bin`.
- Install systemd unit files and enable the timer.
- Run a one-shot metrics update.

## Nginx
If you use a different Nginx config, ensure a stub_status location is present:

```
location = /status/nginx {
    stub_status;
    access_log off;
}
```

Test with:

```bash
sudo nginx -t
```
