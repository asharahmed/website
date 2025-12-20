# Ops

Operational assets needed to run the status portal.

## Contents
- `ops/bin/status-metrics.sh`: Generates `/status/metrics.json`.
- `ops/systemd/status-metrics.service`: Systemd service definition.
- `ops/systemd/status-metrics.timer`: 10-second timer for metrics refresh.
- `ops/nginx/default.conf`: Example Nginx site config with `/status/nginx` stub_status.
- `ops/docker/`: Optional hybrid Docker setup.

## Step-by-step install (host)
1) Install files and enable the timer:

```bash
sudo ./ops/install.sh
```

2) Ensure Nginx serves `/var/www/html` and exposes stub_status:

```
location = /status/nginx {
    stub_status;
    access_log off;
}
```

3) Validate Nginx:

```bash
sudo nginx -t
```

4) Confirm the timer:

```bash
systemctl status status-metrics.timer
```

## Step-by-step install (hybrid Docker)
1) Run the host install first:

```bash
sudo ./ops/install.sh
```

2) Start the container:

```bash
make status-up
```

3) Configure Nginx proxy (script):

```bash
sudo ./ops/docker/proxy-install.sh
```

4) Validate Nginx:

```bash
sudo nginx -t
```

## Nginx
If you use a different Nginx config, ensure a stub_status location is present:

```
location = /status/nginx {
    stub_status;
    access_log off;
}
```
