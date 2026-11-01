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
- GET/HEAD only; mutating methods return `405`

## Deploy

```bash
cd infra/cloudflare
wrangler deploy
```

Prerequisite: `djjessejay.ch` is delegated to Cloudflare DNS and the Worker route is attached to the zone.

## Workers Builds preview configuration

The Worker source and `wrangler.toml` live in `infra/cloudflare/`, while the connected repository builds from its root. Preview builds therefore use an empty build command and `npx wrangler preview --config infra/cloudflare/wrangler.toml` as the preview command. Wrangler bundles `wdjjj.js` during preview deployment; this Worker has no separate compilation step. The Cloudflare dashboard previously had `Go` as the preview build command, which failed before Wrangler could run. This setting was corrected on 2026-11-01. Rollback is to restore the prior preview build and deploy commands in the Worker Builds settings; it would restore the known failed behavior. The production build configuration is separate and was not changed here.

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
