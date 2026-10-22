# cy8er Skillgenerator Worker

Isolierter Cloudflare Worker zur Skill-Extraktion und Gap-Analyse.

## Endpunkte

- `OPTIONS *` — CORS-Preflight
- `POST /api/v1/extract-skills` — Extrahiert Hard/Soft Skills und Domain-Keywords aus Text (Resume, Portfolio, Job Description). Nutzt OpenAI `gpt-4o-mini` mit JSON-Response-Format. Fällt auf Mock-Daten zurück, wenn `use_mock: true` gesetzt ist oder kein `OPENAI_API_KEY` konfiguriert ist.
- `POST /api/v1/gap-analysis` — Vergleicht `user_skills` mit `target_role_requirements` und liefert `match_percentage`, `missing_skills` und `gap_metric_delta_s`.

Alle Antworten enthalten Security-Header (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Robots-Tag`) sowie Rate-Limit-Header (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).

## Rate Limiting

- **Limit**: 30 Anfragen pro Minute pro Client-IP (In-Memory, isoliert pro Isolate; für harte Limits Cloudflare WAF/Rate-Limiting-Rules vor den Worker schalten).
- Überschreitung → `429` mit `Retry-After`.

## CORS

`Access-Control-Allow-Origin` ist über die Var `CORS_ALLOW_ORIGIN` konfigurierbar. Default: die Worker-eigene Origin (kein Cross-Origin-Zugriff). Für Frontend-Integration die erlaubte Origin explizit setzen, z. B. in `wrangler.jsonc` → `"vars": { "CORS_ALLOW_ORIGIN": "https://djjessejay.ch" }`.

## Konfiguration

Secret (niemals als Var committen):

```bash
wrangler secret put OPENAI_API_KEY
```

Ohne Key läuft der Worker im Mock-Modus (`use_mock: true` in der Request-Body erzwingt ihn ebenfalls). Weitere Vars:

- `CORS_ALLOW_ORIGIN` — erlaubte Origin für Cross-Origin-Requests.
- `DEPLOYMENT_ENV` — aktuell `preview`.

## Tests

```bash
npm run check   # Syntax-Check
npm test        # node --test
```
