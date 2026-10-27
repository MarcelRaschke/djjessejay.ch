# P0 Datenschutz: Historienbereinigung

Stand 2026-10-27. Vorbereitet, nicht ausgeführt. Ausführung nur durch den Repo-Owner, weil Force-Push alle Clones, offenen PRs und Commit-SHAs (auch Attestations) betrifft.

## Befund

| Pfad (nur in der Historie) | Inhalt | Risiko |
| --- | --- | --- |
| `guestbook.sql` | Name, E-Mail, Website, Kommentar; 13 E-Mail-Adressen | Personendaten Dritter, revDSG/DSGVO |
| `biography.sql`, `jessejay.sql`, `news.sql`, `events.sql`, `links.sql`, `imageTable.sql`, `soundTable.sql` | Alt-Inhalte der früheren Seite | keine Zugangsdaten gefunden |
| `biography.xml`, `evenTable.xml` | XML-Exporte derselben Tabellen | keine Zugangsdaten gefunden |
| `.env.example` in Commit `775551e` (2026-07-30) | nicht-Platzhalter-Wert für `RECAPTCHA_SECRET_KEY`, 29 Zeichen | möglicher echter Schlüssel, Format passt nicht zu reCAPTCHA |
| `JesseJayBanner.mov`, `RadioStudio.mov`, `michi.swf` | Altmedien | Grösse, kein Datenschutzrisiko |

Mustersuche über alle 386 Commits auf `main` (AWS, Anthropic, OpenAI, GitHub, Slack, Google, PEM, Cloudflare, generische `*_SECRET`/`*_TOKEN`): ausser dem Eintrag oben nur Platzhalter, Testwerte, npm-Integrity-Hashes und eine öffentliche Sigstore-Attestation.

## 1. Schlüssel rotieren (zuerst, unabhängig von der Bereinigung)

1. Feststellen, zu welchem Dienst der Wert aus `775551e` gehört (lokal: `git show 775551e`).
2. Den Schlüssel im Dienst widerrufen und neu ausstellen.
3. Neuen Wert nur als Secret hinterlegen (Origin-Umgebung bzw. `wrangler secret put`), nie in `.env.example`.

Die Bereinigung der Historie ersetzt die Rotation nicht: Forks, Caches und frühere Clones behalten den alten Wert.

## 2. Historie bereinigen

```bash
# frischer Mirror-Clone, nie im Arbeits-Clone
git clone --mirror https://github.com/MarcelRaschke/djjessejay.ch.git djjj-purge.git
cd djjj-purge.git

# Sicherung ausserhalb von GitHub, verschlüsselt aufbewahren oder nach Prüfung löschen
git bundle create ../djjj-pre-purge.bundle --all

pip install --user git-filter-repo   # oder: nix-shell -p git-filter-repo

git filter-repo --invert-paths \
  --path guestbook.sql --path biography.sql --path jessejay.sql --path news.sql \
  --path events.sql --path links.sql --path imageTable.sql --path soundTable.sql \
  --path biography.xml --path evenTable.xml \
  --path JesseJayBanner.mov --path RadioStudio.mov --path michi.swf

# Wert aus .env.example ersetzen (WERT lokal einsetzen, Datei danach löschen)
printf 'WERT==>REMOVED_SECRET\n' > ../replace.txt
git filter-repo --replace-text ../replace.txt && rm ../replace.txt

git push --force --mirror origin
```

## 3. Nacharbeiten

- GitHub Support um Entfernung gecachter Ansichten und PR-Refs bitten (Sensitive data removal request), da `refs/pull/*` sonst alte Commits behalten.
- Alle lokalen Clones (Termux, Oracle A1, Agent-Workspaces) neu klonen, nicht pullen.
- Offene PRs auf neue Basis rebasen; Attestations ab der Bereinigung neu signieren.
- Kontrolle: `git log --all -- guestbook.sql` liefert nichts; Mustersuche erneut ohne Treffer.

## Test

- `git log --all --format= --name-only | grep -iE '\.(sql|xml)$'` zeigt nur `db/schema.sql` und `control-center/foss/**`.
- `npm run build && npm run check:dist` meldet `OK`.
