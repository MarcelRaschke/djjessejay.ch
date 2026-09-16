/**
 * wdjjj — Cloudflare Worker Reverse-Proxy
 * djjessejay.ch/*  →  https://marcelraschke.github.io/djjessejay/*
 *
 * Verhalten (Runbook-Spezifikation):
 *   - Pfad-Mapping ohne Doppel-Prefix:  /foo → /djjessejay/foo
 *   - Location-Header-Rewriting: Redirects bleiben auf djjessejay.ch
 *   - 8s Upstream-Timeout (AbortController), danach 504-Fallbackseite
 *   - CSP/HSTS-Stripping vom Origin, eigene Security-Header
 *   - Cache-API: GET ohne Query/Range, Key = Pfad, HTML kurz, Assets nach Origin
 *   - www → apex Redirect (301), Health-Endpoint /__wdjjj/health
 *
 * Deployment: infra/cloudflare/wdjjj.js + wrangler.toml (siehe Runbook)
 */

const CANONICAL_HOST = "djjessejay.ch";
const ORIGIN_HOST_DEFAULT = "marcelraschke.github.io";
const ORIGIN_PREFIX = "/djjessejay";
const UPSTREAM_TIMEOUT_MS = 8000;

/** Origin-Header, die strikt entfernt werden (CSP/HSTS-Stripping + Rauschen). */
const STRIP_RESPONSE_HEADERS = new Set([
  "content-security-policy",
  "content-security-policy-report-only",
  "strict-transport-security",
  "x-frame-options",
  "x-xss-protection",
  "server",
  "x-served-by",
  "x-github-request-id",
  "x-fastly-request-id",
  "via",
  "x-cache",
  "x-cache-hits",
  "x-timer",
  "age",
]);

/** Eigene Header, die nach dem Stripping gesetzt werden. */
const OWN_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-proxy": "wdjjj",
};

const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

/**
 * Incoming-Pfad → Origin-Pfad, ohne Doppel-Prefix.
 *   "/"               → "/djjessejay/"
 *   "/foo"            → "/djjessejay/foo"
 *   "/djjessejay/foo" → "/djjessejay/foo"  (Prefix bereits enthalten → nur einmal)
 */
function toOriginPath(pathname) {
  let p = pathname;
  if (p === ORIGIN_PREFIX) {
    p = "/";
  } else if (p.startsWith(ORIGIN_PREFIX + "/")) {
    p = p.slice(ORIGIN_PREFIX.length);
  }
  if (!p.startsWith("/")) p = "/" + p;
  return ORIGIN_PREFIX + (p === "/" ? "/" : p);
}

/**
 * Location-Header des Origins zurücklesen auf djjessejay.ch-Pfade.
 * Externe Redirect-Ziele (andere Hosts) bleiben unverändert.
 */
function rewriteLocation(location, originHost) {
  try {
    const u = new URL(location, "https://" + CANONICAL_HOST);
    if (u.hostname !== originHost) return location;
    let p = u.pathname;
    if (p === ORIGIN_PREFIX) {
      p = "/";
    } else if (p.startsWith(ORIGIN_PREFIX + "/")) {
      p = p.slice(ORIGIN_PREFIX.length);
    }
    return p + u.search + u.hash;
  } catch (_) {
    return location;
  }
}

/** Minimale Fehlerseite (Offline-/Timeout-Fallback, djjessejay.ch bleibt ansprechbar). */
function errorPage(status) {
  const reason = status === 504 ? "Gateway Timeout" : "Service Unavailable";
  const html =
    "<!doctype html>\n" +
    '<html lang="de">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    "<title>" + reason + " \u2014 djjessejay.ch</title>\n" +
    "<style>\n" +
    "body{background:#05050a;color:#e8e8f0;font-family:system-ui,sans-serif;" +
    "display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}\n" +
    "main{text-align:center;padding:2rem}\n" +
    "h1{font-size:1.1rem;letter-spacing:.3em;color:#00e5ff;text-transform:uppercase}\n" +
    "p{color:#8a8aa0;font-size:.9rem}\n" +
    "</style>\n</head>\n<body>\n<main>\n" +
    "<h1>" + status + " " + reason + "</h1>\n" +
    "<p>Origin (GitHub Pages) nicht erreichbar. Cached Inhalte bleiben aktiv, " +
    "Retry in Kürze \u2014 Blue Dimension bleibt on air.</p>\n" +
    "</main>\n</body>\n</html>";
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "30",
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const originHost = (env && env.ORIGIN_HOST) || ORIGIN_HOST_DEFAULT;

    // www → apex
    if (url.hostname === "www." + CANONICAL_HOST) {
      return Response.redirect(
        "https://" + CANONICAL_HOST + url.pathname + url.search,
        301
      );
    }

    // Health-Check (Monitoring, Uptime-Prüfung)
    if (url.pathname === "/__wdjjj/health") {
      return new Response(
        JSON.stringify({ ok: true, proxy: "wdjjj", origin: originHost }),
        {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        }
      );
    }

    // Statischer Spiegel: nur Lese-Methoden
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: "GET, HEAD", "cache-control": "no-store" },
      });
    }

    // Cache nur für GET ohne Query-String und ohne Range-Request
    const cacheable =
      request.method === "GET" &&
      url.search === "" &&
      !request.headers.has("range");

    const cache = caches.default;
    const cacheKey = new Request("https://" + CANONICAL_HOST + url.pathname, {
      method: "GET",
    });

    if (cacheable) {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    }

    // Upstream-Request bauen (Forwarding nur minimaler Header)
    const originUrl = new URL(
      "https://" + originHost + toOriginPath(url.pathname) + url.search
    );
    const originHeaders = {
      "user-agent": "wdjjj/1.0 (+https://djjessejay.ch)",
    };
    const accept = request.headers.get("accept");
    if (accept) originHeaders.accept = accept;
    const range = request.headers.get("range");
    if (range) originHeaders.range = range;

    // 8s-Timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    let upstream;
    try {
      upstream = await fetch(originUrl, {
        method: request.method,
        headers: originHeaders,
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (err) {
      // Offline-Resilienz: Stale-Cache als letzter Fallback, sonst Fehlerseite
      const stale = await cache.match(cacheKey);
      if (stale) return stale;
      return errorPage(504);
    } finally {
      clearTimeout(timer);
    }

    // Response-Header: strippen, dann eigene setzen
    const headers = new Headers();
    for (const [key, value] of upstream.headers) {
      if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        headers.set(key, value);
      }
    }
    for (const [key, value] of Object.entries(OWN_HEADERS)) {
      headers.set(key, value);
    }

    // Redirects: Location zurück auf djjessejay.ch mappen
    if (REDIRECT_STATUSES.includes(upstream.status)) {
      const loc = upstream.headers.get("location");
      if (loc) headers.set("location", rewriteLocation(loc, originHost));
    }

    // HTML kurz halten, Assets erben Origin-Cache-Control
    const contentType = headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      headers.set("cache-control", "public, max-age=60, s-maxage=600");
    }

    const response = new Response(upstream.body, {
      status: upstream.status,
      headers,
    });

    // Cache befüllen (nur volle Treffer, nie mit Set-Cookie)
    if (
      cacheable &&
      upstream.status === 200 &&
      !upstream.headers.has("set-cookie")
    ) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  },
};
