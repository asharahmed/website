# AGENTS.md

Detailed guidance for working in this environment.

## Overview
- This is a static website served by Nginx from `/var/www/html`.
- There is no build pipeline, bundler, or package manager in use.
- Updates are done by editing files directly on disk.
- A status portal lives at `/status` and pulls host metrics.
- Deployments run on `main` and `beta` pushes.
- `beta` pushes deploy only to the beta environment.
- `main` pushes deploy to production first, then to beta only if `main` cleanly merges into `beta`.
- Beta environment: `beta.aahmed.ca`. Production environment: `asharahmed.com`.

## Repository Layout
- Root HTML: `/home/ubuntu/website/index.html`
- Shared styles and scripts: `/home/ubuntu/website/shared.css`, `/home/ubuntu/website/shared.js`
- Home page styles and scripts: `/home/ubuntu/website/styles.css`, `/home/ubuntu/website/main.js`
- Status page:
  - `/home/ubuntu/website/status/index.html`
  - `/home/ubuntu/website/status/status.css`
  - `/home/ubuntu/website/status/status.js`
- Ops tooling and service setup:
  - `/home/ubuntu/website/ops/install.sh`
  - `/home/ubuntu/website/ops/systemd/status-metrics.timer`
  - `/home/ubuntu/website/ops/systemd/status-metrics.service`
  - `/home/ubuntu/website/ops/nginx/default.conf`
- CI/CD definitions: `/home/ubuntu/website/.github/workflows/`

## Key Paths
- Document root: `/var/www/html`
- Primary pages:
  - `/var/www/html/index.html`
  - `/var/www/html/status/index.html`
- Primary assets:
  - `/var/www/html/styles.css`
  - `/var/www/html/main.js`
  - `/var/www/html/status/status.css`
  - `/var/www/html/status/status.js`
  - `/var/www/html/assets/`
- Supporting files:
  - `/var/www/html/index.nginx-debian.html` (default Nginx page)
  - `/var/www/html/AGENTS.md` (this file)

## Site Structure
- Single-page portfolio layout in `index.html` with sections linked by anchor IDs.
- Client-side behavior in `main.js` for:
  - Theme toggle
  - Scroll progress and back-to-top
  - Command palette navigation
  - Mobile menu
  - Particle background
  - Typing animation
  - IntersectionObserver-based animations
- Status portal under `/status` with system and service health metrics.
- `shared.js` applies global behaviors:
  - Page transitions
  - Prefetch on hover
  - Adds `is-prod` class based on hostname for prod-only styling

## Status Portal
- UI endpoint: `/status`
- Metrics JSON: `/status/metrics.json`
- Nginx stub_status: `/status/nginx`
- Metrics generator: `/usr/local/bin/status-metrics.sh`
- Systemd units:
  - `/etc/systemd/system/status-metrics.service`
  - `/etc/systemd/system/status-metrics.timer` (10-second interval)
- Service health tracked in the UI: nginx, ssh, docker, status-metrics timer.
- Disk usage uses a ring gauge; disk I/O uses a sparkline.
- Metrics flow:
  - `/usr/local/bin/status-metrics.sh` writes `/var/www/html/status/metrics.json`.
  - `/status/status.js` polls and renders data.
  - `scripts/health-check.sh` validates JSON payload and key presence.

## Agent Setup Checklist
Use this to configure a new server from the repo:
1) Sync repo contents to `/var/www/html`:
   - `sudo ./ops/install.sh`
2) Ensure Nginx serves `/var/www/html` and exposes stub_status:

```
location = /status/nginx {
    stub_status;
    access_log off;
}
```

3) Validate Nginx:
   - `sudo nginx -t`
4) Confirm metrics timer:
   - `systemctl status status-metrics.timer`
5) Open `/status` and confirm metrics + service pills update every 10 seconds.

## Branching and Deployments
- `main` is the primary development branch and deploy target for production.
- `beta` is the staging branch and deploy target for beta.
- Deployment workflow: `.github/workflows/deploy.yml` (prod + conditional beta).

## CI/CD Workflow Summary
- Lint jobs: HTML (`htmlhint`), CSS (`stylelint`), and vibe (`vibechck`).
- Tests: Playwright E2E plus link checks.
- Cache: npm + Playwright browsers for faster runs.
- Deploy flow (prod):
  - Sync repo to `/home/ubuntu/website` on the prod host.
  - Rsync to `/var/www/html` (excludes `.github`, `tests`, `node_modules`, `ops`).
  - Post-deploy uptime and health checks.
