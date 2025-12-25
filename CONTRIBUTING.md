# Contributing

Thanks for improving the site. This repo is a static site with lightweight tooling.

## Local Setup
- Install dependencies: `npm ci`
- Install git hooks: `npm run hooks:install`

## Common Commands
- Quick checks: `npm run verify:quick`
- Full checks: `npm run test`
- E2E only: `npm run test:e2e`

## Commit and Push
- Commits must include a `Changelog:` footer with 1-3 bullets.
- Pre-commit runs lint + links. Pre-push runs E2E tests.
- Pre-push auto-skips E2E if Playwright system deps are missing.
- Skip hooks if needed:
  - `SKIP_HOOKS=1 git commit ...`
  - `SKIP_E2E=1 git push ...`

## PRs
- Use the PR template and check the testing boxes.
- Keep changes focused and avoid unrelated refactors.
