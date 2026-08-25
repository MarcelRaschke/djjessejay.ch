# Deployment Architecture for djjessejay.ch

## Overview

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
   │ Pages       │                    │  185.101.158.113     │
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

### 2. Custom Express.js Server (185.101.158.113) — API & WebSocket

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
- `/api/*` → Routes to custom server (185.101.158.113)
- `/ws` → WebSocket (currently returns 501 Not Implemented)
- `/*` → Routes to GitHub Pages (marcelraschke.github.io)

**Implementation**: See `docs/cloudflare-worker-router.js` for deployable code.

**Deployment Steps**:
1. Cloudflare Dashboard → Workers & Pages → Create Application → Copy Paste
2. Copy code from `docs/cloudflare-worker-router.js`
3. Name the worker: `djjessejay-router`
4. Save and Deploy
5. Go to Routes and bind: `djjessejay.ch/*` → `djjessejay-router` (Cloudflare Worker)

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
Available at 185.101.158.113
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
ssh user@185.101.158.113
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

1. Check custom server is running (`ssh 185.101.158.113` and verify service)
2. Test custom server directly (bypassing Cloudflare): `curl -k --resolve djjessejay.ch:443:185.101.158.113 https://djjessejay.ch/api/test`
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
3. Test locally before deploying to `185.101.158.113`
4. Then Worker routing `/ws` → custom server will function

**Until implemented**: Remove `/ws` from Cloudflare Worker routing or return 501 Not Implemented.

## Rollback Plan

If the hybrid GitHub Pages + Cloudflare Worker deployment fails and you need to restore the prior custom-server-only deployment:

### Rollback Steps

1. **DNS Revert** (Cloudflare Dashboard → DNS → Records)
   - Delete the CNAME record for `djjessejay.ch`
   - Restore the original A record: `djjessejay.ch` → `185.101.158.113` (Proxied)
   - DNS propagation: ~10-30 minutes

2. **Cloudflare Worker Disable**
   - Cloudflare Dashboard → Workers & Pages
   - Delete or disable the `djjessejay-router` Worker
   - Remove route binding: `djjessejay.ch/*`

3. **Custom Server Verification**
   - Ensure application is running on `185.101.158.113` (ports 80/443)
   - Verify SSL certificate is valid
   - Test: `curl -k https://djjessejay.ch/` (should load the static site from custom server)

4. **GitHub Pages Disable** (optional)
   - Repository → Settings → Pages
   - Disable GitHub Pages
   - This prevents confusion if DNS resolves to both sources

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
