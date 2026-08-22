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
   │ Hosting     │                    │  WebSocket Server    │
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

**Configuration**:
- Repository → Settings → Pages
- Source: Deploy from branch `main`, folder `/`

**No longer used**: `deploy.sh` script (removed; static files no longer rsync'd to custom server)

### 2. Custom Express.js Server (185.101.158.113) — API & WebSocket

**Purpose**: Provides REST API endpoints and WebSocket real-time communication.

**Current Functionality**:
- Express.js application (`server.js`)
- CORS and rate limiting (`@express-rate-limit`, `cors`)
- Email support (Nodemailer integration)
- WebSocket server (`ws` package)
- Node.js >=24.0.0 required

**Endpoints** (routed via Cloudflare Worker):
- `/api/*` — REST API calls
- `/ws` — WebSocket upgrades

**Deployment**: Manual (via SSH or separate deployment mechanism). This server is NOT automatically deployed by GitHub Actions. Changes to backend code require manual deployment or a separate CI/CD process.

**Network**: Not directly exposed to internet clients. All traffic flows through Cloudflare Worker to maintain security and centralized SSL termination.

### 3. Cloudflare Worker (djjessejay-router) — Routing

**Purpose**: Provides single entry point with intelligent path-based routing.

**Behavior**:
```javascript
if (pathname.startsWith('/api/') || pathname.startsWith('/ws'))
  → Route to custom server (185.101.158.113)
else
  → Route to GitHub Pages (marcelraschke.github.io)
```

**Deployment**: Cloudflare dashboard → Workers & Pages → djjessejay-router

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

```bash
# SSH to server and update code
ssh user@185.101.158.113
cd /path/to/app
git pull origin main
npm install
npm restart             # or systemctl restart your-service
```

(This process is manual and should be documented in server admin notes, not here.)

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
3. Test routing: `curl -I https://djjessejay.ch/` (should be GitHub Pages) and `curl -I https://djjessejay.ch/api/test` (should be custom server)

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
