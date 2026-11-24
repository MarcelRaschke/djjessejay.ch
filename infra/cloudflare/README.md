# wdjjj — Cloudflare Worker Reverse-Proxy

djjessejay.ch/* → `https://marcelraschke.github.io/djjessejay.ch/*` (GitHub Pages project site).

## Eigenschaften

- Canonical GitHub Pages project path: `/djjessejay.ch`
- Configurable `ORIGIN_HOST` and `ORIGIN_PREFIX`
- Prefix-safe path mapping without duplicate prefixes
- Location-header rewriting back to `djjessejay.ch`
- 8s upstream timeout with stale-cache fallback
- 503/504 edge fallback pages
- Edge-owned CSP, HSTS and security headers
- Cache API for GET requests without query/range
- HTML cache: `max-age=60`, `s-maxage=600`, `stale-while-revalidate=86400`
- `www` → apex redirect
- `/__wdjjj/health` health endpoint
- GET/HEAD only; mutating methods return `405` (except `/api/*` and `/__wdjjj/collect`)
- Stale fallback from a separate cache entry with 24 h TTL
- Error pages without origin details
- Optional analytics `/__wdjjj/collect` → D1 `event-datamining`, cron `17 3 * * *`

## Analytics (D1 event-datamining)

Schema: `migrations/0002_djjj_analytics.sql`, applied 2026-11-24 via the D1 API.
Destructive cleanup of the legacy template tables: `docs/d1/0003_drop_legacy.sql` (manual, after backup).

Privacy properties:

- No IP address and no user agent are stored. `visitor_hash` = HMAC-SHA256(`HASH_SECRET`, `day|ip|ua`), first 64 bit, rotates daily.
- Referrer is reduced to its host; paths are stored without query string or fragment.
- `DNT: 1` and `Sec-GPC: 1` are honoured; bots and foreign origins are dropped.
- Raw events are deleted after 400 days; `ev_daily` keeps the aggregates.

The collector answers `204` and writes nothing until the secret exists:

```bash
cd infra/cloudflare
openssl rand -hex 32 | npx wrangler secret put HASH_SECRET
```

Before setting it, `datenschutz.html` must describe purpose, pseudonymisation, retention and the absence of third-party sharing. The site does not call the collector yet; a client snippet is:

```js
const sid = (sessionStorage.sid ??= crypto.randomUUID().slice(0, 16));
navigator.sendBeacon('/__wdjjj/collect', JSON.stringify({ type: 'page_view', sid, path: location.pathname, ref: document.referrer || undefined }));
```

## Deploy

```bash
cd infra/cloudflare
wrangler deploy
```

Prerequisite: `djjessejay.ch` is delegated to Cloudflare DNS and the Worker route is attached to the zone.

## Smoke test

```bash
curl -fsS https://djjessejay.ch/__wdjjj/health
curl -fsSI https://djjessejay.ch/
curl -fsSI https://www.djjessejay.ch/
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://djjessejay.ch/
```

Expected:

- health: `200`
- apex: `200` or a documented upstream redirect
- www: `301` to apex
- POST: `405`

The live-site smoke test is intentionally external: CI must verify the deployed edge, not merely the repository contents.
