# Umsetzungsplan — offene Probleme

Statusübersicht der aus `docs/AUDIT_REPORT_2026-04-07.md`, Code-TODOs und Platzhaltern
abgeleiteten offenen Probleme. Die Reihenfolge folgt der Priorität: Sicherheit vor
Freigabe, Repository-Hygiene, Inhalte (nach Quellenverifikation), Doku/Strategie.

## Vorab-Hinweis: Audit-Fehlalarme

Zwei Audit-Empfehlungen treffen auf dieses Repository **nicht** zu und werden nicht
umgesetzt:

- **„Webpack-Fehler beheben"** — es gibt kein Webpack im Repo; der Build nutzt
  Tailwind (`build:css` in `package.json`). Keine Webpack-Konfigurationsdatei vorhanden.
- **„MyISAM → InnoDB, latin1 → utf8mb4"** — das Repo nutzt PostgreSQL via Drizzle
  (`control-center/foss/api/drizzle/0000_foss_control_center.sql` mit `pgcrypto` /
  `jsonb`). Diese MySQL-spezifischen Begriffe passen nicht zum Stack.

## P0 — Sicherheit (vor jeder weiteren Freigabe)

### P0.1 — Clientseitiger Anthropic-API-Aufruf absichern — **umgesetzt**

- Befund: `index.html` rief `api.anthropic.com` direkt aus dem Browser auf
  (`anthropic-dangerous-direct-browser-access: true`), `apiKey` war leer.
- Umsetzung:
  - Serverseitiger Proxy-Endpunkt `/api/ai/generate` in `server.js`; der
    Anthropic-Key liegt nur in der Server-Umgebung (`ANTHROPIC_API_KEY`).
  - Systemanweisungen sind serverautoritativ, schlüsselisiert nach Feature-ID.
    Der Client sendet nur eine Feature-ID und Nutzereingabe — keine
    System-Rollen-Injection vom Client möglich.
  - Client `callClaudeAPI` nutzt primär den Proxy. Der direkte Anthropic-Aufruf
    bleibt als Collaboration/Fallback erhalten: nur wenn der Proxy HTTP 503
    liefert **und** ein clientseitiger Key vorhanden ist (lokale Entwicklung).
  - Strikteres Rate-Limiting für den AI-Proxy.
  - Cloudflare Worker (`infra/cloudflare/wdjjj.js`) routet `/api` und `/api/*`
    (GET/HEAD/POST) an das Express-Backend (`API_ORIGIN_HOST`); die
    POST-Sperre für statische Pfade bleibt erhalten.
- Validierung: `node --check`, `npm run lint`, `npm test` (18/18), lokaler
  Endpoint-Test (Health 200, 503 ohne Key, 400 bei unbekanntem Feature / fehlendem
  Input, 405 bei POST auf `/`).

### P0.2 — reCAPTCHA-Keys konfigurieren / Build einbinden — **umgesetzt**

- Befund: `index.html` enthielt Platzhalter `YOUR_RECAPTCHA_SITE_KEY`;
  `build:html` (`scripts/replace-recaptcha-key.mjs`) lief in keinem Workflow.
- Umsetzung:
  - `static.yml` injiziert den reCAPTCHA-Site-Key, wenn die
    Repository-Variable `RECAPTCHA_SITE_KEY` gesetzt ist.
  - Injektionsskript ersetzt nur den kanonischen Platzhalter
    `YOUR_RECAPTCHA_SITE_KEY` (keine partielle Substitution des
    JS-Konstantennamens mehr).
- Offen (Operator): `RECAPTCHA_SITE_KEY` als Repository-Variable setzen und
  sicherstellen, dass kein echter Key committet wird (Secret-Scanning prüft).

## P1 — Repository-Hygiene & Governance

### P1.3 — Veraltete Branches — **Identifikation abgeschlossen; Löschung wartet auf Freigabe**

Befund: 22 Nicht-`main`-Branches, **keiner** mit offener PR. Status via
`compare/main...<branch>`:

#### Risikoarm (ahead=0, keine eigene ungemergte Arbeit) — Löschung vorgeschlagen

| Branch | Status |
|---|---|
| `claude/code-skills-98mWE` | behind, ahead=0 |
| `edge-runtime-v1-p0-implementation` | behind, ahead=0 |
| `feature/web-scraper-starter` | behind, ahead=0 |
| `vibe/dns-config-fix-316b9d` | behind, ahead=0 |

#### Mit ungemergter Arbeit (ahead>0) — **nicht** löschen ohne Einzelfallprüfung

