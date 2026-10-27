# Rollen-Trennung: GitHub Pages, wdjjj-Worker, Express-Origin, Render

Stand: 27.10.2026. Referenz-Audit: Issue #205. Dieses Dokument definiert, welche
Deploy-Ziele welche Rolle haben und welche Dienste keine Rolle mehr haben.

## Architektur-Rollen

| Ebene | Dienst | Rolle | Deploy-Strecke |
|---|---|---|---|
| Statischer Origin | GitHub Pages (marcelraschke.github.io/djjessejay.ch) | Alle statischen Seiten, Assets, Bilder | .github/workflows/static.yml (Allowlist-Bundle dist/) |
| Edge-Proxy | Cloudflare Worker wdjjj (infra/cloudflare/wdjjj.js) | Routing /api/* zum Express-Origin, Rest zu Pages; Cache API (Edge-Cache), Security-Header, Fehlerseiten | .github/workflows/deploy-wdjjj.yml (wrangler) |
| Dynamischer Origin | Express-Backend über Cloudflare Tunnel (origin.djjessejay.ch, Access Service Token) | REST-API (/api/health, /api/contact, KI-Proxy), spätere WebSocket-Pfade | Manuell via SSH/systemd bzw. PM2; eigene CI/CD-Strecke offen (siehe DEPLOYMENT.md) |
| Ausser Betrieb | Render.com-Dienst "Blue-Dimension" | Keine Rolle in der Zielarchitektur; Build-Failures vom 27.10.2026 betreffen einen obsoleten Dienst | Stilllegen (Render-Dashboard), nicht weiter parallel pflegen |

## Verbindende Regeln

1. Pages ist statisch: Alles Dynamische läuft über den Worker zum Express-Origin.
   Keine Ausnahme, kein serverseitiges Rendering auf Pages.
2. Der Worker ist der einzige Edge-Cache. Da die Worker-Route die Zonen-CDN
   umgeht, sind seine Cache-Regeln die einzige Bandbreiten-Entlastung des
   Pages-Origins (Details zu Query-Normalisierung und CACHE_VERSION: wdjjj.js).
3. GitHub-Pages-Nutzungsbedingungen verbieten E-Commerce und sensible Daten auf
   Pages: Checkout, Bestell- und personenbezogene Daten gehören ausschliesslich
   auf den Express-Origin bzw. in dessen Datenspeicher.
4. Das Deploy-Bundle ist eine Allowlist (dist/ in static.yml). Neue öffentliche
   Dateien werden bewusst hinzugefügt; Ops-Inhalte (docs/, scripts/, infra/,
   honeypot/, policy/, test/) werden nicht deployt.

## Bekannter Doku-Drift (aufräumen)

- DEPLOYMENT.md und CLAUDE.md referenzieren teilweise noch den Legacy-Namen
  djjessejay-router und docs/cloudflare-worker-router.js. Produktiv ist wdjjj
  (Health-Endpoint /__wdjjj/health). Bei der nächsten Überarbeitung der
  Dokumente einheitlich auf wdjjj umstellen und Router-Referenzen als Legacy
  kennzeichnen.

## Rollback

- Pages: Revert des Allowlist-Commits stellt das alte Bundle-Verhalten wieder her.
- Worker: deploy-wdjjj.yml per workflow_dispatch mit dem vorherigen Stand neu ausfuehren.
- Render bleibt stillgelegt; ein Reaktivieren ist nicht vorgesehen.
