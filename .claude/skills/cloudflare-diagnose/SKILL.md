---
name: cloudflare-diagnose
description: 'Diagnose der Cloudflare-Edge für djjessejay.ch — Site nicht erreichbar, 5xx-Fehler, 526/521/522, Worker liefert falschen Inhalt, Pages-Build schlägt fehl, DNS-/TLS-Prüfung. Trennt Edge, Worker, Origin und DNS voneinander, statt zu raten. Trigger: "Cloudflare", "Site down", "Seite nicht erreichbar", "526", "521", "522", "1101", "Worker kaputt", "Pages build failed", "Live edge smoke test rot", "apex antwortet nicht", "falscher Inhalt ausgeliefert".'
argument-hint: [hostname | fehlercode | "worker" | "pages"]
allowed-tools: Read, Grep, Bash(curl *), Bash(getent *), Bash(dig *), Bash(git show *), Bash(node --check *), Bash(wc *), Bash(head *)
effort: high
---

# Cloudflare-Diagnose: djjessejay.ch

Grenzt ein, **welche Schicht** defekt ist: DNS → Edge-TLS → Worker → Origin. Jede Schicht wird einzeln geprüft, damit man nicht an der falschen Stelle sucht.

## Architektur (aus CLAUDE.md)

- DNS: ein CNAME `djjessejay.ch` → `marcelraschke.github.io`, **proxied** über Cloudflare
- Worker `wdjjj` routet `/api/*` und `/ws` an den eigenen Origin, alles andere an GitHub Pages
- Statisches Deployment: GitHub Pages aus `main`
- Router-Quellcode im Repo: `infra/cloudflare/wdjjj.js`

## Regel 0 — Statuscode allein beweist nichts

**Das ist der wichtigste Schritt.** Ein `HTTP 200` bedeutet nicht, dass die Site funktioniert. Ein überschriebener Worker, eine Fehlerseite oder ein Platzhalter antworten ebenfalls mit 200.

Diese Lektion ist teuer bezahlt: eine tagelange Störung galt als „apex down, www läuft", weil `www` 200 zurückgab. Tatsächlich lieferte `www` nur `Hello from djjessejay!` als `text/plain` — ein Hello-World-Stub. Es gab auf der ganzen Domain kein HTML mehr.

**Immer Statuscode + Content-Type + Body-Anfang zusammen prüfen:**

```bash
for u in "https://djjessejay.ch/" "https://djjessejay.ch/__wdjjj/health" \
         "https://www.djjessejay.ch/" "https://example.com"; do
  code=$(curl -sS -m 12 -o /tmp/b.txt -w '%{http_code}' "$u" 2>/dev/null)
  ct=$(curl -sS -m 12 -o /dev/null -D - "$u" 2>/dev/null | grep -i '^content-type' | head -1 | cut -d' ' -f2 | tr -d '\r')
  body=$(head -c 60 /tmp/b.txt 2>/dev/null | tr '\n' ' ')
  printf "  %-46s %-4s %-26s %s\n" "$u" "$code" "${ct:--}" "${body:--}"
done
```

Bewertung:

| Beobachtung | Bedeutung |
|---|---|
| `text/html` + `<!doctype html>` | echte Seite |
| `text/plain` + kurzer Text | **Worker-Stub oder Platzhalter — Site ist down** |
| `200` ohne HTML | Fehlalarm, nicht als „läuft" melden |
| `000` | Timeout, keine Antwort |

`https://example.com` ist die Kontrolle: antwortet sie nicht, liegt es an der eigenen Egress-Strecke und **nicht** an der Site.

## 1. DNS — zeigt die Domain überhaupt auf Cloudflare?

```bash
for h in djjessejay.ch www.djjessejay.ch; do
  printf "  %-24s " "$h"; getent ahosts "$h" | awk '{print $1}' | sort -u | tr '\n' ' '; echo
done
```

Cloudflare-Bereiche: `104.16–104.31`, `172.64–172.71`, `162.159`, `188.114`, `198.41`.

- Keine Cloudflare-IP → DNS-Problem oder Proxy ausgeschaltet (graue Wolke). Dann ist der Worker nie beteiligt.
- Apex und `www` auf **identischen** IPs, aber unterschiedliches Verhalten → kein DNS-Problem, sondern hostname-spezifische Konfiguration (Worker-Route, Page Rule, Custom Hostname).

## 2. Edge-TLS — kommt die Verbindung bis Cloudflare?

```bash
curl -sS -m 15 -v https://djjessejay.ch/ 2>&1 | grep -E 'Connected to|TLS handshake|subject:|issuer:|HTTP/' | head -12
```

Erfolgreicher Handshake mit `subject: CN=djjessejay.ch` → Edge und Zertifikat sind in Ordnung. Der Fehler liegt **dahinter**. Damit sind Zertifikatstheorien erledigt.

## 3. Cloudflare-Fehlercodes richtig lesen

