# DNS Configuration for djjessejay.ch

This document contains the authoritative DNS zone configuration for the djjessejay.ch domain, configured for **Hybrid deployment: GitHub Pages (static) + Custom Server (API/WebSocket) via Cloudflare Worker routing**.

## Live drift — OPEN (verified 2026-10-16)

The records and routes documented below describe the TARGET state. They are not
what the edge is serving right now. Read this section before trusting anything
further down, and before changing site code to work around a symptom.

### Observed

| Probe | Expected | Observed 2026-10-16 05:31 UTC |
| --- | --- | --- |
| `https://djjessejay.ch/` | 200 from GitHub Pages via Worker | **522**, `cf-ray` present, no `x-proxy` header |
| `https://djjessejay.ch/DJ-Jesse-Jay.jpg` | 200 | **522** |
| `https://djjessejay.ch/__wdjjj/health` | `{"ok":true,"proxy":"wdjjj"}` | unreachable |
| `https://www.djjessejay.ch/` | 301 to apex | 301 to apex (working) |
| `https://marcelraschke.github.io/djjessejay.ch/` | 200 | 200, `server: GitHub.com` |

### Cause 1 — Worker route is not bound

`wdjjj` exists in the account and its code is current (`modified_on`
2026-10-15T21:19:33Z), but it has no route attached. Every `deploy-wdjjj` run
since 2026-10-12 uploads the script and then fails at trigger configuration with
`No access to the specified resource` on `/workers/scripts/wdjjj/routes`, leaving
`No targets deployed for wdjjj`.

The missing credential is a ZONE permission, `Zone > Workers Routes > Edit`,
scoped to the djjessejay.ch zone — not an account permission. See the extended
note in `.github/workflows/deploy-wdjjj.yml`.

Diagnostic shortcut: the Worker stamps every response with `x-proxy: wdjjj`. If a
response from the apex lacks that header, the Worker did not run at all, and the
problem is the route binding rather than the Worker code.

### Cause 2 — Apex record has not been migrated

The apex is documented below as a proxied CNAME to `marcelraschke.github.io`. The
live behaviour contradicts that: GitHub Pages answers normally, so a proxied
record pointing at it could at worst produce a GitHub 404, never a 522. HTTP 522
is a connection timeout between Cloudflare and the origin, so the apex is still
resolving to the unreachable Express host (`ORIGIN_IP`) rather than to GitHub
Pages. A TLS problem would surface as 525/526, not 522, so Full (Strict) is not
the cause.

Confirm in the Cloudflare dashboard under DNS > Records: the apex should be a
single proxied CNAME to `marcelraschke.github.io`, with no A or AAAA record
alongside it.

### Why CI did not catch this

`live-site-smoke.yml` previously skipped all live assertions whenever the health
endpoint was unreachable, so the workflow reported success throughout the outage
(for example the run on 2026-10-16 at 02:15 UTC, with the apex returning 522).
That gate now fails unless an explicit, dated acknowledgement is set; see
`LIVE_EDGE_OUTAGE_ACK_UNTIL` in that workflow.

### Exit criteria

1. `Zone > Workers Routes > Edit` added to `CLOUDFLARE_API_TOKEN`, or the two
   routes bound once by hand in Workers & Pages > wdjjj > Settings >
   Domains & Routes.
2. Apex is a single proxied CNAME to `marcelraschke.github.io`, no A/AAAA.
3. `deploy-wdjjj` green, including its own apex, header and POST assertions.
4. `curl -sI https://djjessejay.ch/` returns 200 and carries `x-proxy: wdjjj`.
5. `LIVE_EDGE_OUTAGE_ACK_UNTIL` removed from the repository variables.
6. This section replaced by a dated note recording the restore.

## Domain Overview

> **ORIGIN_IP**: Platzhalter für die öffentliche IPv4 des Express-Backends. Die Adresse steht bewusst nicht im Repository. Quelle für Betrieb und Rollback: Control Panel des Hosting-Anbieters (Server-Übersicht) oder der Passwort-Manager der Betreiber. Nicht in Issues, PRs oder Logs kopieren.

