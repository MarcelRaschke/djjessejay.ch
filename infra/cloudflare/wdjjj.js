/**
 * wdjjj — Cloudflare Worker Reverse-Proxy
 * djjessejay.ch/* → https://marcelraschke.github.io/djjessejay.ch/*
 *
 * Canonical path is configurable through ORIGIN_PREFIX and defaults to the
 * GitHub Pages project-site path derived from this repository name.
 */

const CANONICAL_HOST = "djjessejay.ch";
const ORIGIN_HOST_DEFAULT = "marcelraschke.github.io";
const ORIGIN_PREFIX_DEFAULT = "/djjessejay.ch";
const API_TIMEOUT_MS = 30000;
const UPSTREAM_TIMEOUT_MS = 8000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

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

const OWN_HEADERS = {
  "content-security-policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.anthropic.com https://www.google.com/recaptcha/ https://soundcloud.com https://api.soundcloud.com",
    "frame-src 'self' https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://w.soundcloud.com https://soundcloud.com",
    "media-src 'self' blob: https:",
  ].join("; "),
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "cross-origin-opener-policy": "same-origin-allow-popups",
  "x-proxy": "wdjjj",
};

function toOriginPath(pathname, originPrefix) {
  let path = pathname || "/";
  if (path === originPrefix) path = "/";
  else if (path.startsWith(originPrefix + "/")) path = path.slice(originPrefix.length);
  if (!path.startsWith("/")) path = "/" + path;
  return originPrefix + (path === "/" ? "/" : path);
}

function rewriteLocation(location, originHost, originPrefix) {
  try {
    const target = new URL(location, `https://${originHost}`);
    if (target.hostname !== originHost) return location;
    let path = target.pathname;
    if (path === originPrefix) path = "/";
    else if (path.startsWith(originPrefix + "/")) path = path.slice(originPrefix.length);
    return path + target.search + target.hash;
  } catch {
    return location;
  }
}

function errorPage(status, reason, originHost, originPrefix) {
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${status} ${reason} — djjessejay.ch</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050b18;color:#e8eef7;font-family:system-ui,sans-serif}main{text-align:center;padding:2rem;max-width:42rem}h1{color:#22d3ee;letter-spacing:.18em;font-size:1rem}p{color:#94a3b8;line-height:1.6}code{color:#cbd5e1}</style></head><body><main><h1>BLUE DIMENSION · ${status}</h1><p>${reason}. Der Edge-Proxy bleibt aktiv. Origin: <code>${originHost}${originPrefix}</code>. Bitte später erneut versuchen.</p></main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      ...OWN_HEADERS,
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "30",
    },
  });
}

function withSecurityHeaders(response, upstream, originHost, originPrefix) {
  const headers = new Headers();
  for (const [key, value] of upstream.headers) {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  }
  for (const [key, value] of Object.entries(OWN_HEADERS)) headers.set(key, value);

  if (REDIRECT_STATUSES.has(upstream.status)) {
    const location = upstream.headers.get("location");
    if (location) headers.set("location", rewriteLocation(location, originHost, originPrefix));
  }

  const contentType = headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    headers.set("cache-control", "public, max-age=60, s-maxage=600, stale-while-revalidate=86400");
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}

function isAllowedApiOriginHost(host) {
  if (typeof host !== "string" || !/^[a-z0-9.-]+$/i.test(host)) return false;
  let parsed;
  try { parsed = new URL(`https://${host}/`); } catch { return false; }
  const h = parsed.hostname.toLowerCase();
  if (parsed.username || parsed.password || parsed.port || h !== host.toLowerCase()) return false;
  if (h === CANONICAL_HOST || h === `www.${CANONICAL_HOST}`) return false;
  return h.endsWith(`.${CANONICAL_HOST}`) && !h.includes("..");
}

function proxyToApiOrigin(request, url, apiOriginHost, env) {
  const target = new URL("https://placeholder.invalid/");
  // Build from validated parts only: no port or userinfo can sneak in.
  target.hostname = apiOriginHost;
  target.pathname = url.pathname;
  target.search = url.search;
  if (target.hostname !== apiOriginHost.toLowerCase() || target.port || target.username || target.password) {
    return Promise.resolve(new Response("API origin host not allowed", { status: 502, headers: { ...OWN_HEADERS, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } }));
  }
  const headers = new Headers(request.headers);
  headers.set("host", apiOriginHost);
  // Never forward client-supplied Access credentials; send only the Worker's own
  // service token, which is the only identity the origin's Access app admits.
  for (const name of ["cf-access-client-id", "cf-access-client-secret", "cf-access-jwt-assertion", "cf-access-token"]) headers.delete(name);
  headers.set("cf-access-client-id", env.ORIGIN_ACCESS_CLIENT_ID);
  headers.set("cf-access-client-secret", env.ORIGIN_ACCESS_CLIENT_SECRET);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  return fetch(target.toString(), {
    method: request.method,
    headers,
    body: request.method === "POST" ? request.body : undefined,
    redirect: "manual",
    signal: controller.signal,
  })
    .then((upstream) => withApiSecurityHeaders(upstream))
    .catch(() => errorPage(504, "Gateway Timeout", apiOriginHost, "/api"))
    .finally(() => clearTimeout(timer));
}

