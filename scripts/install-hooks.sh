#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
git -C "$repo_root" config core.hooksPath scripts/hooks

chmod +x "$repo_root/scripts/hooks/pre-commit"
chmod +x "$repo_root/scripts/hooks/pre-push"

echo "Git hooks installed (core.hooksPath=scripts/hooks)."
