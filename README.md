# Website

Local development copy of the static site served from `/var/www/html`.

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
