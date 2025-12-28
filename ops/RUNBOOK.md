# Incident Response Runbook

Quick reference for diagnosing and resolving production issues.

## Quick Diagnostics

```bash
# Check all services at once
systemctl status nginx status-metrics.timer

# View recent metrics generation logs
journalctl -u status-metrics.service -n 20 --no-pager

# Test site availability
curl -sI https://asharahmed.com | head -5
curl -sI https://asharahmed.com/status/ | head -5

# Validate metrics JSON
curl -s https://asharahmed.com/status/metrics.json | jq .timestamp
```

## Common Issues

### 1. Site Not Loading (502/503/504)

**Symptoms:** Browser shows error page, curl returns 5xx status.

**Diagnosis:**
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error log
sudo tail -50 /var/log/nginx/error.log

# Check if Nginx is listening
sudo ss -tlnp | grep :80
sudo ss -tlnp | grep :443
```

**Resolution:**
```bash
# Restart Nginx
sudo systemctl restart nginx

# If config error, validate first
sudo nginx -t

# Check disk space (full disk can prevent Nginx from starting)
df -h
```

### 2. Status Page Shows "Unable to Connect"

**Symptoms:** Status page loads but shows connection error, metrics not updating.

**Diagnosis:**
```bash
# Check if metrics.json exists and is recent
ls -la /var/www/html/status/metrics.json
cat /var/www/html/status/metrics.json | jq .timestamp

# Check timer status
systemctl status status-metrics.timer

# Check service logs
journalctl -u status-metrics.service -n 50 --no-pager
```

**Resolution:**
```bash
# Restart the metrics timer
sudo systemctl restart status-metrics.timer

# If timer not enabled
sudo systemctl enable --now status-metrics.timer

# Run metrics script manually to test
sudo /usr/local/bin/status-metrics.sh
cat /var/www/html/status/metrics.json | jq .
```

### 3. Metrics Showing Stale Data

**Symptoms:** Timestamp in metrics.json is old, status page shows outdated info.

**Diagnosis:**
```bash
# Check timer is active
systemctl is-active status-metrics.timer

# Check when timer last ran
systemctl status status-metrics.timer

# Check for script errors
journalctl -u status-metrics.service --since "10 minutes ago"
```

**Resolution:**
```bash
# Reload systemd and restart timer
sudo systemctl daemon-reload
sudo systemctl restart status-metrics.timer
```

### 4. High CPU/Memory Alerts

**Symptoms:** Status page shows red indicators for CPU or memory.

**Diagnosis:**
```bash
# Find top CPU consumers
top -bn1 | head -15

# Find top memory consumers
ps aux --sort=-%mem | head -10

# Check for runaway processes
ps aux | awk '$3 > 50 {print}'
```

**Resolution:**
```bash
# Identify and restart problematic service
sudo systemctl restart <service-name>

# Clear system cache if memory is full
sudo sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
```

### 5. Disk Space Full

**Symptoms:** Deploy fails, metrics not updating, services failing to start.

**Diagnosis:**
```bash
# Check disk usage
df -h

# Find large files
sudo du -sh /var/log/* | sort -hr | head -10
sudo du -sh /var/www/html/* | sort -hr | head -10
```

**Resolution:**
```bash
# Rotate and compress logs
sudo logrotate -f /etc/logrotate.conf

# Clear old journal logs (keep last 7 days)
sudo journalctl --vacuum-time=7d

# Remove old apt cache
sudo apt-get clean
```

### 6. SSL Certificate Issues

**Symptoms:** Browser shows certificate warning, HTTPS not working.

**Diagnosis:**
```bash
# Check certificate expiry
echo | openssl s_client -servername asharahmed.com -connect asharahmed.com:443 2>/dev/null | openssl x509 -noout -dates

# Check certbot status (if using Let's Encrypt)
sudo certbot certificates
```

**Resolution:**
```bash
# Renew certificate
sudo certbot renew

# If renewal fails, force renewal
sudo certbot renew --force-renewal

# Restart Nginx after renewal
sudo systemctl restart nginx
```

### 7. Deploy Fails

**Symptoms:** GitHub Actions deploy job fails, rsync errors.

**Diagnosis:**
```bash
# Check SSH connectivity (from local)
ssh -v deploy-user@asharahmed.com "echo ok"

# Check disk space on server
df -h /var/www/html

# Check permissions
ls -la /var/www/html
```

**Resolution:**
```bash
# Fix permissions if needed
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Manual deploy (from local with repo cloned)
./scripts/deploy.sh --force
```

## Rollback Procedures

### Quick Rollback (Git)

If a deploy introduced issues:

```bash
# On server, check recent deploys
ls -la /var/www/html

# From local machine with repo
git log --oneline -10

# Revert to previous commit
git revert HEAD
git push origin main

# Or checkout specific commit and force deploy
git checkout <commit-hash>
./scripts/deploy.sh --force
```

### Emergency Static Page

If site is completely broken, serve a minimal status page:

```bash
# Backup current state
sudo mv /var/www/html /var/www/html.broken

# Create minimal placeholder
sudo mkdir -p /var/www/html
echo '<html><body><h1>Maintenance in progress</h1></body></html>' | sudo tee /var/www/html/index.html

# Restore when fixed
sudo rm -rf /var/www/html
sudo mv /var/www/html.broken /var/www/html
```

## Service Commands Reference

| Action | Command |
|--------|---------|
| Check Nginx status | `sudo systemctl status nginx` |
| Restart Nginx | `sudo systemctl restart nginx` |
| Validate Nginx config | `sudo nginx -t` |
| Reload Nginx config | `sudo systemctl reload nginx` |
| Check metrics timer | `systemctl status status-metrics.timer` |
| Restart metrics timer | `sudo systemctl restart status-metrics.timer` |
| View Nginx access log | `sudo tail -f /var/log/nginx/access.log` |
| View Nginx error log | `sudo tail -f /var/log/nginx/error.log` |
| View metrics service log | `journalctl -u status-metrics.service -f` |

## Health Check Endpoints

| Endpoint | Expected Response |
|----------|-------------------|
| `/` | 200 OK, HTML content |
| `/status/` | 200 OK, HTML content |
| `/status/metrics.json` | 200 OK, JSON with recent timestamp |
| `/status/nginx` | 200 OK, stub_status text |

## Monitoring Checklist

Regular checks to prevent incidents:

- [ ] Disk usage below 80%
- [ ] SSL certificate valid for 30+ days
- [ ] Metrics timestamp within last minute
- [ ] All services active (nginx, status-metrics.timer)
- [ ] No errors in recent Nginx logs
- [ ] GitHub Actions workflows passing

## Contact & Escalation

For issues requiring infrastructure access:
1. Check this runbook first
2. Review recent GitHub Actions logs
3. Check server logs via SSH
4. If unresolved, investigate recent commits for regression
