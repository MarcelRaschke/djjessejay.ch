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

## Deployment aus Termux (Android)

```bash
pkg update && pkg upgrade
pkg install nodejs-lts git

git clone https://github.com/MarcelRaschke/djjessejay.ch
cd djjessejay.ch/workers/skillgenerator

npm install

# Falls "wrangler: not found": npx nutzen oder global installieren
npm install -g wrangler     # optional; sonst überall npx wrangler verwenden

npx wrangler login          # OAuth-Flow im Browser

# Optional: CORS für das Frontend freigeben
# -> in wrangler.jsonc: "CORS_ALLOW_ORIGIN": "https://djjessejay.ch"

npx wrangler secret put OPENAI_API_KEY   # sonst läuft der Worker im Mock-Modus

npm run deploy               # entspricht: npx wrangler deploy
```

Falls `npm run deploy` mit `sh: wrangler: not found` fehlschlägt, direkt:

```bash
npx wrangler deploy
```

Termux-Hinweis: **Wrangler läuft nicht nativ unter Termux/Android.** `workerd` (Wranglers lokale Test-Engine) und teils `esbuild` publishen keine Android-Binaries — `npm install` schlägt still fehl bzw. `node_modules/.bin/wrangler` bleibt leer, daher `sh: wrangler: not found`. Diagnostic:

```bash
ls node_modules/.bin/ | grep wrangler   # leer = Installation fehlgeschlagen
npm install 2>&1 | grep -iE "error|platform"
```

Funktionierende Wege von Android aus:

**proot-Distribution (empfohlen):**

```bash
pkg install proot-distro
proot-distro install debian
proot-distro login debian
apt update && apt install -y nodejs npm git
git clone https://github.com/MarcelRaschke/djjessejay.ch
cd djjessejay.ch/workers/skillgenerator
npm install
npx wrangler login && npx wrangler deploy
```

**Alternativ ohne Wrangler:** Deploy über die Cloudflare-REST-API — siehe unten.

Hinweise:
- `wrangler login` öffnet die Cloudflare-OAuth-Seite; unter Android wird der Default-Browser genutzt. Scheitert der Callback (`localhost:8976`), `wrangler login --browser=false` nutzen und die URL manuell öffnen.
- Statt `wrangler login` geht auch ein API-Token: `CLOUDFLARE_API_TOKEN` als Umgebungsvariable setzen (Token mit `Workers Scripts:Edit`-Scope).
- `npm install` in Termux kann bei Speicherdruck hängen bleiben; `pkg install python` vorab hilft manchmal bei node-gyp-Builds (für diesen Worker nicht nötig — reines JS, keine nativen Deps außer Wrangler).

## Deployment ohne Wrangler (reine curl-Variante)

Für Termux (wo Wrangler nicht läuft) oder minimale Umgebungen. Voraussetzungen: `bash`, `curl`, `jq` (`pkg install curl jq` in Termux).

1. API-Token erstellen: [Cloudflare-Dashboard → API-Tokens](https://dash.cloudflare.com/profile/api-tokens) → Vorlage „Edit Cloudflare Workers“ oder eigener Token mit **Workers Scripts:Edit**.
2. Account-ID kopieren: Dashboard → **Workers & Pages → Account ID** (rechte Spalte).
3. Dann:

```bash
export CF_API_TOKEN='dein-api-token'
export CF_ACCOUNT_ID='deine-account-id'

# Optional: Secret direkt mitdeployen (sonst läuft der Worker im Mock-Modus)
export CF_OPENAI_API_KEY='sk-…'

# Optional: CORS für das Frontend freigeben
export CORS_ALLOW_ORIGIN='https://djjessejay.ch'

bash scripts/deploy-api.sh
```

Das Script (`scripts/deploy-api.sh`):

- lädt `src/skillgenerator.js` als ES-Modul per `PUT /workers/scripts/<name>` (Multipart) hoch,
- setzt die Bindings aus `wrangler.jsonc` nach (`DEPLOYMENT_ENV`, optional `CORS_ALLOW_ORIGIN`, Observability),
- setzt optional das Secret `OPENAI_API_KEY` per `PUT /workers/scripts/<name>/secrets`,
- gibt am Ende die `workers.dev`-URL plus Smoke-Test-Befehle aus.

Secrets hinterher ändern:

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/workers/scripts/cy8er-skillgenerator/secrets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"name":"OPENAI_API_KEY","text":"sk-…","type":"worker"}'
```

Rollback auf die letzte Version (z. B. bei fehlerhaftem Deploy):

```bash
# verfügbare Deployment-IDs anzeigen
curl -s "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/workers/scripts/cy8er-skillgenerator/deployments" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq '.result.deployments[].id'
```

Hinweis: Token und Key niemals in die Shell-History committen; `export` in der Session reicht, oder `.env`-Datei außerhalb des Repos mit `chmod 600`.

## Tests

```bash
npm run check   # Syntax-Check
npm test        # node --test
```
