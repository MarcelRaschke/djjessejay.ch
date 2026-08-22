# Cloudflare Worker: djjessejay-router

Dieses Dokument enthält ein Beispiel für einen Cloudflare Worker, der Anfragen an djjessejay.ch anhand des Pfads zu GitHub Pages (statisch) bzw. zum Origin-Server (API/WebSocket) routet. Ergänze vor Nutzung die Platzhalter (origin Host) und lese die Hinweise zur sicheren Konfiguration.

---

## Datei: docs/WORKER_ROUTER.md

### Zusammenfassung
- Ziel: Ein Worker, der `/api/*`-Requests an den Backend-Origin (`origin.djjessejay.ch`) weiterleitet und alle anderen Anfragen an GitHub Pages (`marcelraschke.github.io`) sendet.
- Annahme: Der Origin-Host ist ein dedizierter DNS-only A-Record (z. B. origin.djjessejay.ch → 185.101.158.113) mit gültigem TLS-Zertifikat.

### Worker-Beispiel (JavaScript)

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Platzhalter: setze hier deinen origin-host (DNS-only)
  const ORIGIN_HOST = 'origin.djjessejay.ch'; // <--- ERSETZEN
  const PAGES_HOST = 'marcelraschke.github.io';

  // Route API-Requests zum Origin
  if (path.startsWith('/api/') || path === '/api' ) {
    const originUrl = new URL(request.url);
    originUrl.hostname = ORIGIN_HOST;
    originUrl.protocol = 'https:'; // TLS zur Origin

    const headers = new Headers(request.headers);
    headers.set('Host', ORIGIN_HOST);

    const init = {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual'
    };

    return fetch(originUrl.toString(), init);
  }

  // Alle anderen Anfragen an GitHub Pages
  {
    const pagesUrl = new URL(request.url);
    pagesUrl.hostname = PAGES_HOST;
    pagesUrl.protocol = 'https:';

    const headers = new Headers(request.headers);
    headers.set('Host', PAGES_HOST);

    const init = {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual'
    };

    // Optional: Response-Cache- oder Edge-Logik hier einfügen
    return fetch(pagesUrl.toString(), init);
  }
}
```

### Betriebs- und Sicherheits-Hinweise
- Origin-Hostname: Lege `origin.djjessejay.ch` (oder ähnlichen) als DNS-only A-Record auf die Origin-IP. Installiere ein gültiges TLS-Zertifikat für diesen Host (Let's Encrypt/ACME oder anderes CA).
- DNS für djjessejay.ch: Belasse die öffentliche Domain proxied (Cloudflare orange cloud) und verwende CNAME-Flattening falls nötig. Dokumentiere CNAME-Flattening-Verhalten in DNS_CONFIG.md.
- Firewall: Beschränke direkte Zugriffe auf die Origin-IP auf Cloudflare-IP-Ranges (oder auf interne Worker/Cloudflare-Quellen). Verhindere direkten, öffentlichen Zugriff, wenn gewünscht.
- WebSocket: Cloudflare Worker -> fetch() proxyt keine generischen WebSocket-Upgrades. Empfohlene Optionen:
  - Option A (einfach): Richte eine separate proxied Subdomain (z. B. ws.djjessejay.ch) und lasse Cloudflare die WebSocket-Proxy-Funktion übernehmen; route `/ws` nicht durch den Worker.
  - Option B (fortgeschritten): Implementiere in Worker WebSocketPair und proxye über WebSocket-Client-Logik — komplex und erfordert Tests.
- Host-Header: Worker setzt Host header passend, damit Origin TLS/SNI korrekt ist.

### Tests
- Statisch: curl -I https://djjessejay.ch/  → Response von GitHub Pages (200)
- API: curl -I https://djjessejay.ch/api/status → Response vom Origin (200/404/...) je nach Endpoint
- WebSocket: wscat -c wss://ws.djjessejay.ch/ws (wenn separate proxied subdomain verwendet)

### Deployment
- Deploy über Cloudflare Dashboard → Workers → Create Service (oder mit wrangler):
  - wrangler init djjessejay-router
  - wrangler publish
- Binde Route: `djjessejay.ch/*` → Worker (achte darauf, wie du /ws handhabst)

---

Dateiende.
