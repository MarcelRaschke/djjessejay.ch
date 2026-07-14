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

## GitHub Environment

Environment `cloudflare-preview` anlegen und folgende Repository- oder Environment-Secrets setzen:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Das API-Token erhält nur die minimal erforderlichen Worker-Script-Rechte für das Zielkonto.

## Deployment

Der Workflow validiert Pull Requests automatisch. Deployments erfolgen ausschließlich manuell:

1. GitHub Actions öffnen.
2. Workflow **Cloudflare PGP Worker** auswählen.
3. **Run workflow** starten.
4. Eingabe `deploy=true` setzen.
5. Nach dem Deploy `/health` prüfen.
6. Erst anschließend den Public-Key-Endpunkt prüfen.

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