- Deploy flow (beta):
  - Sync repo to `/home/ubuntu/website` on the beta host.
  - Rsync to `/var/www/html` (excludes `.github`, `tests`, `node_modules`, `ops`).
  - Post-deploy uptime and health checks.
- CI requires `contents: write` permissions to merge `main` into `beta`.
- PRs run a dry-run rsync to validate deploy diff.

### Hybrid Docker Option
If running the static site in a container:
1) Run the host install first:
   - `sudo ./ops/install.sh`
2) Start the container:
   - `make status-up`
3) Proxy host Nginx to the container:
   - `sudo ./ops/docker/proxy-install.sh`
4) Validate Nginx:
   - `sudo nginx -t`

## Editing Rules
- Use ASCII by default. Only introduce Unicode when necessary and already present.
- Keep changes minimal and focused; do not alter unrelated content.
- Preserve existing formatting and indentation style.
- Prefer surgical edits; avoid rewriting large blocks unless required.
- Commit messages must include a `Changelog:` footer in the description body with 1-3 short bullets.
- Avoid adding new dependencies unless explicitly requested.
- If editing CSS for navigation or banners, verify both light and dark themes.
- Install local git hooks with `npm run hooks:install` to enforce linting and tests before commits/pushes.

## Permissions
- Files under `/var/www/html` are owned by root and require `sudo` to modify.
- Read access is available without escalation; writes typically require `sudo`.
- Prefer syncing from the repo to `/var/www/html` with `sudo rsync -a`.
- On servers, `ubuntu` may have limited sudo; validate before running system commands.

## Validation
- Manual browser verification is the primary check.
- Suggested quick checks:
  - Page loads correctly (desktop + mobile).
  - Theme toggle works and persists.
  - Mobile menu opens/closes and focus remains usable.
  - Command palette opens with Cmd/Ctrl+K and closes with Escape.
  - Scroll progress and back-to-top behave as expected.
  - Status portal updates metrics and service pills every 10 seconds.
- If Nginx configuration is edited, run:
  - `sudo nginx -t`
- If status metrics fail:
  - Confirm `/var/www/html/status/metrics.json` exists and is non-empty.
  - Check the systemd timer and service logs.

## Nginx Context
- Default config path: `/etc/nginx/sites-available/default`.
- Enabled site symlink: `/etc/nginx/sites-enabled/default`.
- Current server is set to serve from `/var/www/html` over HTTPS.
- Status stub endpoint should be defined at `/status/nginx`.

## Security / Hardening (Code-Level)
- External links should include `rel="noopener noreferrer"` when `target="_blank"` is used.
- For JS `window.open`, include `noopener` and set `win.opener = null`.
- Favor strict referrer policy in HTML head:
  - `<meta name="referrer" content="strict-origin-when-cross-origin">`
- Avoid inline scripts; use existing JS files instead.

## Accessibility Guidelines
- Ensure all interactive elements have appropriate `aria-*` attributes.
- Command palette:
  - Keep `aria-expanded` in sync on the trigger.
  - Focus should return to the trigger on close.
  - Escape should close the modal.
- Mobile menu:
  - Update `aria-expanded` and `aria-hidden` when toggled.
- Maintain `:focus-visible` styles for keyboard users.

## Performance Notes
- Avoid heavy JS changes; animations should respect `prefers-reduced-motion`.
- Use lazy loading for non-critical images where possible.
- Keep assets reasonably compressed; large images should be optimized.
- Prefer CSS-only tweaks before adding JS for layout fixes.

## Content Conventions
- Dates are in short format (e.g., "Jan 2023 - Present").
- Credentials and titles are written in Title Case.
- Use consistent punctuation in bullet lists (no trailing periods unless needed).

## Do/Do Not List
- Do: keep HTML semantics intact and ensure new sections have IDs if linked.
- Do: update Open Graph/Twitter meta if main branding changes.
- Do not: add new dependencies or frameworks without explicit request.
- Do not: remove the default Nginx file unless asked.
- Do not: change deploy hosts or secrets without explicit request.

## Useful Commands
- List site files:
  - `ls -la /var/www/html`
- View current Nginx site config:
  - `sudo sed -n '1,200p' /etc/nginx/sites-available/default`
- Test Nginx config:
  - `sudo nginx -t`
- Check status metrics timer:
  - `systemctl status status-metrics.timer`
- Generate a metrics snapshot manually:
  - `sudo /usr/local/bin/status-metrics.sh`
- Run the repo health check locally on a server:
  - `./scripts/health-check.sh`
- Install local dev hooks:
  - `npm run hooks:install`
- Skip hooks temporarily:
  - `SKIP_HOOKS=1 git commit ...`
  - `SKIP_E2E=1 git push ...`
