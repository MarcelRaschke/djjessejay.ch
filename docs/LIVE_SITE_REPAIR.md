# Live-site repair runbook

## Root cause addressed

The reverse proxy previously targeted `/djjessejay/`. For this repository, the canonical GitHub Pages project-site path is `/djjessejay.ch/`. The Worker now uses `/djjessejay.ch` as its default and explicitly sets `ORIGIN_PREFIX` in Wrangler configuration.

## Deployment

```bash
cd infra/cloudflare
wrangler deploy
```

## Verification

```bash
curl -fsS https://djjessejay.ch/__wdjjj/health
curl -fsSI https://djjessejay.ch/
curl -fsSI https://www.djjessejay.ch/
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://djjessejay.ch/
```

Expected: health `200`, apex `200`, www `301`, POST `405`.

## Security

The Worker owns the edge CSP, HSTS, frame policy, referrer policy, permissions policy and MIME-sniffing protection. Origin security headers are stripped before the canonical edge policy is applied so the public response has one authoritative policy layer.

## Rollback

If the Pages project path is intentionally different in the Cloudflare account, set `ORIGIN_PREFIX` to the actual deployed project path instead of reverting the Worker architecture.
