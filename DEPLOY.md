# Deploy

This is a static site (plain HTML/CSS/JS) hosted on **Cloudflare Pages**.

- **Live:** https://aahmed.org (and https://www.aahmed.org)
- **Pages project:** `aahmed`
- **Cloudflare account:** the one that owns the `aahmed.org` zone (login: `ashar@aahmed.org`)
- **Project `*.pages.dev`:** https://aahmed-st0.pages.dev

> Note: there is a *separate, unused* `aahmed` Pages project in the `ashar@aahmed.ca`
> account (`aahmed.pages.dev`) left over from an early test. The live site is **not** there.

## Source vs. what gets published

The repo root holds the working files. Only a clean subset is published, assembled
into `dist/` so private/source files (`resume.txt`, `screenshots/`, `uploads/`,
`assets/og-image.svg`, etc.) are never deployed.

Published files:

```
index.html  styles.css  app.js  robots.txt  sitemap.xml
assets/Ashar-Ahmed-CV.pdf  assets/og-image.png
```

## Deploy after edits

From the project root:

```sh
# 1. Make sure you're logged into the aahmed.org Cloudflare account
npx wrangler whoami          # should show: associated with the email ashar@aahmed.org
# if not:  npx wrangler logout && npx wrangler login   (sign into the aahmed.org account)

# 2. Rebuild the clean dist/ bundle (assembles the published files; fails if any are missing)
./build.sh

# 3. Deploy
export CLOUDFLARE_ACCOUNT_ID=efd8c597703d37a1d2a0e3a8e9bfcf6a
npx wrangler pages deploy dist --project-name=aahmed --branch=main --commit-dirty=true
```

`build.sh` is the source of truth for *which* files get published — edit the
`ROOT_FILES` / `ASSET_FILES` arrays in it if you add or remove a public file.

The change is live on https://aahmed.org within seconds (production branch is `main`).

## Regenerating the social card (og:image)

`assets/og-image.png` is rendered from `assets/og-image.svg` (edit the SVG, then):

```sh
rsvg-convert -w 1200 -h 630 assets/og-image.svg -o assets/og-image.png
```

## DNS (already configured — for reference only)

In the `aahmed.org` zone (proxied = orange cloud):

```
CNAME  aahmed.org      -> aahmed-st0.pages.dev   (proxied)
CNAME  www.aahmed.org  -> aahmed-st0.pages.dev   (proxied)
```

Do **not** touch the `MX` / `TXT` records — those run iCloud email for `@aahmed.org`.

## Post-deploy checks

```sh
curl -s -o /dev/null -w "%{http_code}\n" https://aahmed.org/        # expect 200
```

- Submit / re-ping the sitemap in Google Search Console: `https://aahmed.org/sitemap.xml`
- Validate the social preview: https://www.linkedin.com/post-inspector/
