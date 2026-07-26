# cy8er PGP Directory Worker

Isolierter Cloudflare Worker für den öffentlichen PGP-Schlüssel von `cy8er@djjessejay.ch`.

## Endpunkte

- `/health` — Healthcheck ohne Ausgabe des Schlüssels
- `/pgp.txt` — ASCII-armored Public Key
- `/cy8er.djjessejay.ch.asc` — ASCII-armored Public Key
- `/.well-known/openpgpkey/*` — absichtlich deaktiviert, bis WKD-Hashing und binärer Export validiert sind

## Lokal prüfen

```bash
cd workers/pgp-directory
npm install --ignore-scripts
npm run check
npm run deploy:dry-run
```

## Cloudflare Dashboard

1. Worker `cy8er-pgp-directory` anlegen oder den ersten manuellen Workflow-Deploy ausführen.
2. In **Settings → Variables and Secrets** `PUBLIC_PGP_KEY` als verschlüsseltes Secret setzen.
3. Den vollständigen ASCII-armored Public Key einfügen; niemals den Private Key.
4. `DEPLOYMENT_ENV=preview` belassen, bis die workers.dev-Adresse geprüft wurde.
5. Noch keine produktive Custom Domain oder Route setzen.

## GitHub Environment `cloudflare-preview`

Unter **Repository → Settings → Environments → cloudflare-preview** folgende Schutzregeln setzen:

1. **Required reviewers** aktivieren und mindestens einen unabhängigen Reviewer auswählen.
2. **Prevent self-review** aktivieren, sofern ein zweiter berechtigter Account oder ein Team verfügbar ist.
3. **Deployment branches and tags → Selected branches and tags** auswählen.
4. Als einzige Branch-Regel `main` eintragen.
5. Administrator-Bypass nach Möglichkeit deaktivieren.

Folgende Environment-Secrets setzen:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Environment-Secrets sind erst nach erfolgreicher Freigabe durch die Deployment-Schutzregeln für den Job verfügbar.

## Cloudflare API-Token

Einen **Custom API Token** erstellen und auf das konkrete Cloudflare-Konto begrenzen.

Erforderliche Account-Berechtigungen:

- **Workers Scripts: Edit**
- **Account Settings: Read**

Nicht freigeben:

- Workers Routes: Edit
- Workers KV Storage: Edit
- Workers R2 Storage: Edit
- API Tokens: Edit
- zusätzliche Konten oder Zonen

Keinen **Global API Key** und keine Kombination aus `CLOUDFLARE_EMAIL` und `CLOUDFLARE_API_KEY` verwenden. Der Workflow akzeptiert ausschließlich `CLOUDFLARE_API_TOKEN` zusammen mit `CLOUDFLARE_ACCOUNT_ID`.

## Deployment

Der Workflow validiert Pull Requests automatisch. Deployments erfolgen ausschließlich manuell:

1. GitHub Actions öffnen.
2. Workflow **Cloudflare PGP Worker** auswählen.
3. Branch `main` auswählen.
4. **Run workflow** starten.
5. Eingabe `deploy=true` setzen.
6. Required-Reviewer-Freigabe abwarten.
7. Nach dem Deploy `/health` prüfen.
8. Erst anschließend den Public-Key-Endpunkt prüfen.

Der Deploy-Job enthält zusätzlich zur Environment-Branch-Regel einen Code-Guard und läuft nur, wenn:

- das Ereignis `workflow_dispatch` ist,
- `deploy == true` ist,
- `github.ref == refs/heads/main` ist,
- beide Cloudflare-Secrets nicht leer sind.

## Healthcheck

```bash
curl --fail --silent --show-error \
  https://cy8er-pgp-directory.<workers-subdomain>.workers.dev/health | jq
```

Die Antwort muss `status: ok` und `keyConfigured: true` enthalten.

## Rollback

1. Cloudflare Dashboard → Worker → Deployments öffnen.
2. Letzte bekannte stabile Version auswählen.
3. Rollback/erneutes Deployment dieser Version ausführen.
4. `/health` und `/pgp.txt` erneut prüfen.

Keine produktive Route freigeben, bevor Rollback und Schlüsselabruf getestet wurden.
