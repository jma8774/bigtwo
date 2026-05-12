# Deployment

## Environments

- **local** — `npm run dev` per workspace. Frontend on 5173 (Vite), backend on 3001.
- **production** — single droplet at `bigtwo.cutecalico.com`. No staging.

Add a staging environment only when there's a concrete need. Until then, keep
the deployment story tiny.

## Topology

```
                   Cloudflare (proxied, WebSockets on)
                                 │
                                 ▼
                            Droplet:443
                          (Nginx + TLS)
                  ┌───────────────────────────┐
                  │  /            → static    │
                  │  /assets/     → static    │
                  │  /socket.io/  → :3002 ws  │
                  │  /healthz     → :3002     │
                  └───────────────────────────┘
                                 │ (proxy)
                                 ▼
                       bigtwo systemd service
                       node backend/dist/index.js
                       (in-memory rooms; no DB)
```

- TLS terminates at Nginx via Let's Encrypt (`certbot --nginx`).
- Cloudflare in front; SSL/TLS mode must be **Full (strict)** or the LE cert
  is bypassed. WebSockets toggle must be on (CF default is on).

## Build process

Three workspaces, one entrypoint:

```bash
npm install         # workspace install at the root
npm run build       # builds shared → backend → frontend (in that order)
```

- `shared/` emits `shared/dist/` (engine `.js` + `.d.ts`). Other workspaces
  import from `@bigtwo/shared`, which resolves to `shared/dist/index.js` at
  runtime via package.json `main`.
- `backend/` emits `backend/dist/`. Run with `node backend/dist/index.js`.
- `frontend/` emits `frontend/dist/`. Static; copied to Nginx's root.

### Dev mode

Frontend (Vite) reads `@bigtwo/shared` via the `source` export condition →
TS source directly, so engine edits hot-reload without rebuilding shared.

Backend dev (`tsx watch`) reads via Node's import resolution → `shared/dist`.
Run `npm -w @bigtwo/shared run build:watch` in parallel, or run
`npm -w @bigtwo/shared run build` once before starting backend dev.

## Filesystem layout (droplet)

```
/var/www/bigtwo-app/             git checkout                bigtwo:bigtwo
  ├── backend/  frontend/  shared/  deploy.sh  deploy/
/var/www/bigtwo-public/          built frontend (Nginx root) www-data:www-data
/var/lib/bigtwo/                 HOME for the bigtwo user    bigtwo:bigtwo
  └── .npm/                      npm cache
/var/log/bigtwo/                 daily log files             bigtwo:bigtwo
/etc/bigtwo.env                  production env (640 root:bigtwo)
/etc/systemd/system/bigtwo.service
/etc/nginx/sites-available/bigtwo
```

## Users

- `root` — SSH access, runs `deploy.sh`, owns `/etc/bigtwo.env`.
- `bigtwo` — system user (no login shell), HOME at `/var/lib/bigtwo`. Runs
  the Node backend, owns the git checkout and log dir.
- `www-data` — Nginx worker user, owns `/var/www/bigtwo-public/`.

## Environment variables

See `deploy/bigtwo.env.example`. Loaded by systemd via `EnvironmentFile=`.

| Variable                  | Purpose                                                    |
|---------------------------|------------------------------------------------------------|
| `PORT`                    | Backend listen port. Default 3001 (dev). Production: 3002. |
| `BIGTWO_LOG_DIR`          | Where the logger writes daily files. `/var/log/bigtwo`.    |
| `BIGTWO_LOG_LEVEL`        | `debug` / `info` / `warn` / `error`. Default `debug`.      |
| `BIGTWO_AUTO_PASS_HUMANS` | **Testing toggle.** Dev default is on. **Prod must = 0.**  |
| `CORS_ORIGIN`             | Socket.IO origin allowlist. Set to the canonical URL.      |
| `NODE_ENV`                | `production` in prod.                                      |

## First-time setup (one-shot)

1. **DNS** — Cloudflare A record `bigtwo → <droplet ip>`, proxied. Confirm
   Network → WebSockets is on. SSL/TLS mode: Full (strict).

2. **System user + directories**:
   ```bash
   sudo adduser --system --group --home /var/lib/bigtwo --shell /usr/sbin/nologin bigtwo
   sudo install -d -o bigtwo -g bigtwo /var/www/bigtwo-app
   sudo install -d -o www-data -g www-data /var/www/bigtwo-public
   sudo install -d -o bigtwo -g bigtwo /var/log/bigtwo
   sudo install -d -o bigtwo -g bigtwo /var/lib/bigtwo/.npm
   ```

3. **Clone repo as the bigtwo user** (avoids the `.git` ownership gotcha):
   ```bash
   sudo -u bigtwo git clone https://github.com/jma8774/bigtwo.git /var/www/bigtwo-app
   ```

4. **Env file**:
   ```bash
   sudo cp /var/www/bigtwo-app/deploy/bigtwo.env.example /etc/bigtwo.env
   sudo chown root:bigtwo /etc/bigtwo.env
   sudo chmod 640 /etc/bigtwo.env
   # Edit to confirm BIGTWO_AUTO_PASS_HUMANS=0.
   ```

5. **Systemd unit**:
   ```bash
   sudo cp /var/www/bigtwo-app/deploy/bigtwo.service /etc/systemd/system/bigtwo.service
   sudo systemctl daemon-reload
   sudo systemctl enable bigtwo
   ```

6. **Nginx**:
   ```bash
   sudo cp /var/www/bigtwo-app/deploy/nginx-bigtwo.conf /etc/nginx/sites-available/bigtwo
   sudo ln -s /etc/nginx/sites-available/bigtwo /etc/nginx/sites-enabled/bigtwo
   sudo nginx -t && sudo systemctl reload nginx
   ```

7. **TLS**:
   ```bash
   sudo certbot --nginx -d bigtwo.cutecalico.com
   ```
   Auto-renew is already wired by certbot's timer (verify with
   `systemctl list-timers certbot`).

8. **First build + start**:
   ```bash
   sudo bash /var/www/bigtwo-app/deploy.sh
   ```

## Day-to-day operations

### Deploy a new version
```bash
sudo bash /var/www/bigtwo-app/deploy.sh
```
Pulls main, installs, rebuilds shared + backend + frontend, swaps the static
bundle, restarts the service, polls `/healthz` until ready.

### Tail logs
```bash
journalctl -u bigtwo -f         # systemd-level
tail -f /var/log/bigtwo/bigtwo-$(date +%F).log   # app-level
tail -f /var/log/nginx/access.log
```

### Bounce the service
```bash
sudo systemctl restart bigtwo
sudo systemctl reload nginx     # after editing Nginx configs
```

### Health check directly (bypass Cloudflare)
```bash
curl -sk --resolve bigtwo.cutecalico.com:443:<droplet ip> \
  https://bigtwo.cutecalico.com/healthz
```

## CI/CD

Not set up yet. When added:
- `npm test` (Vitest in shared) on every PR.
- `npm run build` to catch type errors and missing imports.
- Lint step (ESLint + Vue plugin) optional.

## Rollback process

```bash
sudo -u bigtwo git -C /var/www/bigtwo-app reset --hard <prev-sha>
sudo bash /var/www/bigtwo-app/deploy.sh
```

Restarting the server **ends all in-progress games** (in-memory rooms, no
persistence). Acceptable for MVP — call it out in release notes if a change
touches server code.

## Monitoring

Today: process logs (stdout via journalctl, daily file via the logger),
`/healthz` returns `{ ok: true }`. That's it.

Add a third-party error reporter only with explicit user consent.
