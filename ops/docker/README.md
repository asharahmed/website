# Docker (Hybrid)

This setup runs the static site inside an Nginx container while keeping the metrics generator on the host.
The host Nginx should continue to provide `/status/nginx` and can reverse proxy to the container.

## Start
From the repo root:

```bash
cd ops/docker
sudo docker compose up -d
```

The container listens on `127.0.0.1:8080` and serves `/var/www/html`.

## Host Nginx Proxy (example)
Add a proxy location to your host Nginx site:

```
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /status/nginx {
    stub_status;
    access_log off;
}
```

Validate with:

```bash
sudo nginx -t
```
