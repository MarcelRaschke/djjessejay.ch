# OpenPGP Web Key Directory (WKD) — djjessejay.ch

Umsetzung nach `draft-koch-openpgp-webkey-service` (Werner Koch). WKD erlaubt Clients (GnuPG, Thunderbird/Enigmail, Sequoia, Proton), den öffentlichen OpenPGP-Schlüssel zu einer Mail-Adresse über HTTPS zu finden, ohne Keyserver.

## Architektur

Phase 1 (dieser PR): Direct Method, rein statisch, ausgeliefert durch den bestehenden GitHub Pages Deploy (static.yml deployt den Repo-Root; .well-known bleibt von den Bereinigungs-Steps unberührt). Keine DNS-Änderung nötig.

Phase 2 (separat, nach Verifikation von Phase 1): Advanced Method über die Subdomain openpgpkey.djjessejay.ch (DNS-Record in Cloudflare, Subdomain im Pages-Deploy registrieren). Erwarteter Client-Ablauf: Advanced zuerst, Fallback Direct — Direct allein ist voll funktionsfähig.

Der bestehende Worker workers/pgp-directory (ASCII-armored /pgp.txt) bleibt davon unberührt. Sein /.well-known/openpgpkey-Endpoint bleibt 501; die kanonische WKD-Quelle ist das statische Verzeichnis.

## Endpunkte (Direct Method)

    https://djjessejay.ch/.well-known/openpgpkey/djjessejay.ch/hu/<zbase32-hash>?l=<local-part>

## WKD-Hashes (Z-Base-32 über SHA-1 des kleingeschriebenen local-part, RFC 6189 §5.1.6)

| Adresse | Hash-Dateiname |
| --- | --- |
| cy8er@djjessejay.ch | hu/pzh9a9mpqnw3sttagdqw1ie8su598iej |
| info@djjessejay.ch | hu/mg6owx9w8c3ejg3tu31f4tha5n17d4rj |

Die Hash-Ableitung wurde gegen das Beispiel aus dem Draft validiert (Joe.Doe -> iy9q119eutrkn8s1mk4r39qejnbu3n5q).

## Veröffentlichung eines Schlüssels

Vorbedingung: Schlüssel mit passendem User ID im lokalen gpg-Keyring.

    scripts/wkd-publish.sh cy8er          # exportiert hu/pzh9a9mpqnw3sttagdqw1ie8su598iej
    scripts/wkd-publish.sh info           # exportiert hu/mg6owx9w8c3ejg3tu31f4tha5n17d4rj

Das Skript:
- prüft, dass ein User ID <local-part>@djjessejay.ch existiert,
- extrahiert den WKD-Hash via gpg --with-wkd-hash,
- exportiert binär (ohne --armor, spec-konform),
- verweigert implausibel kleine Exporte (< 1 KiB).

Danach: committen, pushen, Pages-Deploy abwarten.

## Verifikation

    scripts/wkd-verify.sh                          # HTTP-Checks gegen Produktion
    gpg --locate-keys cy8er@djjessejay.ch           # echter Client-Test

Erwartung: policy -> 200, jeder hu/<hash> -> 200, Binärformat (nicht ASCII-armored), gpg lädt den Schlüssel und importiert nur den zur Adresse passenden User ID.

## Security-Konformität (Spec, Section 5)

- Kein Directory-Index für WELLKNOWN-Pfade (GitHub Pages liefert kein Listing aus).
- Ausschließlich HTTPS; Clients folgen nur HTTPS-Redirects.
- Keine HTTP-401-Challenges (Public-Daten, kein Auth — schützt vor Passphrase-Phishing).
- Binary statt ASCII-armored, Content-Type application/octet-stream (Pages).
- Nur der User ID zur angefragten Adresse wird exportiert; vor dem Publish sind fremde User IDs aus dem zu exportierenden Schlüssel zu entfernen (gpg --export exportiert den Schlüssel mit allen User IDs — vor der Veröffentlichung prüfen, dass der Schlüssel ausschließlich djjessejay.ch-User IDs trägt).
- SHA-1 dient nur dem Mapping auf einen festen Dateinamen, nicht der Sicherheit.

## Einschränkungen

- Kein Web Key Directory Update Protocol (kein submission-address, keine Confirmation-Mails): statisches Hosting; Veröffentlichung erfolgt ausschließlich über das Repo.
- Advanced Method (openpgpkey-Subdomain) folgt in Phase 2.
