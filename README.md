# Website

Static site + status portal.

This repo contains:
- The web root content served by Nginx.
- A `/status` portal with system metrics and service health.
- Ops assets (systemd units, metrics script, Docker option).

## Step-by-step setup (host install)
1) Clone the repo on the server.
2) Run the ops installer:

```bash
sudo ./ops/install.sh
```

3) Ensure Nginx serves `/var/www/html` and has a stub_status endpoint:

```
location = /status/nginx {
    stub_status;
    access_log off;
}
```

4) Validate Nginx:

```bash
sudo nginx -t
```

5) Visit `/status`.

## Step-by-step setup (hybrid Docker)
This runs the static site in a container while metrics stay on the host.

1) Run the host install first (metrics + web root):

```bash
sudo ./ops/install.sh
```

2) Start the container:

```bash
make status-up
```

3) Configure host Nginx to proxy `/` to the container:

```bash
sudo ./ops/docker/proxy-install.sh
```

4) Validate Nginx:

```bash
sudo nginx -t
```

5) Visit `/status`.

## Deploy
Run:

```bash
./scripts/deploy.sh
```

This syncs the repo contents to `/var/www/html`.

## Pipeline
Run CI checks and deploy in one step:

```bash
./scripts/pipeline.sh
```

To bypass git safety checks during deploy:

```bash
./scripts/deploy.sh --force
```

## Branch Protection (Recommended)
Use GitHub branch protection on `main` with required status checks for:
- Lint (HTML/CSS)
- Link check
- Playwright smoke tests

This prevents untested changes from reaching deploy.

## Local Tests
Install dev tooling:

```bash
npm install
```

Run checks:

```bash
npm run lint:html
npm run lint:css
npm run test:links
npm run test:e2e
```

## Operations
- Metrics generator: `/usr/local/bin/status-metrics.sh`
- Timer: `status-metrics.timer` (10-second interval)
- Metrics JSON: `/var/www/html/status/metrics.json`
- Status UI: `/status`
- Nginx stub_status: `/status/nginx`

## Docker (Optional)
Hybrid container setup lives in `ops/docker`. See `ops/docker/README.md`.
