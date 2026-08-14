const KEY_PATHS = new Set([
  "/pgp.txt",
  "/cy8er.djjessejay.ch.asc",
]);

const BASE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Permissions-Policy":
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;

const rateBuckets = new Map();

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      ...BASE_HEADERS,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function configuredPublicKey(env) {
  const value = typeof env.PUBLIC_PGP_KEY === "string"
    ? env.PUBLIC_PGP_KEY.trim()
    : "";

  if (!value.includes("-----BEGIN PGP PUBLIC KEY BLOCK-----")) {
    return null;
  }

  return `${value}\n`;
}

function headAwareResponse(request, body, init) {
  return new Response(request.method === "HEAD" ? null : body, init);
}

function clientIp(request) {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  return "unknown";
}

function checkRateLimit(ip, now = Date.now()) {
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  const reset = Math.floor((windowStart + RATE_LIMIT_WINDOW_MS) / 1000);
  const key = `${ip}:${windowStart}`;

  for (const bucketKey of rateBuckets.keys()) {
    const separator = bucketKey.lastIndexOf(":");
    const bucketIp = bucketKey.slice(0, separator);
    const bucketWindow = Number(bucketKey.slice(separator + 1));
    if (bucketIp === ip && bucketWindow + RATE_LIMIT_WINDOW_MS <= now) {
      rateBuckets.delete(bucketKey);
    }
  }

  const current = rateBuckets.get(key) || 0;

  if (current >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      limited: true,
      remaining: 0,
      limit: RATE_LIMIT_MAX_REQUESTS,
      reset,
      retryAfter: Math.max(1, reset - Math.floor(now / 1000)),
    };
  }

  rateBuckets.set(key, current + 1);

  return {
    limited: false,
    remaining: RATE_LIMIT_MAX_REQUESTS - current - 1,
    limit: RATE_LIMIT_MAX_REQUESTS,
    reset,
  };
}

function rateLimitHeaders(state) {
  return {
    "X-RateLimit-Limit": String(state.limit),
    "X-RateLimit-Remaining": String(state.remaining),
    "X-RateLimit-Reset": String(state.reset),
  };
}

function checkHealthAuth(request, env) {
  const expected = typeof env.HEALTH_AUTH_TOKEN === "string"
    ? env.HEALTH_AUTH_TOKEN.trim()
    : "";

  if (!expected) {
    return { ok: true };
  }

  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const provided = match ? match[1].trim() : "";

  if (provided.length !== expected.length) {
    return { ok: false };
  }

  return { ok: provided === expected };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const publicKey = configuredPublicKey(env);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse(
        { error: "method_not_allowed", requestId },
        405,
        { Allow: "GET, HEAD" },
      );
    }

    const ip = clientIp(request);
    const rateState = checkRateLimit(ip);

    if (rateState.limited) {
      return jsonResponse(
        {
          error: "rate_limit_exceeded",
          detail: "Too many requests. Please retry later.",
          requestId,
        },
        429,
        {
          ...rateLimitHeaders(rateState),
          "Retry-After": String(rateState.retryAfter),
        },
      );
    }

    if (url.pathname === "/health") {
      const auth = checkHealthAuth(request, env);
      if (!auth.ok) {
        return jsonResponse(
          { error: "unauthorized", requestId },
          401,
          { "WWW-Authenticate": "Bearer" },
        );
      }

      return headAwareResponse(
        request,
        JSON.stringify({
          status: "ok",
          service: "cy8er-pgp-directory",
          environment: env.DEPLOYMENT_ENV || "unknown",
          keyConfigured: Boolean(publicKey),
          requestId,
        }, null, 2),
        {
          status: 200,
          headers: {
            ...BASE_HEADERS,
            ...rateLimitHeaders(rateState),
            "Cache-Control": "no-store",
            "Content-Type": "application/json; charset=utf-8",
          },
        },
      );
    }

    if (url.pathname === "/") {
      return headAwareResponse(
        request,
        JSON.stringify({
          service: "cy8er-pgp-directory",
          status: publicKey ? "ready" : "configuration_required",
          endpoints: ["/health", ...KEY_PATHS],
          requestId,
        }, null, 2),
        {
          status: publicKey ? 200 : 503,
          headers: {
            ...BASE_HEADERS,
            ...rateLimitHeaders(rateState),
            "Cache-Control": "no-store",
            "Content-Type": "application/json; charset=utf-8",
          },
        },
      );
    }

    if (KEY_PATHS.has(url.pathname)) {
      if (!publicKey) {
        return jsonResponse({
          error: "public_key_not_configured",
          requestId,
        }, 503, rateLimitHeaders(rateState));
      }

      return headAwareResponse(request, publicKey, {
        status: 200,
        headers: {
          ...BASE_HEADERS,
          ...rateLimitHeaders(rateState),
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "Content-Disposition": "inline; filename=\"cy8er.djjessejay.ch.asc\"",
          "Content-Type": "application/pgp-keys; charset=utf-8",
          ETag: `W/"${publicKey.length}"`,
        },
      });
    }

    if (url.pathname.startsWith("/.well-known/openpgpkey/")) {
      return jsonResponse({
        error: "wkd_not_enabled",
        detail: "Enable only after canonical WKD hashing and binary key export are validated.",
        requestId,
      }, 501, rateLimitHeaders(rateState));
    }

    return jsonResponse(
      { error: "not_found", requestId },
      404,
      rateLimitHeaders(rateState),
    );
  },
};
