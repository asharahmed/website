#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="/var/www/html"
FORCE=0

for arg in "$@"; do
  case "${arg}" in
    --force)
      FORCE=1
      ;;
    *)
      echo "Unknown option: ${arg}" >&2
      echo "Usage: $0 [--force]" >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "${TARGET_DIR}" ]]; then
  echo "Target directory not found: ${TARGET_DIR}" >&2
  exit 1
fi

if git -C "${SOURCE_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  BRANCH="$(git -C "${SOURCE_DIR}" rev-parse --abbrev-ref HEAD)"
  if [[ "${BRANCH}" != "main" && "${FORCE}" -eq 0 ]]; then
    echo "Refusing to deploy from '${BRANCH}'. Switch to 'main' or pass --force." >&2
    exit 1
  fi

  if [[ -n "$(git -C "${SOURCE_DIR}" status --porcelain)" && "${FORCE}" -eq 0 ]]; then
    echo "Working tree is dirty. Commit or stash changes, or pass --force." >&2
    exit 1
  fi
fi

sudo rsync -a --delete --exclude '.git' --exclude '.github' --exclude 'scripts' --exclude 'status/metrics.json' "${SOURCE_DIR}/" "${TARGET_DIR}/"

echo "Deployed ${SOURCE_DIR} -> ${TARGET_DIR}"
