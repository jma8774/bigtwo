#!/usr/bin/env bash
#
# Deploy BigTwo on the production droplet.
#
# Run as root. Operates on the layout described in ai/context/deployment.md.
# Pulls main, installs deps, rebuilds shared + backend + frontend, swaps the
# frontend bundle into Nginx's root, bounces the service, and polls /healthz.
#
# Idempotent: safe to re-run. Touches nothing outside the documented paths.

set -euo pipefail

APP_DIR="/var/www/bigtwo-app"
PUBLIC_DIR="/var/www/bigtwo-public"
APP_USER="bigtwo"
SERVICE="bigtwo"
HEALTH_URL="http://127.0.0.1:3002/healthz"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "deploy.sh must be run as root (or via sudo)." >&2
  exit 1
fi

cd "$APP_DIR"

echo "[deploy] git pull"
sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only

echo "[deploy] npm ci"
sudo -u "$APP_USER" -H npm ci

echo "[deploy] build shared + backend + frontend"
sudo -u "$APP_USER" -H npm run build

echo "[deploy] swap frontend bundle into ${PUBLIC_DIR}"
install -d -o www-data -g www-data "$PUBLIC_DIR"
# rsync with --delete so stale assets don't accumulate. Trailing slash on src.
rsync -a --delete "$APP_DIR/frontend/dist/" "$PUBLIC_DIR/"
chown -R www-data:www-data "$PUBLIC_DIR"

echo "[deploy] restart ${SERVICE}"
systemctl restart "$SERVICE"

echo "[deploy] wait for /healthz"
for attempt in $(seq 1 30); do
  if curl -sf -o /dev/null "$HEALTH_URL"; then
    echo "[deploy] healthy after ${attempt}s"
    exit 0
  fi
  sleep 1
done

echo "[deploy] FAILED: ${HEALTH_URL} did not respond within 30s" >&2
journalctl -u "$SERVICE" -n 50 --no-pager >&2 || true
exit 1
