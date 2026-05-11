# Deployment

## Environments

- **local** — `npm run dev` for the SPA; later, a separate Node process for the Socket.IO server.
- **production** — single environment for MVP. No staging until pressure exists for one.

Add a staging environment only when there's a concrete need (e.g., before exposing the multiplayer server publicly). Until then, keep the deployment story tiny.

## Build process

P1:
- `npm run build` → Vite produces a static bundle in `dist/`.
- No code splitting heroics; one bundle is fine for MVP.

P2 (planned):
- Same SPA build.
- Server transpiled with `tsc` or `tsup` → single Node entry in `server/dist/`.

## Release process

P1: push the `dist/` output to a static host (Netlify, Vercel, Cloudflare Pages, or S3+CloudFront). Any of those work; pick one and document the choice in an ADR if it's load-bearing.

P2: bundle the static SPA into the deploy alongside the server, or serve both from the same host. Single-instance Node is fine for MVP since the room store is in-memory.

## CI/CD

Not set up yet. When added:
- Run `npm test` (Vitest) on every PR.
- Run `npm run build` to catch type errors.
- Optionally run a lint step (ESLint + Vue plugin).

## Rollback process

Static SPA: redeploy the previous build.

P2 server: restart the previous binary. Note that restarting the server **ends all in-progress games** (no persistence). This is acceptable for MVP but should be called out in any release that touches server code.

## Environment variables

See `ai/context/integrations.md`. None required for P1.

## Monitoring

Not in scope for MVP.

When the multiplayer server is live, the bare minimum is:
- Process logs (stdout) captured by the host.
- A heartbeat / `/healthz` endpoint.
- Don't add a third-party error reporter without explicit user consent.
