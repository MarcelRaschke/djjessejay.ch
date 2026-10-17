# cy8er Skillgenerator Worker

Isolierter Cloudflare Worker zur Skill-Extraktion und Gap-Analyse.

## Endpunkte

- `OPTIONS *` — CORS-Preflight
- `POST /api/v1/extract-skills` — Extrahiert Hard/Soft Skills und Domain-Keywords aus Text (Resume, Portfolio, Job Description). Nutzt OpenAI `gpt-4o-mini` mit JSON-Response-Format. Fällt auf Mock-Daten zurück, wenn `use_mock: true` gesetzt ist oder kein `OPENAI_API_KEY` konfiguriert ist.
- `POST /api/v1/gap-analysis` — Vergleicht `user_skills` mit `target_role_requirements` und liefert `match_percentage`, `missing_skills` und `gap_metric_delta_s`.

Alle Antworten enthalten Security-Header (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Robots-Tag`). Rate-Limit-Header (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) werden derzeit nur bei `429` gesetzt.

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

## Deployment von Android über einen Linux-Host

Wrangler wird nativ unter Termux/Android nicht unterstützt. Ein Wechsel zu `npx` oder eine globale Installation behebt diese Plattformgrenze nicht. Auch eine proot-Distribution wird hier nicht als verifizierter Deploymentweg beschrieben. Siehe [Wrangler-Systemanforderungen](https://developers.cloudflare.com/workers/wrangler/install-and-update/#supported-operating-systems).

Termux dient als SSH-Client. Installation, Prüfung und Deployment laufen auf einem separaten Linux-Host mit einer von Wrangler unterstützten Distribution (zum Beispiel Ubuntu 24.04), Git und einer aktuell unterstützten Node.js-LTS-Version >=22 samt npm. Der Host muss Zugriff auf GitHub und die Cloudflare-API haben.

### 1. In Termux mit dem Linux-Host verbinden

```bash
pkg install openssh
ssh USER@LINUX_HOST
```

`USER@LINUX_HOST` durch den eigenen SSH-Zugang ersetzen. Alle folgenden Befehle werden in dieser SSH-Sitzung auf dem Linux-Host ausgeführt.

### 2. Repository und lokale Wrangler-Abhängigkeit vorbereiten

```bash
node --version
npm --version
git clone https://github.com/MarcelRaschke/djjessejay.ch.git
cd djjessejay.ch/workers/skillgenerator
npm install
npm run check
node --test test/worker.test.mjs
npm run deploy:dry-run
```

Bei einem vorhandenen Checkout zuerst den vorgesehenen, geprüften Commit auschecken. Die lokale Wrangler-Version wird durch `npm install` bereitgestellt; eine globale Installation ist nicht nötig. Der Dry-Run lädt keinen Worker hoch.

### 3. Cloudflare-Zugang und Deployment

Für eine SSH-Sitzung ohne lokalen OAuth-Browser den Cloudflare-API-Token verdeckt einlesen. Den Token auf den vorgesehenen Account und die erforderlichen Berechtigungen beschränken (Workers Scripts:Edit; für Account-Ermittlung gegebenenfalls Account Settings:Read). Die Account-ID ist im Cloudflare-Dashboard verfügbar.

```bash
read -r -s -p 'Cloudflare API token: ' CLOUDFLARE_API_TOKEN
printf '\n'
export CLOUDFLARE_API_TOKEN
read -r -p 'Cloudflare account ID: ' CLOUDFLARE_ACCOUNT_ID
export CLOUDFLARE_ACCOUNT_ID
npx wrangler whoami
```

Vor dem Upload `wrangler.jsonc` prüfen: Ziel ist `cy8er-skillgenerator`, mit `DEPLOYMENT_ENV=preview` und `workers_dev=true`. Dies ist ein eigenständiger Worker; das Deployment betrifft weder `wdjjj` noch das Pages-Projekt. Bei Bedarf `CORS_ALLOW_ORIGIN` als Var für die konkrete Frontend-Origin ergänzen.

```bash
npm run deploy

# Optional: interaktiv eingeben, damit der Schlüssel nicht in der Shell-History steht.
npx wrangler secret put OPENAI_API_KEY

unset CLOUDFLARE_API_TOKEN
unset CLOUDFLARE_ACCOUNT_ID
```

Deployment und Secret-Änderung verändern den Cloudflare-Account. Ohne konfigurierten `OPENAI_API_KEY` liefert die Extraktion Mock-Daten; ein erfolgreicher Upload belegt daher noch keine funktionierende OpenAI-Extraktion. Die von Wrangler ausgegebene Worker-URL anschließend mit einem CORS-Preflight und einer Gap-Analyse prüfen. Niemals Token oder Schlüssel als Klartextbefehle eingeben oder ins Repository schreiben.

> **Entwurf: REST-Deployment nicht verwenden.** Der folgende aus PR #182 ausgelagerte Pfad enthält bekannte offene Fehler und ist noch nicht freigegeben. MIME-Typ, Secret-Typ, Credentials-Transport, workers.dev-Aktivierung und tatsächlicher Rollback müssen vor Nutzung korrigiert und geprüft werden.

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
node --test test/worker.test.mjs   # package.json hat derzeit kein test-Script
```
