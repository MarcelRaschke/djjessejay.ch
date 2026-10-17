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

## Tests

```bash
npm run check   # Syntax-Check
node --test test/worker.test.mjs   # package.json hat derzeit kein test-Script
```
