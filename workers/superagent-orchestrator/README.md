# SuperAgent Orchestrator Worker

Cloudflare Worker, der Merge-Jobs von mehreren Agent-Branches orchestriert:
Annahme über `/merge-job` (Queue), Ausführung des Merges auf der VM
(`hermes.cy8er.djjessejay.ch` via Cloudflare Tunnel), Test-Gate und
Pull-Request-Erstellung mit Auto-Merge.

## Endpunkte

- `GET /health` — Liveness-Check.
- `POST /merge-job` — Merge-Job annehmen (Bearer `MERGE_TOKEN` oder `GITHUB_TOKEN`), Antwort `202` mit Enqueue-Bestätigung.

Queue-Konsumer verarbeitet Jobs einzeln (`max_batch_size: 1`), maximal 3 Retries,
danach Dead-Letter-Queue `superagent-merge-jobs-dlq`.

## Merge-Status

- `green` / `no_tests` → PR wird erstellt, Auto-Merge aktiviert.
- `tests_failed`, `merge_failed`, `error` → kein PR, Job schlägt fehl.

## Konfiguration

`wrangler.jsonc` enthält `TUNNEL_MERGE_HOST` als Var. Secrets per
`wrangler secret put` setzen:

- `MERGE_TOKEN` — Bearer-Token für `/merge-job` und die VM.
- `GITHUB_TOKEN` — GitHub-Token für PR-Erstellung.
- `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` — optional, nur wenn der
  Tunnel-Host hinter Cloudflare Access liegt.

Vor dem ersten Deploy beide Queues anlegen:

```bash
npm run queue:create
```

## Entwicklung

```bash
npm install
npm run check    # tsc + wrangler dry-run
npm run deploy   # echter Deploy
```