- **Domain**: djjessejay.ch
- **DNS Provider**: Cloudflare
- **Static Hosting**: GitHub Pages (`marcelraschke.github.io`)
- **API/WebSocket**: Custom Server (IPv4: `ORIGIN_IP`)
- **Routing Layer**: Cloudflare Worker (`djjessejay-router`)
- **CDN/Proxy**: Cloudflare (DDoS protection, caching, SSL termination)
- **Last Updated**: 16.10.2026 (live drift recorded; target state unchanged since 22.08.2026)

## Architecture Overview

```
Visitor Request
     ↓
Cloudflare (djjessejay.ch, proxied)
     ↓
Cloudflare Worker (djjessejay-router)
     ├─ /api/* → Routes to Custom Server (ORIGIN_IP)
     ├─ /ws    → Routes to Custom Server (ORIGIN_IP)
     └─ /*     → Routes to GitHub Pages (marcelraschke.github.io)
```

## Important Notes

1. **GitHub Pages**: Now **enabled** and active for static site deployment. Automatically deployed from `main` branch via `.github/workflows/static.yml`.

2. **Cloudflare Worker**: Acts as intelligent router/reverse proxy:
   - API endpoints (`/api/*`) routed to custom server for Express.js backend
   - WebSocket connections (`/ws`) routed to custom server
   - All other requests routed to GitHub Pages for static assets

3. **Custom Server**: Remains active for API and WebSocket functionality. Not directly exposed to internet; all traffic flows through Cloudflare Worker.

4. **SSL**: Cloudflare Universal SSL for all domains (automatically provisioned).

---

## DNS Zone Records

### SOA Record (Start of Authority)

```
djjessejay.ch. 3600 IN SOA aarav.ns.cloudflare.com. dns.cloudflare.com. 2053592237 10000 2400 604800 3600
```

- **Primary Name Server**: aarav.ns.cloudflare.com.
- **Responsible Email**: dns.cloudflare.com. (admin contact)
- **Serial Number**: 2053592237 (timestamp: 2025-08-08)
- **Refresh**: 10000 seconds (2 hours 46 minutes)
- **Retry**: 2400 seconds (40 minutes)
- **Expire**: 604800 seconds (7 days)
- **Minimum TTL**: 3600 seconds (1 hour)

### NS Records (Name Servers)

```
djjessejay.ch. 86400 IN NS aarav.ns.cloudflare.com.
djjessejay.ch. 86400 IN NS rosalyn.ns.cloudflare.com.
```

Both name servers must be configured in your domain registrar's settings to point to Cloudflare.

### CNAME Record (Apex Domain)

The root domain now points to GitHub Pages:

```
djjessejay.ch. 3600 IN CNAME marcelraschke.github.io.   ; Proxied (orange cloud)
```

**Note**: CNAME replaces the previous A record (ORIGIN_IP). Cloudflare Worker intercepts requests and routes:
- `/api/*` and `/ws` → Custom Server (ORIGIN_IP)
- All other requests → GitHub Pages (marcelraschke.github.io)

This provides a single unified entry point with intelligent routing via Worker.

### CNAME Record (www subdomain) — IMPORTANT: Choose ONE approach

**Option A: Redirect www to apex (recommended)**

Set a permanent redirect in Cloudflare Page Rules:
- **URL**: `www.djjessejay.ch/*`
- **Forward URL**: `https://djjessejay.ch/$1` (with code 301)

This avoids CORS issues and keeps all traffic on `djjessejay.ch`.

**Option B: www as separate CNAME (if needed)**

```
www.djjessejay.ch. 3600 IN CNAME marcelraschke.github.io.   ; Proxied (orange cloud)
```

⚠️ **CORS Warning**: If using Option B, you must update `server.js` allowedOrigins:
```javascript
allowedOrigins: ['https://djjessejay.ch', 'https://www.djjessejay.ch'],
```
Otherwise contact form and API requests from `www.` will fail with CORS errors.

---

## Server Configuration

### Custom Origin Server (API/WebSocket Only)

The origin server at `ORIGIN_IP` now hosts only API endpoints and WebSocket connections. Static files are served by GitHub Pages.

- **Application**: Express.js backend (Node.js >=24)
- **Endpoints**:
  - `/api/*` — REST API endpoints
  - `/ws` — WebSocket server for real-time communication
