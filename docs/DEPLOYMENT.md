# Deployment Architecture for djjessejay.ch

## Overview

> **ORIGIN_IP**: Platzhalter für die öffentliche IPv4 des Express-Backends. Die Adresse steht bewusst nicht im Repository. Quelle für Betrieb und Rollback: Control Panel des Hosting-Anbieters (Server-Übersicht) oder der Passwort-Manager der Betreiber. Nicht in Issues, PRs oder Logs kopieren.

djjessejay.ch uses a **hybrid deployment model** combining GitHub Pages for static assets and a custom Express.js server for API/WebSocket functionality. Cloudflare Worker provides intelligent routing between the two.

```
┌─────────────────────────────────────────────────────────┐
│                   Visitor Request                        │
│                  djjessejay.ch/*                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Cloudflare (DDoS/Caching/SSL)              │
│                    djjessejay.ch                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│        Cloudflare Worker (djjessejay-router)            │
│              Intelligent Routing Layer                  │
└─────────────────────────────────────────────────────────┘
         ↓                                        ↓
   ┌─────────────┐                    ┌──────────────────────┐
   │ GitHub      │                    │  Custom Server       │
   │ Pages       │                    │  ORIGIN_IP     │
   │             │                    │                      │
   │ Static Site │                    │  Express.js API      │
   │ Hosting     │                    │  (WebSocket: planned)│
   └─────────────┘                    └──────────────────────┘
        ↑                                      ↑
   marcelraschke.                        /api/*
   github.io                             /ws
        |                                  |
   Auto-deployed from                  Manual deployment
   main branch via                      (separate from static)
   .github/workflows/
   static.yml
```

## Components

### 1. GitHub Pages — Static Hosting

**Purpose**: Serves all static HTML, CSS, JavaScript, images, and assets.

**Deployment**:
- Automatic via `.github/workflows/static.yml` on push to `main`
- Workflow: Checkout → npm ci → npm run build:css → upload-pages-artifact → deploy-pages
- Generated files: Compiled CSS (Tailwind), cleaned-up HTML, asset files
- Domain: `marcelraschke.github.io` (proxied by Cloudflare)

**Configuration** (Repository → Settings → Pages):
- **Source**: GitHub Actions (via `.github/workflows/static.yml`)
- **Custom domain**: `djjessejay.ch` (required; otherwise static serves under `/djjessejay.ch/` path)
- **Enforce HTTPS**: Checked
- **CNAME file**: `.github/CNAME` (auto-managed by Pages)

