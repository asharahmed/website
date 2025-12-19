# Website

Local development copy of the static site served from `/var/www/html`.

Deployment happens via GitHub Actions and syncs to `/home/ubuntu/website` before running the deploy script. This note is here to trigger a workflow run.

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
