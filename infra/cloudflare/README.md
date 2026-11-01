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

The Worker source and `wrangler.toml` live in `infra/cloudflare/`, while the connected repository builds from its root. Preview builds need an empty build command and `npx wrangler preview --config infra/cloudflare/wrangler.toml` as the preview command. Wrangler bundles `wdjjj.js` during preview deployment; this Worker has no separate compilation step. The Cloudflare setting previously contained `Go`, which failed before Wrangler could run. A PATCH to the preview configuration returned success on 2026-11-01, but a subsequent GET returned 404. At that point the account API also listed no `wdjjj` script or Worker route for the domain. The preview change therefore has **not** been verified in a new build. Production build settings were not changed. Do not infer live deployment from the successful PATCH response alone.

## Production restoration on 2026-11-01

With the Worker and routes absent, `wdjjj` was restored from reviewed `main` commit `b3143a5c1b6c76c58f2ed8d9cd609b70c55c8fd2` (Worker source SHA-256 `1ffb7b2dd862572d9c32a3d1fc4adbb79587cfb154fc7a21e8703e0a9054abf8`). The upload used the public variables from `wrangler.toml` and did not set the unavailable `API_ORIGIN_HOST` secret. The active zone has route `djjessejay.ch/*` (`ccebf9faeef743dca9abc455a67ddfe7`) and route `www.djjessejay.ch/*` (`5c556cf7fe2746eb8b50615e4cc6def1`), both pointing to `wdjjj`. No wildcard route was added.

After routing, the health endpoint and homepage returned HTTP 200, the homepage exposed `x-proxy: wdjjj`, CSP, HSTS, `x-content-type-options` and `referrer-policy`, `www` returned 301 to the apex, and POST on `/` returned 405. `/api/health` returned 502 `API origin not configured`; the prior secret must be restored from an authorized source before API routing can pass. The independent [live smoke run 41353945126](https://github.com/MarcelRaschke/djjessejay.ch/actions/runs/41353945126) passed health, apex, www and static-method checks, then failed because it expected 405 for DELETE on `/api/health`. The reviewed Worker checks for the missing API origin before rejecting that method, so the response is 502. The security-header step was skipped by that failure; headers were checked directly. Security impact is limited to restoring the reviewed Worker and two HTTP routes; no repository Worker code was changed. Rollback is to remove only the two route IDs above, leaving the Worker un-routed for diagnosis. Residual risks are the missing API origin secret, the failed API-method smoke check and the unverified Workers Builds preview configuration.

## API origin configuration on 2026-11-01

The intended API hostname `origin.djjessejay.ch` is documented in `ORIGIN-PROTECTION-DEPLOYMENT.md`. The `wdjjj` Worker received `API_ORIGIN_HOST=origin.djjessejay.ch` as a Cloudflare `secret_text` binding, and a follow-up API read confirmed the binding name and type. The value is deliberately absent from `wrangler.toml` so future Wrangler deployments do not replace the remote binding.

This sets the routing target but does not make the API operational. A same-day control-plane check found no `origin.djjessejay.ch` DNS record, active Cloudflare Tunnel, Access app for that hostname, or Access service token. The current reviewed Worker also does not forward Access service-token headers. Do not publish an origin DNS record without the protected Tunnel/Access path and a connected Express backend. The `server.js` backend currently serves static files in addition to `/api`, so its origin-only exposure needs review as well. A sandbox `curl` attempt could not reach the outbound proxy, so the new live `/api/health` response was not verified.

Security impact: the Worker now attempts `/api` subrequests to the configured hostname; the origin hostname has no DNS target yet. Public site routes and Worker source were not changed. Provenance: the hostname comes from the repository deployment contract, while current Cloudflare resource state was read from the account API. Rollback: remove only the `API_ORIGIN_HOST` Worker secret. Residual risk: `/api` remains unavailable until the protected backend path is deployed and verified; the live `/api/health` response remains untested.

An independent [smoke rerun 41353945126](https://github.com/MarcelRaschke/djjessejay.ch/actions/runs/41353945126) then passed health, apex, `www`, static-method rejection, API-method rejection, and security-header checks. The workflow does not request `/api/health`; it does not establish that the backend is available.

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
