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

// Request headers forwarded to the API origin. The list is an allow-list on
// purpose: the origin sits behind a Cloudflare Access service-token policy and
// must never receive client-supplied `cf-access-*`, `cf-*`, cookie or
// `x-forwarded-*` headers. Every entry below is read by the Express backend
// (cors, honeypot middleware/monitor, body parsing). `content-encoding` is
// required because express.json/urlencoded inflate gzip/deflate/br bodies by
// default; without it a compressed POST body would be parsed as plain text.
const API_FORWARD_REQUEST_HEADERS = new Set([
  "accept",
  "accept-language",
  "authorization",
  "content-encoding",
  "content-type",
  "origin",
  "referer",
  "user-agent",
  "x-honeypot-token",
]);

const OWN_HEADERS = {
  "content-security-policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://challenges.cloudflare.com https://soundcloud.com https://api.soundcloud.com",
    "frame-src 'self' https://challenges.cloudflare.com https://w.soundcloud.com https://soundcloud.com",
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

function hasOriginAccessCredentials(env) {
  return Boolean(env && env.ORIGIN_ACCESS_CLIENT_ID && env.ORIGIN_ACCESS_CLIENT_SECRET);
}

// Builds the request headers for the API origin from scratch. Nothing the
// client sent is forwarded unless it is in API_FORWARD_REQUEST_HEADERS, so a
// client cannot inject its own Access credentials or spoof the client IP.
function buildApiRequestHeaders(request, apiOriginHost, env) {
  const headers = new Headers();
  for (const [key, value] of request.headers) {
    if (API_FORWARD_REQUEST_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  }
  headers.set("host", apiOriginHost);
  headers.set("x-forwarded-proto", "https");
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  headers.set("cf-access-client-id", env.ORIGIN_ACCESS_CLIENT_ID);
  headers.set("cf-access-client-secret", env.ORIGIN_ACCESS_CLIENT_SECRET);
  return headers;
}

function proxyToApiOrigin(request, url, apiOriginHost, env) {
  const apiScheme = (env && env.API_ORIGIN_SCHEME) || "https";
  const apiOriginPort = (env && env.API_ORIGIN_PORT) || "";
  const target = new URL(`${apiScheme}://${apiOriginHost}${apiOriginPort ? ":" + apiOriginPort : ""}${url.pathname}${url.search}`);
  const headers = buildApiRequestHeaders(request, apiOriginHost, env);
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
    // Never hand upstream cookies to the public caller. Unless strict service
    // token authentication is enabled on the Access organization, Access can
    // answer a service-token request with a CF_Authorization cookie carrying
    // the Worker's service identity; relaying it would let any API caller
    // replay that identity against the protected origin. The Express backend
    // sets no cookies of its own, so dropping all of them loses nothing.
    if (lower === "set-cookie") continue;
    headers.set(key, value);
  }
  for (const [key, value] of Object.entries(OWN_HEADERS)) headers.set(key, value);
  headers.set("cache-control", "no-store");
  return new Response(upstream.body, { status: upstream.status, headers });
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
      // originAuth reports whether the Access service-token secrets are bound,
      // never their values. The deploy workflow and scripts/deployment-checklist.sh
      // assert "configured" before the service-token-only policy is applied.
      return new Response(JSON.stringify({ ok: true, proxy: "wdjjj", origin: originHost, originPrefix, originAuth: hasOriginAccessCredentials(env) ? "configured" : "missing", version: "2026-09" }), {
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
      if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405, headers: { ...OWN_HEADERS, allow: "GET, HEAD, POST", "cache-control": "no-store" } });
      }
      // Fail closed: the origin only accepts requests carrying this Worker's
      // Access service token. Without both secrets the request would be
      // rejected at Access anyway, so it is never sent.
      if (!hasOriginAccessCredentials(env)) {
        return new Response("API origin credentials not configured", { status: 502, headers: { ...OWN_HEADERS, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
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
