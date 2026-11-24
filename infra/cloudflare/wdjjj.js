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
// Stale copies live under their own cache key with their own TTL. The Cache API
// honours s-maxage=600 and ignores stale-while-revalidate, so a fallback that
// reads the primary key finds nothing ten minutes after the last fetch.
const STALE_TTL_S = 86400;
// Analytics (/__wdjjj/collect -> D1 event-datamining). Inactive until both the
// DB binding and the HASH_SECRET secret exist; see infra/cloudflare/README.md.
const COLLECT_MAX_BODY = 2048;
const RAW_RETENTION_DAYS = 400;
const EVENT_TYPES = new Set([
  "page_view", "outbound_click", "sc_play", "sc_progress", "bdsn_listen",
  "mix_download", "presskit_download", "booking_submit", "contact_submit", "turnstile_fail",
]);

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

// Origin host and prefix are deliberately not shown, matching /__wdjjj/health.
function errorPage(status, reason) {
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${status} ${reason} — djjessejay.ch</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050b18;color:#e8eef7;font-family:system-ui,sans-serif}main{text-align:center;padding:2rem;max-width:42rem}h1{color:#22d3ee;letter-spacing:.18em;font-size:1rem}p{color:#94a3b8;line-height:1.6}code{color:#cbd5e1}</style></head><body><main><h1>BLUE DIMENSION · ${status}</h1><p>${reason}. Der Edge-Proxy bleibt aktiv. Bitte später erneut versuchen.</p></main></body></html>`;
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

// The only host that may receive the Access service token. The deploy workflow probes
// exactly this host for the Access denial, so it must not be widened silently.
const API_ORIGIN_HOST_ALLOWED = `origin.${CANONICAL_HOST}`;

function isAllowedApiOriginHost(host) {
  return typeof host === "string" && host.toLowerCase() === API_ORIGIN_HOST_ALLOWED;
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
    .catch(() => errorPage(504, "Gateway Timeout"))
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

// Version for /__wdjjj/health, read from the version_metadata binding
// (wrangler.toml) so it follows every deploy instead of a hand-kept string.
// Origin host and prefix are deliberately not reported.
function workerVersion(env) {
  const meta = env && env.CF_VERSION_METADATA;
  if (!meta || !meta.id) return "unknown";
  return { id: meta.id, tag: meta.tag || null, timestamp: meta.timestamp || null };
}

function staleKey(pathname) {
  return new Request(`https://${CANONICAL_HOST}/__wdjjj/stale${pathname}`, { method: "GET" });
}

function asStaleCopy(response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", `public, max-age=${STALE_TTL_S}`);
  return new Response(response.body, { status: response.status, headers });
}

async function serveStale(cache, pathname) {
  const hit = await cache.match(staleKey(pathname));
  if (!hit) return null;
  const headers = new Headers(hit.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-wdjjj-stale", "1");
  return new Response(hit.body, { status: hit.status, headers });
}

/* ---------- Analytics ---------- */

function plain(status, text, extra = {}) {
  return new Response(text, { status, headers: { ...OWN_HEADERS, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...extra } });
}

const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function ulid(now = Date.now()) {
  let time = "";
  let t = now;
  for (let i = 0; i < 10; i++) { time = ULID_ALPHABET[t % 32] + time; t = Math.floor(t / 32); }
  const rnd = crypto.getRandomValues(new Uint8Array(16));
  let rand = "";
  for (let i = 0; i < 16; i++) rand += ULID_ALPHABET[rnd[i] % 32];
  return time + rand;
}

// Daily-rotating pseudonym: HMAC(secret, day|ip|ua), 64 bit. The IP and the
// user agent are never stored, and the same visitor gets a new value each day.
async function visitorHash(secret, day, ip, ua) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${day}|${ip}|${ua}`));
  return [...new Uint8Array(sig).slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function deviceClass(ua) {
  if (!ua) return "unknown";
  if (/bot|crawl|spider|slurp|preview|headless/i.test(ua)) return "bot";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

function clip(v, max) {
  return typeof v === "string" && v.length > 0 ? v.slice(0, max) : null;
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin) return origin === `https://${CANONICAL_HOST}`;
  return request.headers.get("sec-fetch-site") === "same-origin";
}

async function handleCollect(request, env, ctx) {
  if (request.method !== "POST") return plain(405, "Method Not Allowed", { allow: "POST" });
  const noContent = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  if (!env || !env.DB || !env.HASH_SECRET) return noContent();
  if (!sameOrigin(request)) return plain(403, "Forbidden");
  if (request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1") return noContent();

  const raw = await request.text();
  if (raw.length > COLLECT_MAX_BODY) return plain(413, "Payload Too Large");
  let body;
  try { body = JSON.parse(raw); } catch { return plain(400, "Bad Request"); }
  if (!body || typeof body !== "object" || !EVENT_TYPES.has(body.type)) return plain(400, "Unknown event type");

  const ua = request.headers.get("user-agent") || "";
  const device = deviceClass(ua);
  if (device === "bot") return noContent();

  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const vh = await visitorHash(env.HASH_SECRET, day, request.headers.get("cf-connecting-ip") || "", ua);

  let path = typeof body.path === "string" ? body.path.split("?")[0].split("#")[0] : "/";
  if (!path.startsWith("/")) path = "/";
  let refHost = null;
  try {
    if (typeof body.ref === "string" && body.ref) {
      const h = new URL(body.ref).hostname;
      if (h && h !== CANONICAL_HOST && h !== `www.${CANONICAL_HOST}`) refHost = h.slice(0, 253);
    }
  } catch { /* invalid referrer is dropped */ }

  let props = null;
  if (body.props && typeof body.props === "object") {
    const s = JSON.stringify(body.props);
    if (s.length <= 2048) props = s;
  }
  const valueMs = Number.isInteger(body.value_ms) && body.value_ms >= 0 ? body.value_ms : null;
  const lang = clip((request.headers.get("accept-language") || "").split(",")[0], 8);

  const stmt = env.DB.prepare(
    `INSERT INTO ev (id, ts, type, visitor_hash, session_id, path, ref_host, utm_source, utm_medium, utm_campaign,
                     country, device, lang, media_id, value_ms, props)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13,
             (SELECT media_id FROM media WHERE media_id = ?14), ?15, ?16)`
  ).bind(
    ulid(now), now, body.type, vh, clip(body.sid, 32), path.slice(0, 512), refHost,
    clip(body.utm_source, 64), clip(body.utm_medium, 64), clip(body.utm_campaign, 64),
    clip(request.cf && request.cf.country, 2), device, lang,
    clip(body.media_id, 64), valueMs, props
  );
  ctx.waitUntil(stmt.run().catch((e) => console.error({ msg: "collect insert failed", err: String(e) })));
  return noContent();
}

// Cron: yesterday's daily aggregate, then retention for raw events and bookings.
async function runMaintenance(env) {
  if (!env || !env.DB) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const cutoffMs = Date.now() - RAW_RETENTION_DAYS * 86400000;
  const nowS = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT OR REPLACE INTO ev_daily (day, type, path, country, device, media_id, events, visitors, sessions, sum_value_ms)
       SELECT day, type, path, coalesce(country,''), coalesce(device,''), coalesce(media_id,''),
              count(*), count(DISTINCT visitor_hash), count(DISTINCT session_id), coalesce(sum(value_ms),0)
       FROM ev WHERE day = ?1
       GROUP BY day, type, path, coalesce(country,''), coalesce(device,''), coalesce(media_id,'')`
    ).bind(yesterday),
    env.DB.prepare(`DELETE FROM ev WHERE ts < ?1`).bind(cutoffMs),
    env.DB.prepare(`DELETE FROM booking_request WHERE delete_after < ?1`).bind(nowS),
  ]);
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runMaintenance(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const originHost = (env && env.ORIGIN_HOST) || ORIGIN_HOST_DEFAULT;
    const originPrefix = (env && env.ORIGIN_PREFIX) || ORIGIN_PREFIX_DEFAULT;

    if (url.hostname === `www.${CANONICAL_HOST}`) {
      return Response.redirect(`https://${CANONICAL_HOST}${url.pathname}${url.search}`, 301);
    }

    if (url.pathname === "/__wdjjj/health") {
      return new Response(JSON.stringify({ ok: true, proxy: "wdjjj", version: workerVersion(env) }), {
        status: 200,
        headers: { ...OWN_HEADERS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      });
    }

    if (url.pathname === "/__wdjjj/collect") return handleCollect(request, env, ctx);

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
      // The service token may only go to origin.djjessejay.ch: a mistyped or tampered
      // API_ORIGIN_HOST fails closed.
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
      return (await serveStale(cache, url.pathname)) || errorPage(504, "Gateway Timeout");
    } finally {
      clearTimeout(timer);
    }

    if (upstream.status >= 500) {
      return (await serveStale(cache, url.pathname)) || errorPage(503, "Origin Service Unavailable");
    }

    const response = withSecurityHeaders(upstream, upstream, originHost, originPrefix);
    if (cacheable && upstream.status === 200 && !upstream.headers.has("set-cookie")) {
      ctx.waitUntil(Promise.all([
        cache.put(cacheKey, response.clone()),
        cache.put(staleKey(url.pathname), asStaleCopy(response.clone())),
      ]));
    }
    return response;
  },
};