| Code | Bedeutung | Wo suchen |
|---|---|---|
| **526** | Cloudflare erreicht den Origin, kann sein **SSL-Zertifikat nicht validieren** | Origin-Zertifikat abgelaufen/ungültig, oder SSL-Modus `Full (strict)` passt nicht zum Origin |
| **521** | Origin verweigert die Verbindung | Origin down oder Firewall |
| **522** | Timeout zum Origin | Origin überlastet oder Netzfilter |
| **525** | SSL-Handshake mit dem Origin fehlgeschlagen | Cipher-/Protokoll-Mismatch |
| **1101** | **Worker hat eine Exception geworfen** | Worker-Code, nicht der Origin |
| **000** (curl) | keine Antwort / Timeout | kann Edge *oder* Origin sein — weiter mit Schritt 1–2 |

Wichtig: 526 und 1101 zeigen auf **völlig verschiedene** Schichten. Nicht verwechseln.

## 4. Worker — ist der *richtige* Code deployt?

Häufigster und am leichtesten zu übersehender Fehler: der Worker existiert, enthält aber den falschen Code.

Mit dem Cloudflare-Connector (nur lesend verfügbar):

```
workers_list                     → existiert "wdjjj"? wann zuletzt modified_on?
workers_get_worker_code(wdjjj)   → den deployten Code tatsächlich ansehen
```

Dann gegen das Repo vergleichen:

```bash
wc -l infra/cloudflare/wdjjj.js
grep -c '__wdjjj/health' infra/cloudflare/wdjjj.js   # der echte Router implementiert diesen Endpunkt
node --check infra/cloudflare/wdjjj.js
```

**Alarmzeichen:**

- Deployter Code ist wenige Zeilen lang und gibt einen statischen String zurück → **mit einem Platzhalter überschrieben**
- Deployter Code implementiert `/__wdjjj/health` nicht, die Repo-Version aber schon → falsche Version live
- `modified_on` liegt im Störungszeitraum → jemand hat deployt und dabei etwas zerstört

Gegenprobe über den Health-Endpunkt: er wird **vom Worker selbst** beantwortet und berührt keinen Origin.

```bash
curl -sS -m 12 https://djjessejay.ch/__wdjjj/health
# erwartet: {"ok":true,"proxy":"wdjjj", ...}
```

Antwortet er nicht mit diesem JSON, läuft der echte Router nicht — unabhängig davon, was andere Pfade zurückgeben.

**Fix:** `infra/cloudflare/wdjjj.js` neu deployen (`wrangler deploy` oder Dashboard-Editor). Die Worker-Tools des Connectors sind **read-only**, das Deployment kann aus Claude heraus nicht erfolgen.

## 5. Pages-Build schlägt fehl

Der Check `Cloudflare Pages` in PRs meldet nur „Build failed" mit Dashboard-Link. Zuerst ausschliessen, was im Repo prüfbar ist:

```bash
npm ci --dry-run                 # Lockfile synchron? sonst bricht der Build dort ab
git ls-files | wc -l             # Pages-Limit: 20 000 Dateien pro Deployment
git ls-files -z | xargs -0 ls -l | awk '$5>26214400{print $5,$9}'   # Limit: 25 MiB pro Datei
npm run build:css                # das dokumentierte Build-Kommando lokal ausführen
```

Laufen alle durch, liegt die Ursache in der Pages-**Projektkonfiguration** (Build-Befehl, Output-Verzeichnis, Node-Version, Build-Minuten) — nicht im Code. Im Repo existiert keine Pages-Konfiguration (kein `wrangler.toml`, kein `pages_build_output_dir`), sie liegt ausschliesslich im Dashboard.

Hinweis zur Dauer: Cloudflare legt den Check-Run erst am Ende an, bereits `completed`. `started_at == completed_at` ist ein **Artefakt** und kein Beweis, dass der Build nie lief. Die echte Dauer steht im Kommentarverlauf des Bots („Build in progress…" → „Build failed").

## 6. Ist es überhaupt diese Änderung?

Vor jeder Schuldzuweisung an einen PR:

```bash
git diff --name-only origin/main..HEAD     # was ändert dieser Branch wirklich?
```

Ein Edge-/Origin-Ausfall ist praktisch nie durch einen PR verursacht, der nur HTML, CSS oder Workflows anfasst. Und: der Check `Live edge smoke test` prüft die **Produktionsumgebung**, nicht den PR-Inhalt — er ist rot, solange die Site rot ist, auf jedem Branch.

## Reihenfolge der Meldung

1. **Was wird tatsächlich ausgeliefert** (Regel 0) — nicht der Statuscode
2. Welche Schicht ist defekt (DNS / Edge / Worker / Origin)
3. Was wurde ausgeschlossen, damit niemand dieselben Wege erneut geht
4. Der Fix und wer ihn ausführen muss — Worker-Deployment und Zone-Einstellungen liegen ausserhalb von Claude
