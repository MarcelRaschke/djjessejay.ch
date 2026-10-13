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

## Cloudflare Pages Build-Konfiguration (statische Website)

Das Git-verbundene Cloudflare-Pages-Projekt für dieses Repository ist für eine statische Website konfiguriert, nicht für Next.js. Der Build-`npx next build` (Stand 13.10.2026) schlägt zwangsläufig fehl: kein `pages/`- oder `app/`-Verzeichnis, keine next/react-Abhängigkeit.

Korrigierte Werte (idempotent setzt `pages-build-config.sh`):

| Einstellung | Wert |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build:css` |
| Build output directory | `/` (Repo-Root) |
| Production branch | `main` |
| `NODE_VERSION` | `24` (package.json `engines`) |

Ausführen:

```bash
export CF_API_TOKEN="..."   # Custom Token, Account-Berechtigung: Cloudflare Pages Edit
export CF_ACCOUNT_ID="..."
cd infra/cloudflare
./pages-build-config.sh            # Projektname wird automatisch ermittelt
./pages-build-config.sh <name>      # oder explizit
```

Einschränkungen:

- Pages bedient nur statische Assets. `server.js` (Express, `/api/*`, Contact-Form-Backend, AI-Proxy) läuft auf Pages nicht — produktiv bleibt dafür der wdjjj-Worker-Pfad.
- Preview-Builds für Feature-Branches werden weiterhin getriggert; produktiv deployt nur `main`.
- Nach dem Fix gilt weiterhin: Der WKD-Endpunkt (PR #172) wird von dieser Pipeline mit ausgeliefert (`.well-known` liegt im Repo-Root).
