#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

required_files=(
  "index.html"
  "styles.css"
  "main.js"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "${ROOT_DIR}/${file}" ]]; then
    echo "Missing required file: ${file}" >&2
    exit 1
  fi
done

if command -v rg >/dev/null 2>&1; then
  if ! rg -q "<title>" "${ROOT_DIR}/index.html"; then
    echo "index.html is missing a <title> tag." >&2
    exit 1
  fi
else
  if ! grep -q "<title>" "${ROOT_DIR}/index.html"; then
    echo "index.html is missing a <title> tag." >&2
    exit 1
  fi
fi

if command -v npm >/dev/null 2>&1 && [[ -f "${ROOT_DIR}/package.json" ]]; then
  if [[ ! -d "${ROOT_DIR}/node_modules" || ! -x "${ROOT_DIR}/node_modules/.bin/htmlhint" ]]; then
    if [[ -f "${ROOT_DIR}/package-lock.json" ]]; then
      (cd "${ROOT_DIR}" && npm ci)
    else
      (cd "${ROOT_DIR}" && npm install)
    fi
  fi
  (cd "${ROOT_DIR}" && npm run lint:html)
  (cd "${ROOT_DIR}" && npm run lint:css)
  (cd "${ROOT_DIR}" && npm run test:links)
fi

echo "CI checks passed."