- **TLS**: A valid certificate for `origin.djjessejay.ch` is required for Cloudflare's **Full (Strict)** SSL mode (otherwise 526). Use Let's Encrypt or equivalent CA.
- **Firewall**: Restrict HTTP/HTTPS inbound to Cloudflare Worker IP ranges (ask Cloudflare for current ranges) plus administrative access. The server should NOT be directly accessible to internet clients — all traffic must flow through Cloudflare Worker.
- **Not Used**: `deploy.sh` has been removed. Static deployment is now handled by GitHub Pages workflow (`.github/workflows/static.yml`).

### GitHub Pages (Static Hosting)

**Critical**: GitHub Pages must be configured with a custom domain, otherwise static requests go to the project-site path (`/djjessejay.ch/`) not the root.

Configuration:
1. Repository → Settings → Pages
2. **Source**: GitHub Actions (set via `.github/workflows/static.yml`)
3. **Custom domain**: Enter `djjessejay.ch`
4. GitHub automatically creates/updates `.github/CNAME` file
5. Check the box: "Enforce HTTPS"
6. Verify: "Your site is live at https://djjessejay.ch"

Once configured:
- Static assets deploy via `.github/workflows/static.yml` on every `main` push
- Cloudflare Worker proxies requests to this origin

### Cloudflare Worker (Routing Layer)

- Worker name: `djjessejay-router`
- Routes `/api/*` and `/ws` to custom server
- Routes all other requests to GitHub Pages
- Deployed in Cloudflare dashboard under Workers & Pages

### Verification Steps (Pre-deployment Checklist)

1. **GitHub Pages Setup** (Repository Settings → Pages)
   - Enable GitHub Pages
   - **Publishing source**: GitHub Actions (NOT "Deploy from branch")
   - **Custom domain**: `djjessejay.ch`
   - Check `.github/CNAME` file exists with `djjessejay.ch`
   - Verify status shows "Your site is live"

2. **DNS Configuration** (Cloudflare Dashboard)
   - Add apex CNAME: `djjessejay.ch` → `marcelraschke.github.io` (Proxied)
   - Remove any existing A/AAAA records at apex
   - Wait for DNS propagation (typically 1–4 hours)
   - Test: `dig djjessejay.ch CNAME +short` → should return `marcelraschke.github.io.`

3. **Cloudflare Worker Deployment**
   - Create Worker `djjessejay-router` with routing logic (see docs/DEPLOYMENT.md)
   - Bind route: `djjessejay.ch/*` → Worker
   - Deploy and test

4. **SSL/TLS Configuration** (Cloudflare Dashboard)
   - Set SSL/TLS mode to **Full (Strict)**
   - Ensure origin cert is valid on custom server

5. **Final Testing**
   - `curl -I https://djjessejay.ch/` → GitHub Pages (200)
   - `curl https://djjessejay.ch/api/health` → Express.js health check
   - Confirm Cloudflare headers in response (`cf-ray`, `server: cloudflare`)

---

## Cloudflare Configuration

### DNS Settings

1. Log in to Cloudflare dashboard
2. Select the `djjessejay.ch` domain
3. Navigate to **DNS → Records**
4. **Remove** any existing A or AAAA records at apex (these conflict with CNAME)
5. Ensure the CNAME record is present and correct:
   - **Name**: `djjessejay.ch` (apex)
   - **Target**: `marcelraschke.github.io`
   - **Proxy**: **Proxied** (orange cloud)
6. ✅ **CNAME only at apex** — do not mix with A/AAAA records

### SSL/TLS Settings

- **SSL/TLS encryption mode**: Full (Strict)
- **Always Use HTTPS**: On
- **HTTP/2**: On
- **HTTP/3 (QUIC)**: On
- **TLS 1.3**: Enabled
- **Minimum TLS Version**: 1.2

### Caching Settings

- **Caching Level**: Standard
- **Browser Cache TTL**: 1 year (recommended for static assets)
- **Always Online**: On (serves cached content if the origin is unreachable)

### Origin Server (for Full Strict SSL)

