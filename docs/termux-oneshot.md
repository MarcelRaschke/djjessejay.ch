# Termux Oneshot Prompt

Ein einziger, selbstgenügsamer Prompt, den ein KI-Agent in Termux
durchläuft, um das komplette lokale Setup aus
[termux-setup.md](termux-setup.md) autonom auszuführen.

Zielgruppe: AI-Coding-Agents (z. B. Claude Code, Kimi CLI) auf Android.
Einfach den folgenden Block komplett in den Agenten kopieren.

```markdown
# ONESHOT: DJessejay.ch — Lokales Termux-Setup

Du bist ein Setup-Agent. Führe das komplette lokale Setup des Repos
`MarcelRaschke/djjessejay.ch` auf diesem Android-Gerät (Termux) durch.
Arbeite autonom. Frage nur, wenn es wirklich nicht anders geht.

## Regeln (bindend)
- Lies zuerst `AGENTS.md` und `CLAUDE.md` im Repo und halte dich daran.
- Keine Secrets, Tokens oder Keys in Dateien committen oder ausgeben.
- Keine `git push` — Änderungen nur lokal. Pushes brauchen Human Review.
- Der Server ist nur für lokale Nutzung. Live-Setup (GitHub Pages +
  Cloudflare Worker) bleibt unangetastet.
- Installiere NUR `nodejs-lts` (nicht `nodejs`) — die beiden konfliktieren.
  Das Repo braucht Node >= 24.

## Schritte

1. **Basis-Pakete**
   pkg update && pkg upgrade -y
   pkg install -y git nodejs-lts python
   Prüfe: `node -v` muss v24.x melden.

2. **Repo klonen + installieren**
   git clone --depth 1 https://github.com/MarcelRaschke/djjessejay.ch.git
   cd djjessejay.ch
   npm install --omit=dev
   (Nur wenn `npm install` mit dev-deps wirklich nötig ist: beachte, dass
   @tailwindcss/cli v4 ggf. keine Android-Binaries hat. `tailwind.css` ist
   committet — Rebuild ist optional.)

3. **Konfiguration**
   cp .env.example .env
   PORT bleibt 3000. Ersetze in `.env` die Platzhalter durch leere Werte:
   `TURNSTILE_SECRET_KEY=`, `SMTP_HOST=`, `SMTP_USER=`, `SMTP_PASS=`
   und `CONTACT_EMAIL_TO=`. SMTP bleibt damit inaktiv.
   Ohne Turnstile-Secret antwortet `/api/contact` bei ansonsten gültigen
   Eingaben mit HTTP 500; erfolgreiche Kontaktanfragen sind so nicht möglich.
   Die Schutzprüfung nicht umgehen.

4. **Starten + verifizieren**
   node --env-file=.env server.js
   Warte kurz, dann in zweiter Shell:
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
   Erwartet: 200. Server danach wieder stoppen (Ctrl+C).

5. **Tests (optional, nur wenn Zeit)**
   npm test

6. **Abschlussbericht** — kurz, auf Deutsch:
   - Node-Version, ob Server 200 lieferte, auffällige Fehler,
     offene Punkte. Keine Log-Dumps.

## Häufige Stolpersteine
- Phantom-Process-Killer: für Dauerbetrieb Termux-Wakelock setzen,
  Akku-Optimierung für Termux aus, ggf. `pkg install termux-services`
  und `sv`-Service für den Server.
- Play-Store-Termux ist veraltet → Setup läuft auf F-Droid-Build.
```

## Anpassung

- Der Prompt erzwingt das Lesen von `AGENTS.md` und `CLAUDE.md` als
  erste Aktion, damit die Repository-Disziplin auch auf dem Gerät gilt.
- `git push` ist ausgeschlossen; der Agent bleibt lokal.
- Der Abschlussbericht ist absichtlich knapp gehalten.
