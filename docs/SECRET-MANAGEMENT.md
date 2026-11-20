# Secret Management und BDSN

## Secret Management

Alle Actions-Secrets dieses Repos stehen in `.github/secrets-inventory.json` (Scope, Pflicht, Format, Rotationsintervall, erlaubte Workflows). Werte stehen nie im Repository.

`.github/workflows/secret-management.yml`:

| Job | Auslöser | Prüft |
|---|---|---|
| static-audit | PR, Push auf main, wöchentlich, manuell | jede `secrets.*`-Referenz ist inventarisiert und nur in erlaubten Workflows, keine Secrets in `if:` oder direkt in `run:`, keine echten `.env`-Dateien |
| remote-audit | wöchentlich, manuell | keine nicht inventarisierten oder verbotenen Secrets, Alter gegen `rotation_days`; Issue mit Label `secrets-audit` |

Leak-Scanning läuft bereits mit gitleaks in `security-gate.yml`.

Lokal: `python3 scripts/secrets-audit.py static`

### Offene Härtungspunkte aus dem Inventar

- `GCP_SA_KEY`: langlebiger Service-Account-Key. Auf Workload Identity Federation umstellen, dann als `forbidden` markieren.
- `CLOUDFLARE_ACCOUNT_ID`, `GCP_cy8er`, `AUDIO_HOST_ROOT_PUB_B64`: nicht geheim, besser als Repository-Variablen.
- `CLOUDFLARE_API_TOKEN` (Workers) und `CF_CACHE_PURGE_TOKEN` (nur Cache Purge) bleiben getrennt.

### Neues Secret aufnehmen

1. Eintrag in `.github/secrets-inventory.json` mit `consumers`.
2. Im Workflow nur über `env:` übergeben, nie `${{ secrets.X }}` in `run:`.
3. Bedingte Steps: `HAS_X: ${{ secrets.X != '' }}` als Job-`env`, dann `if: env.HAS_X == 'true'`.

## Blue Dimension unter /BDSN/

Quelle ist [MarcelRaschke/Blue-Dimension-](https://github.com/MarcelRaschke/Blue-Dimension-), Verzeichnis `public/`.

```
Blue-Dimension-  push main ──► Release BDSN (Link-/Subpfad-Check, Serve-Test)
                                   │ grün
                                   ▼
                              Tag bdsn-live ──► djjessejay.ch bdsn-sync.yml (alle 30 min)
                                                   │ Tag ≠ /BDSN/bdsn-version.txt
                                                   ▼
                                              static.yml: Check, _site/BDSN, Deploy,
                                              Cloudflare-Purge, Live-Verifikation
```

- Kein Cross-Repo-Token. djjessejay.ch liest das öffentliche Repo nur und führt keinen Code daraus aus (`scripts/check-site.py` ist eine eigene Kopie).
- Ohne Tag `bdsn-live` wird `/BDSN/` nicht veröffentlicht, der Rest der Seite deployt normal.
- Sofort übernehmen: `gh workflow run bdsn-sync.yml -R MarcelRaschke/djjessejay.ch`
- Rollback: im Blue-Dimension-Repo den Tag zurücksetzen, dann Sync starten:

```bash
git push -f origin <alter-sha>:refs/tags/bdsn-live
gh workflow run bdsn-sync.yml -R MarcelRaschke/djjessejay.ch
```

### Secrets und Variablen für /BDSN/

```
CF_CACHE_PURGE_TOKEN  Environment github-pages, optional
                      Zone djjessejay.ch: Zone.Cache Purge + Zone.Zone Read
CLOUDFLARE_ZONE_ID    Repository-Variable
```
