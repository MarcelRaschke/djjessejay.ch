# wdjjj — Cloudflare Worker Reverse-Proxy

djjessejay.ch/* → https://marcelraschke.github.io/djjessejay/* (GH Pages Mirror).

## Eigenschaften

- Pfad-Mapping ohne Doppel-Prefix (/foo → /djjessejay/foo)
- Location-Header-Rewriting: Redirects bleiben auf djjessejay.ch
- 8s Upstream-Timeout, Stale-Cache-Fallback, eigene 504-Fehlerseite
- CSP/HSTS-Stripping vom Origin, eigene Security-Header
- Cache-API: GET ohne Query/Range; HTML max-age=60 / s-maxage=600
- www → apex Redirect (301), Health-Endpoint /__wdjjj/health

## Deploy

    cd infra/cloudflare
    wrangler deploy

Voraussetzung: Zone djjessejay.ch auf Cloudflare-DNS (NS-Wechsel von hosttech,
DS-Record vorher beim Registrar löschen). Platzhalter-A-Record 192.0.2.1 proxied;
der Worker-Route greift vor dem DNS-Target.

## Test (nach Deploy)

    curl -s  https://djjessejay.ch/__wdjjj/health
    curl -sI https://djjessejay.ch/
    curl -sI https://djjessejay.ch/djjessejay/        # kein Doppel-Prefix
    curl -sI https://www.djjessejay.ch/               # 301 apex
    curl -X POST https://djjessejay.ch/               # 405

Vollständiger Test-Plan und Rollback: Runbook im docs/-Bereich.