function withApiSecurityHeaders(upstream) {
  const headers = new Headers();
  for (const [key, value] of upstream.headers) {
    const lower = key.toLowerCase();
    if (STRIP_RESPONSE_HEADERS.has(lower)) continue;
    if (lower === "content-length" || lower === "transfer-encoding") continue;
    if (lower === "set-cookie") continue;
    headers.set(key, value);
  }
  // Cookies are re-added one by one (Headers.set would fold them into one) and
  // the Access session cookies minted for the Worker's service token are
  // dropped, so they never reach the browser.
  for (const cookie of upstreamSetCookies(upstream.headers)) {
    if (isAccessCookie(cookie)) continue;
    headers.append("set-cookie", cookie);
  }
  for (const [key, value] of Object.entries(OWN_HEADERS)) headers.set(key, value);
  headers.set("cache-control", "no-store");
  return new Response(upstream.body, { status: upstream.status, headers });
}

const ACCESS_COOKIE_NAMES = new Set(["cf_authorization", "cf_appsession", "cf_binding"]);

function upstreamSetCookies(upstreamHeaders) {
  if (typeof upstreamHeaders.getSetCookie === "function") return upstreamHeaders.getSetCookie();
  const single = upstreamHeaders.get("set-cookie");
  return single ? [single] : [];
}

function isAccessCookie(cookie) {
  const name = cookie.split("=", 1)[0].trim().toLowerCase();
  return ACCESS_COOKIE_NAMES.has(name);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const originHost = (env && env.ORIGIN_HOST) || ORIGIN_HOST_DEFAULT;
    const originPrefix = (env && env.ORIGIN_PREFIX) || ORIGIN_PREFIX_DEFAULT;

    if (url.hostname === `www.${CANONICAL_HOST}`) {
      return Response.redirect(`https://${CANONICAL_HOST}${url.pathname}${url.search}`, 301);
    }

    if (url.pathname === "/__wdjjj/health") {
      return new Response(JSON.stringify({ ok: true, proxy: "wdjjj", origin: originHost, originPrefix, version: "2026-09" }), {
        status: 200,
        headers: { ...OWN_HEADERS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      });
    }

    // API routes (/api and /api/*) are proxied to the Express backend origin.
    // Only the methods the backend uses are allowed; everything else is 405.
    const apiOriginHost = (env && env.API_ORIGIN_HOST) || "";
    const isApiPath = url.pathname === "/api" || url.pathname.startsWith("/api/");
    if (isApiPath) {
      if (!apiOriginHost) {
        return new Response("API origin not configured", { status: 502, headers: { ...OWN_HEADERS, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
      }
      // Fail closed: without the service token the origin's Access app would reject the
      // request anyway; answer here instead of sending an unauthenticated subrequest.
      if (!env.ORIGIN_ACCESS_CLIENT_ID || !env.ORIGIN_ACCESS_CLIENT_SECRET) {
        return new Response("API origin credentials not configured", { status: 502, headers: { ...OWN_HEADERS, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
      }
      // The service token must never travel over plaintext; Always Use HTTPS does not apply
      // to Worker subrequests, so refuse any other scheme instead of downgrading.
      const apiScheme = (env && env.API_ORIGIN_SCHEME) || "https";
      if (apiScheme !== "https") {
        return new Response("API origin must use https", { status: 502, headers: { ...OWN_HEADERS, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
      }
      // The service token may only go to a subdomain of our own zone (never apex/www,
      // never userinfo/path tricks): a mistyped or tampered API_ORIGIN_HOST fails closed.
      if (!isAllowedApiOriginHost(apiOriginHost)) {
        return new Response("API origin host not allowed", { status: 502, headers: { ...OWN_HEADERS, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
      }
      if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405, headers: { ...OWN_HEADERS, allow: "GET, HEAD, POST", "cache-control": "no-store" } });
      }
      return proxyToApiOrigin(request, url, apiOriginHost, env);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { ...OWN_HEADERS, allow: "GET, HEAD", "cache-control": "no-store" } });
    }

    const cacheable = request.method === "GET" && url.search === "" && !request.headers.has("range");
    const cache = caches.default;
    const cacheKey = new Request(`https://${CANONICAL_HOST}${url.pathname}`, { method: "GET" });

    if (cacheable) {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    }

    const originUrl = new URL(`https://${originHost}${toOriginPath(url.pathname, originPrefix)}${url.search}`);
    const originHeaders = new Headers({ "user-agent": "wdjjj/2.0 (+https://djjessejay.ch)" });
    const accept = request.headers.get("accept");
    const range = request.headers.get("range");
    if (accept) originHeaders.set("accept", accept);
    if (range) originHeaders.set("range", range);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    let upstream;
    try {
      upstream = await fetch(originUrl, { method: request.method, headers: originHeaders, redirect: "manual", signal: controller.signal });
    } catch {
      const stale = await cache.match(cacheKey);
      if (stale) return stale;
      return errorPage(504, "Gateway Timeout", originHost, originPrefix);
    } finally {
      clearTimeout(timer);
    }

    if (upstream.status >= 500) {
      const stale = await cache.match(cacheKey);
      if (stale) return stale;
      return errorPage(503, "Origin Service Unavailable", originHost, originPrefix);
    }

    const response = withSecurityHeaders(upstream, upstream, originHost, originPrefix);
    if (cacheable && upstream.status === 200 && !upstream.headers.has("set-cookie")) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }
    return response;
  },
};