| Branch | ahead |
|---|---|
| `MarcelRaschke-patch-1` | 1 |
| `MarcelRaschke-patch-2` | 2 |
| `MarcelRaschke-patch-3` | 3 |
| `MarcelRaschke-patch-4` | 1 |
| `MarcelRaschke-patch-5` | 1 |
| `MarcelRaschke-patch-6` | 31 |
| `agent/harden-cloudflare-environment` | 2 |
| `blue-dimension-site-v1` | 3 |
| `claude/add-claude-documentation-ZMY2j` | 3 |
| `claude/python-backend-css-improvements-lErqw` | 2 |
| `cursor/debug-all-code-ce73` | 1 |
| `cursor/fix-three-codebase-bugs-b79e` | 4 |
| `design/p0-blue-dimension` | 1 |
| `feat/video-blue-dimension-generator` | 1 |
| `vibe/dns-live-drift-e3f617` | 2 |
| `vibe/hero-integration-5ee5a2` | 1 |
| `vibe/metadata-provenance-bd3116` | 4 |
| `vibe/three-selfhost-5ee5a2` | 2 |

Aktion: Löschung ist eine irreversible Remote-Operation und erfordert explizite
Freigabe. Vorschlag: die 4 risikoarmen Branches löschen, die übrigen 18 vor dem
Löschen einzeln auf Inhalte/Relevanz prüfen (ggf. cherry-pick oder archivieren).

### P1.4 — WebSocket-Route klären

- Befund: `docs/cloudflare-worker-router.js` TODO — `/ws` gibt 501; WebSocket in
  `server.js` nicht implementiert, `ws`-Dependency in `package.json`.
- Aktion: Entweder WebSocket-Endpunkt in `server.js` implementieren und im Worker
  weiterleiten lassen, oder Route entfernen und `ws`-Dependency streichen, falls
  nicht benötigt. Entscheidung einholen.

## P2 — Inhalte & Platzhalter (nur nach Quellenverifikation, AGENTS.md-Provenanzregeln)

### P2.5 — Offizielle Künstlerprofile verlinken

- Befund: `index.html` Spotify- und YouTube-Suchen statt offizieller Profile
  (TODOs).
- Aktion: Offizielle URLs beschaffen, mind. „Verified platform profile" gemäß
  AGENTS.md. Vor Verifikation Status `unverified` markieren.

### P2.6 — Impressum-E-Mail ausfüllen

- Befund: Platzhalter `[Ihre-E-Mail-Adresse@domain.com]` (DE/EN) in `index.html`.
- Aktion: Echte Kontakt-E-Mail einsetzen (beide Sprachen).

### P2.7 — Download-Assets bereitstellen

- Befund: „Logos & Bilder (bald verfügbar)" deaktiviert in `index.html`.
- Aktion: Logos/Bilder ins `presskit` aufnehmen und Link aktivieren oder als
  geplant dokumentieren.

## P3 — Doku / Strategie

### P3.1 — Framework-Entscheidung Next.js vs. Static

Bewertung: Die aktuelle Architektur (statische Site auf GitHub Pages + Express-Backend
+ Cloudflare-Worker als Routing-Edge) ist für den Funktionsumfang angemessen. Ein
Wechsel auf Next.js ist **nur** bei echtem Bedarf gerechtfertigt.

| Kriterium | Aktuell (Static + Express + Worker) | Next.js |
|---|---|---|
| SSR nötig? | Nein (Inhalte überwiegend statisch, AI clientseitig über Proxy) | Erst nötig bei SEO-kritischen dynamischen Inhalten oder personalisierten SSR-Seiten |
| Hosting-Komplexität | Niedrig (Pages kostenlos, Worker kostenlos, 1 Backend) | Höher (Vercel o. selbst-gehostet, Edge-Functions, Build-Pipeline) |
| Kosteneffizienz | Gut | Gut bei Vercel-Free, aber Vendor-Lock-in |
| Sicherheit | Key serverseitig im Express-Proxy; Edge strippt Header | Key in API-Routes/Edge; vergleichbar |
| Migration | — | Erheblich: i18n-Strings, AI-Features, Kontaktformular, CI neu aufbauen |

Empfehlung: **Beibehalten der statischen Architektur.** Next.js erst evaluieren,
falls SSR-fähige Inhaltsseiten, serverseitiges Rendering für SEO oder eine
einheitliche Fullstack-Plattform fachlich gefordert werden. Bis dahin deckt der
neue AI-Proxy das sicherheitsrelevante Bedürfnis ab.

### P3.2 — Audit-Korrekturhinweis

`docs/AUDIT_REPORT_2026-04-07.md` um Hinweis ergänzen, dass Webpack- und
MySQL/MyISAM-Empfehlungen nicht auf den Stack zutreffen (PostgreSQL/Drizzle,
Tailwind), damit diese Fehlalarme nicht erneut abgearbeitet werden.
