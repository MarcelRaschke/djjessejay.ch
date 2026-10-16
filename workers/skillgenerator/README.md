# cy8er Skillgenerator Worker

Isolierter Cloudflare Worker zur Skill-Extraktion und Gap-Analyse.

## Endpunkte

- `OPTIONS *` — CORS-Preflight
- `POST /api/v1/extract-skills` — Extrahiert Hard/Soft Skills und Domain-Keywords aus Text (Resume, Portfolio, Job Description). Nutzt OpenAI `gpt-4o-mini` mit JSON-Response-Format. Fällt auf Mock-Daten zurück, wenn `use_mock: true` gesetzt ist oder kein `OPENAI_API_KEY` konfiguriert ist.
- `POST /api/v1/gap-analysis` — Vergleicht `user_skills` mit `target_role_requirements` und liefert `match_percentage`, `missing_skills` und `gap_metric_delta_s`.

## Konfiguration

- `OPENAI_API_KEY` — Secret (`wrangler secret put OPENAI_API_KEY`). Ohne Key läuft der Worker im Mock-Modus.
- `DEPLOYMENT_ENV` — aktuell `preview`.

## Hinweise

- Der Worker ist bewusst ohne Auth/Rate-Limit als Preview implementiert. Vor Produktivsetzung müssen Rate-Limiting und Access-Control ergänzt werden (siehe `workers/pgp-directory` als Referenz).
