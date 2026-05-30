#!/usr/bin/env bash
# build.sh — assemble the clean dist/ bundle that gets published to Cloudflare Pages.
# Only the files listed here are deployed; everything else in the repo stays private.
#
# It also stamps a content hash onto the styles.css / app.js URLs in the deployed
# index.html (e.g. styles.css?v=1a2b3c4d). The HTML is always revalidated by the
# browser, so when a file's contents change its URL changes and the browser fetches
# the new version right away — no stale CSS/JS after a deploy, no hard-refresh needed.
set -euo pipefail
cd "$(dirname "$0")"

ROOT_FILES=(index.html styles.css app.js robots.txt sitemap.xml)
ASSET_FILES=(assets/Ashar-Ahmed-CV.pdf assets/og-image.png)

# Fail early if anything is missing, rather than shipping an incomplete site.
for f in "${ROOT_FILES[@]}" "${ASSET_FILES[@]}"; do
  [ -f "$f" ] || { echo "✗ missing required file: $f" >&2; exit 1; }
done

rm -rf dist
mkdir -p dist/assets
cp "${ROOT_FILES[@]}" dist/
cp "${ASSET_FILES[@]}" dist/assets/

# Content hashes (first 8 hex chars of the sha-256).
css_v=$(shasum -a 256 dist/styles.css | cut -c1-8)
js_v=$(shasum -a 256 dist/app.js | cut -c1-8)
sed -i '' \
  -e "s|href=\"styles.css\"|href=\"styles.css?v=${css_v}\"|" \
  -e "s|src=\"app.js\"|src=\"app.js?v=${js_v}\"|" \
  dist/index.html

echo "✓ built dist/ ($(find dist -type f | wc -l | tr -d ' ') files, $(du -sh dist | cut -f1))"
echo "  styles.css?v=${css_v}  ·  app.js?v=${js_v}"
find dist -type f | sort | sed 's/^/  /'
