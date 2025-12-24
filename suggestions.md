# Project Analysis & Suggestions

## Overview
- Static portfolio + status portal served by Nginx with no build pipeline.
- Client behavior lives in `main.js` and `shared.js` with a status-specific `status/status.js`.
- Ops scripts handle deploy, health checks, and metrics collection.

## Strengths
- Solid SEO/metadata coverage in `index.html` and `status/index.html`.
- Good accessibility groundwork (skip link, `aria-*`, focus returns for command palette).
- Status portal has resilient UI formatting and clear service health indicators.
- Prefers-reduced-motion handling is present for animation-heavy sections.
- CI tooling exists for linting, link checks, and Playwright smoke tests.

## Suggestions
1) Consolidate status formatting helpers.
   - `status/status.js` duplicates utilities from `shared.js` via `fallbackUtils` and `window.StatusUtils`.
   - If `shared.js` is guaranteed to load first, remove the duplicate and lean on a single source to reduce drift.
   - Files: `shared.js`, `status/status.js`.

2) Prevent overlapping status fetches and add timeouts.
   - `status/status.js` runs every 10 seconds and also on focus; requests can overlap or hang.
   - Add an in-flight guard and an `AbortController` timeout (e.g., 4-5 seconds) to prevent stale UI updates.
   - File: `status/status.js`.

3) Pause polling when the tab is hidden.
   - The interval continues even when the page is backgrounded; pausing reduces CPU/network usage.
   - Use `visibilitychange` to stop/start the interval or skip `checkStatus` when `document.hidden` is true.
   - File: `status/status.js`.

4) Harden localStorage access for theme persistence.
   - `main.js` writes to `localStorage` without guarding for Safari private mode or quota errors.
   - Wrap `localStorage` access in try/catch with a memory fallback to avoid breaking theme toggles.
   - File: `main.js`.

5) Improve command palette semantics for assistive tech.
   - The list renders as plain divs; add `role="listbox"` on the list and `role="option"` + `aria-selected` on items.
   - Consider managing focus on the selected option when using Arrow keys for clearer screen reader feedback.
   - Files: `index.html`, `status/index.html`, `main.js`.

6) Add a basic CSP and tighten external dependencies.
   - A CSP (via Nginx or `<meta http-equiv="Content-Security-Policy">`) reduces XSS risk.
   - Consider self-hosting Google Fonts to remove third-party dependencies and improve privacy/perf.
   - Files: `index.html`, `status/index.html`, Nginx config if preferred.

7) Expand Playwright coverage for the status portal.
   - Current tests focus on smoke checks; add a test that loads `/status/` and asserts key cards render and the refresh button triggers an update.
   - This is especially useful given the dynamic metrics UI and interval-based updates.
   - Files: `tests/smoke.spec.js`, `playwright.config.js`.

8) Respect pre-existing defaultPrevented in page transitions.
   - `shared.js` intercepts clicks without checking `event.defaultPrevented`, which can break future JS behaviors.
   - Add a guard so custom handlers can opt out of the page transition.
   - File: `shared.js`.