- Install a valid origin certificate (e.g., Let's Encrypt) covering `origin.djjessejay.ch` (the hostname the Worker requests), plus `djjessejay.ch` and `www.djjessejay.ch` if the origin also serves those; a `*.djjessejay.ch` wildcard does not cover the apex. Full (Strict) returns 526 when the requested hostname is missing from the certificate. Not needed with Cloudflare Tunnel, which terminates TLS at Cloudflare.
- Alternatively, use a Cloudflare Origin CA certificate (valid only for Cloudflare-proxied traffic)

---

## Troubleshooting

### DNS Not Propagating

- Check DNS propagation status using: [https://dnschecker.org/](https://dnschecker.org/)
- Verify all records are correctly entered in Cloudflare
- Ensure name servers at registrar point to Cloudflare

### Site Not Loading Through Cloudflare

1. Verify the CNAME record is **proxied** (orange cloud) in Cloudflare — NOT A records
2. Confirm Cloudflare Worker (`djjessejay-router`) is deployed and routes are bound
3. Test the Worker routing:
   - `curl -I https://djjessejay.ch/` → should route to GitHub Pages (200 with GitHub Pages headers)
   - `curl -I https://djjessejay.ch/api/health` → should route to custom server (200 from Express)
4. Check the custom server is reachable at `ORIGIN_IP` and Cloudflare's IP ranges are whitelisted
5. Confirm the origin TLS certificate is valid (required for Full Strict SSL)
6. Review Cloudflare Worker analytics for routing errors or timeouts

### Mixed Content Warnings

- Ensure all links in your HTML use HTTPS
- Check that no resources are loaded over HTTP
- Use protocol-relative URLs (`//example.com`) or absolute HTTPS URLs

### SSL Certificate Issues

- Cloudflare Universal SSL is provisioned automatically for proxied records
- If the origin certificate is invalid, Cloudflare will return a 525/526 error — renew the origin certificate
- For Full (Strict) SSL, the origin certificate must be issued by a recognized CA or Cloudflare Origin CA

### IPv6 Connectivity Issues

- No direct IPv6 configuration needed — Cloudflare handles IPv6 proxy via their network
- IPv6 visitors access the site through Cloudflare's IPv6-capable anycast
- If issues arise, check that Cloudflare's IPv6 proxying is enabled in SSL/TLS settings

---

## Testing Your Configuration

### Verify DNS Records

```bash
# Check CNAME record (should point to GitHub Pages)
dig djjessejay.ch CNAME +short

# Check NS records
dig djjessejay.ch NS +short
```

### Expected Results

```
# CNAME record should return:
marcelraschke.github.io.

# NS should return:
aarav.ns.cloudflare.com.
rosalyn.ns.cloudflare.com.
```

### Verify Cloudflare Worker Routing

```bash
# Static content (should be served by GitHub Pages)
curl -I https://djjessejay.ch/
# Expected: 200, headers should show GitHub Pages + Cloudflare

# API health endpoint (should route to custom server)
curl https://djjessejay.ch/api/health
# Expected: 200 with JSON response from Express.js (e.g., {"status":"ok"})

# Contact form API (if implemented)
curl -I https://djjessejay.ch/api/contact
# Expected: 405 METHOD NOT ALLOWED (GET not allowed, POST is) if endpoint exists
```

⚠️ **Note**: WebSocket (`/ws`) routing is documented but not yet implemented in `server.js` — if needed, implement the WebSocket server first or remove this route from Worker code.

### Verify Cloudflare Proxying

```bash
# Should return Cloudflare headers (cf-ray, server: cloudflare)
curl -I https://djjessejay.ch/

# Should show Worker is processing requests
# Check Cloudflare dashboard → Workers & Pages → djjessejay-router → Analytics
```

### Verify GitHub Pages Deployment

```bash
# Check that GitHub Pages is serving content
curl -I https://marcelraschke.github.io/

# Confirm via GitHub repository → Settings → Pages
# Status should show "Your site is live at https://marcelraschke.github.io"
```

---

## References

- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)
- [Cloudflare Proxy / Orange Cloud](https://developers.cloudflare.com/fundamentals/get-started/concepts/proxy/)
- [Cloudflare SSL/TLS Modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)
- [Cloudflare IP Ranges](https://www.cloudflare.com/ips/)
- [Let's Encrypt](https://letsencrypt.org/)

---

*This file was generated on 2025-08-08 and should be updated whenever DNS changes are made.*