**No longer used**: `deploy.sh` script (removed; static files no longer rsync'd to custom server)

### 2. Custom Express.js Server (ORIGIN_IP) — API & WebSocket

**Purpose**: Provides REST API endpoints.

**Current Functionality**:
- Express.js application (`server.js`)
- REST API endpoints: `/api/health`, `/api/contact`, etc.
- CORS configuration (must include both `https://djjessejay.ch` and `https://www.djjessejay.ch` if www redirect not used)
- Rate limiting via `@express-rate-limit`
- Email support via Nodemailer
- Node.js >=24.0.0 required

**Endpoints** (routed via Cloudflare Worker):
- `/api/*` — REST API calls (implemented and working)
- `/ws` — WebSocket (⚠️ NOT YET IMPLEMENTED — remove from Worker routing or implement handler first)

**Deployment**: Manual (via SSH or separate deployment mechanism). This server is NOT automatically deployed by GitHub Actions. Changes to backend code require manual deployment or a separate CI/CD process.

**Network**: Not directly exposed to internet clients. All traffic flows through Cloudflare Worker to maintain security and centralized SSL termination.

### 3. Cloudflare Worker (djjessejay-router) — Routing

**Purpose**: Provides single entry point with intelligent path-based routing.

**Behavior**:
- `/api/*` → Routes to custom server (ORIGIN_IP)
- `/ws` → WebSocket (currently returns 501 Not Implemented)
- `/*` → Routes to GitHub Pages (marcelraschke.github.io)

**Implementation**: See `docs/cloudflare-worker-router.js` for deployable code.

> Production runs the Worker **`wdjjj`** from `infra/cloudflare/` (deployed by
> `.github/workflows/deploy-wdjjj.yml`). Its secrets `API_ORIGIN_HOST`,
> `ORIGIN_ACCESS_CLIENT_ID` and `ORIGIN_ACCESS_CLIENT_SECRET` go on `wdjjj`
> (`npx wrangler secret put <NAME> --name wdjjj`, see `ORIGIN-PROTECTION-DEPLOYMENT.md`);
> a deploy fails until all three exist. The `djjessejay-router` steps below are the
> standalone dashboard variant and do not configure `wdjjj`.

**Deployment Steps**:
1. Cloudflare Dashboard → Workers & Pages → Create Application → Copy Paste
2. Copy code from `docs/cloudflare-worker-router.js`
3. Name the worker: `djjessejay-router`
4. Save and Deploy
5. Issue the service token and admit only it on the origin. Requires the
   service-token provisioning from PR #162 (`scripts/cloudflare-tunnel-setup.js`);
   do not run these steps before #162 is merged.
   - Zero Trust → Access → Service credentials → Service Tokens → Create.
     Client ID and Client Secret are shown once; store them in a password manager.
   - Run `scripts/cloudflare-tunnel-setup.js` with `CF_PUBLIC_HOSTNAME=origin.djjessejay.ch`
     and `CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID=<token id>` (the token's ID, not the Client ID).
     It creates the Access app for `origin.djjessejay.ch` with one `non_identity`
     policy that includes only this token. Plan first, then `--apply`.
6. Settings → Variables and Secrets: add the secrets `ORIGIN_ACCESS_CLIENT_ID` and
   `ORIGIN_ACCESS_CLIENT_SECRET` (type Secret, the Client ID and Client Secret from step 5). CLI alternative:
   `npx wrangler secret put ORIGIN_ACCESS_CLIENT_ID --name djjessejay-router` (same for the secret).
7. Verify: `/api/health` on the Worker must not return 502 "API origin credentials not configured"
   and must not return an Access 403 (token not admitted).
8. Only then go to Routes and bind: `djjessejay.ch/*` → `djjessejay-router` (Cloudflare Worker)

**Advantages**:
- Single domain (`djjessejay.ch`) for all functionality
- Unified SSL certificate via Cloudflare Universal SSL
- DDoS protection and caching for static assets
- Easy to redirect or modify routing without DNS changes
- No subdomain splitting needed

## Deployment Workflow

### Static Assets (HTML, CSS, JS, Images)

```
Developer Push to main
            ↓
GitHub Actions: static.yml triggers
            ↓
Checkout repository
            ↓
npm install dependencies
            ↓
npm run build:css (Tailwind compilation)
            ↓
Remove non-deployed files (SQL, videos, legacy files)
            ↓
Upload to GitHub Pages artifact
            ↓
Deploy Pages (GitHub handles deployment to GH infrastructure)
            ↓
Available at marcelraschke.github.io (Cloudflare proxies)
            ↓
User requests / → Cloudflare Worker routes to GitHub Pages
```

### API/WebSocket (Backend Changes)

```
Developer makes backend changes to server.js or API code
            ↓
Manual deployment to custom server
   (via SSH, git pull + npm restart, or other mechanism)
            ↓
Available at ORIGIN_IP
            ↓
User requests /api/* or /ws → Cloudflare Worker routes to custom server
```

**Note**: Backend deployment is **not** automated. It requires manual coordination or a separate CI/CD pipeline (not currently implemented).

## DNS Configuration

See `DNS_CONFIG.md` for full DNS setup. Key points:

- **Primary CNAME**: `djjessejay.ch` → `marcelraschke.github.io` (Proxied via Cloudflare)
- **No A-record for custom server in public DNS** (server access only via Worker routing)
- **Cloudflare Universal SSL**: Automatic for all proxied records

## Build and Deployment Commands

### Building Static Assets Locally

```bash
npm install
npm run build:css      # Tailwind compilation
npm test               # Verify syntax
```

### Testing Static Deployment

```bash
# Verify workflow will work
# Check .github/workflows/static.yml for issues
# Ensure package.json build scripts are correct
```

### Manual Custom Server Deployment

Deploy backend code via SSH (not automated by GitHub Actions):

```bash
# SSH to server
ssh user@ORIGIN_IP
cd /path/to/app

# Update code and dependencies
git pull origin main
npm install

# Restart service via systemd (NOT npm restart)
sudo systemctl restart djjessejay
# or if using PM2:
pm2 restart server.js
```

⚠️ **Critical**: `npm restart` starts `node server.js` in the foreground and will fail if port 3000 is already in use. Always use systemd (`systemctl`) or PM2 for production deployments.

**Setup (one-time)**:
- If using systemd, create `/etc/systemd/system/djjessejay.service`:
  ```ini
  [Unit]
  Description=djjessejay.ch Express Server
  After=network.target

  [Service]
  Type=simple
  User=nodejs
  WorkingDirectory=/path/to/app
  ExecStart=/usr/bin/node server.js
  Restart=on-failure
  # API only by default. Only for the custom-server rollback below:
  # Environment=SERVE_STATIC=1

  [Install]
  WantedBy=multi-user.target
  ```
  Then: `sudo systemctl enable djjessejay && sudo systemctl start djjessejay`

- If using PM2:
  ```bash
  pm2 start server.js --name djjessejay
  pm2 startup
  pm2 save
  ```

## Maintenance and Troubleshooting

### Static Assets Not Updating

1. Check GitHub Actions → static.yml workflow status
2. Verify `npm run build:css` runs without errors
3. Confirm GitHub Pages is enabled in Settings → Pages
4. Wait for Cloudflare cache to expire (or purge cache manually)

### API Endpoints Returning 404 or Timeout

1. Check custom server is running (`ssh ORIGIN_IP` and verify service)
2. Test custom server directly (bypassing Cloudflare): `curl -k --resolve djjessejay.ch:443:ORIGIN_IP https://djjessejay.ch/api/test`
3. Check Cloudflare Worker analytics for routing errors
4. Verify `/api/*` requests are reaching the custom server

### WebSocket Connection Failures

1. Confirm WebSocket server is running on custom server
2. Check Cloudflare Worker routes `/ws` correctly
3. Verify `ws://` → `wss://` upgrade is handled (Cloudflare requires HTTPS)
4. Test WebSocket connection from browser console

### DNS/Routing Issues

1. Verify CNAME record points to `marcelraschke.github.io`: `dig djjessejay.ch CNAME +short`
2. Verify Cloudflare Worker is bound to domain: Cloudflare → Workers & Pages → Routes
3. Test routing: `curl -I https://djjessejay.ch/` (should be GitHub Pages) and `curl -I https://djjessejay.ch/api/health` (should be custom server)

### WebSocket Not Implemented

⚠️ Current limitation: WebSocket support (`/ws`) is documented for future use but not yet implemented in `server.js`.

**If needed**:
1. Add `ws` package import and HTTP upgrade handler to `server.js`
2. Implement WebSocket server logic
3. Test locally before deploying to `ORIGIN_IP`
4. Then Worker routing `/ws` → custom server will function

**Until implemented**: Remove `/ws` from Cloudflare Worker routing or return 501 Not Implemented.

## Rollback Plan

If the hybrid GitHub Pages + Cloudflare Worker deployment fails and you need to restore the prior custom-server-only deployment:

### Rollback Steps

> **Status 2026-11-17: origin not provisioned.** The tunnel `djjessejay-origin` exists with one
> route (`origin.djjessejay.ch`, path `^/api(?:/.*)?$` → `http://127.0.0.1:3000`), but it is
> **inactive with 0 replicas**: no `cloudflared` connector and no Express host are running
> anywhere. `/api/*` on the live site currently ends at the Cloudflare Access 403. Neither the
> A-record rollback nor the tunnel variant below can run until an origin host is provisioned
> (Node on port 3000 plus a `cloudflared` connector). Re-verify the tunnel status in
> Zero Trust → Networks → Tunnels before using this section.

Prepare and verify the origin first. DNS and the Worker change only after the
origin answers correctly, otherwise the site returns 404 during the switch.

1. **Prepare the origin** (static serving is off by default)
   - systemd: uncomment `Environment=SERVE_STATIC=1` in `djjessejay.service`, then
     `sudo systemctl daemon-reload && sudo systemctl restart djjessejay`.
   - PM2: `SERVE_STATIC=1 pm2 restart djjessejay --update-env`.
   - Only the public site allowlist in `server.js` is served, never repository internals.
   - Node itself speaks plain HTTP on `PORT` (default 3000) and never terminates TLS.
     The A record in step 3 sends Cloudflare to `ORIGIN_IP:443`, so this rollback path needs a
     TLS-terminating reverse proxy on the origin host (for example nginx or Caddy) that listens on
     443 and forwards to `http://127.0.0.1:3000`. This repository ships no such proxy config
     (`control-center/foss/Caddyfile` is the local FOSS stack on :8088, not the origin).
     If the origin only has `cloudflared` (tunnel to `http://127.0.0.1:3000`, see
     `ORIGIN-PROTECTION-DEPLOYMENT.md`), nothing listens on 443: set up the proxy first, or
     roll back through the tunnel instead (see the note after step 5).

2. **Verify the origin before switching traffic**
   - The firewall only admits Cloudflare ranges, so run the probes on the origin itself
     (SSH in as the admin user), not from a workstation.
   - Node directly, without TLS:
     `curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/` must print 200,
     `http://127.0.0.1:3000/server.js` and `http://127.0.0.1:3000/.env` must print 404.
   - Through the TLS proxy on 443 (the path Cloudflare will use):
     `curl -k --resolve djjessejay.ch:443:127.0.0.1 https://djjessejay.ch/` must return the site (200),
     `.../server.js` and `.../.env` must return 404. A 200 from Node but a 502 here means the
     proxy does not reach port 3000.
   - Probing from a workstation instead needs a temporary firewall rule for that one source IP;
     remove it right after the check.
   - `-k` above only skips trust so the content check works; it does not prove the certificate.
     Validate TLS separately, without `-k`:
     `curl -sS -o /dev/null -w '%{http_code}\n' --resolve djjessejay.ch:443:127.0.0.1 https://djjessejay.ch/`
     must print 200 with no certificate error. If the origin uses a Cloudflare Origin CA certificate
     (not publicly trusted), add `--cacert /path/to/cloudflare-origin-ca-root.pem`.
   - Check name and expiry:
     `openssl s_client -connect 127.0.0.1:443 -servername djjessejay.ch </dev/null 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName -enddate -checkend 604800`
     must list `djjessejay.ch` in the SAN and report "Certificate will not expire" (valid for at least 7 more days).
     With the SSL mode at Full (strict), a failing check here means a 526 for every visitor after the DNS switch.
   - Do not continue until all checks pass.

3. **DNS Revert** (Cloudflare Dashboard → DNS → Records)
   - Delete the CNAME record for `djjessejay.ch`
   - Restore the A record: `djjessejay.ch` → `ORIGIN_IP` (Proxied)
   - DNS propagation: ~10-30 minutes

4. **Cloudflare Worker Disable**
   - Cloudflare Dashboard → Workers & Pages
   - Delete or disable the `djjessejay-router` Worker
   - Remove route binding: `djjessejay.ch/*`
   - Test: `curl -I https://djjessejay.ch/` (should be served by the custom server)

5. **GitHub Pages Disable** (optional)
   - Repository → Settings → Pages
   - Disable GitHub Pages
   - This prevents confusion if DNS resolves to both sources

`ORIGIN_IP`: see the note at the top of this document.

Tunnel variant: step 3 publishes an A record for `ORIGIN_IP`, which exposes the origin address
(the project otherwise never publishes one, see `CLAUDE.md`). Where `cloudflared` already runs,
the alternative replaces step 3 and the TLS checks in step 2:

1. Delete the existing apex CNAME `djjessejay.ch` → `marcelraschke.github.io`. A tunnel public
   hostname does not replace an existing record: the dashboard rejects it, and
   `scripts/cloudflare-tunnel-setup.js` refuses any conflicting record (`classifyDns`).
2. Add `djjessejay.ch` as a second public hostname on the tunnel `djjessejay-origin`
   (no path, service `http://127.0.0.1:3000`). This creates the proxied CNAME
   `djjessejay.ch` → `<tunnel-id>.cfargotunnel.com`. Confirm in DNS → Records that it is the only
   record for the apex before continuing with step 4.

The window between deleting the old CNAME and the tunnel record appearing is a short outage;
do both in one sitting. No port is opened and no origin certificate is needed; step 2 then
reduces to the plain-HTTP checks against `127.0.0.1:3000`.

### Rollback Timing
- Full rollback should be complete within 30-45 minutes (DNS propagation + verification)
- If encountering timeouts or 502 errors after rollback, clear Cloudflare cache or wait for TTL expiry

## Security Considerations

- **No direct internet access to custom server**: All traffic flows through Cloudflare Worker and is SSL-terminated at Cloudflare.
- **Firewall**: Custom server should restrict inbound to Cloudflare Worker IPs only (check Cloudflare docs for IP ranges).
- **GitHub Pages**: Public by default; ensure sensitive data is not accidentally committed to `main` branch.
- **Secrets**: Store API keys, database credentials, etc., in environment variables on the custom server, not in git.

## References

- `.github/workflows/static.yml` — GitHub Pages deployment workflow
- `DNS_CONFIG.md` — DNS zone configuration
- `CLAUDE.md` — Project architecture and constraints
- `docs/GOVERNANCE.md` — Repository governance model
