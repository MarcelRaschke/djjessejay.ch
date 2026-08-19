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

const RATE_LIMIT_MAX_REQUESTS = 60;
const RATE_LIMIT_RETRY_AFTER_SECONDS = 60;

function jsonResponse(request, payload, status = 200, extraHeaders = {}) {
  return headAwareResponse(request, JSON.stringify(payload, null, 2), {
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

  return "unknown";
}

async function checkRateLimit(ip, env) {
  const limiter = env.PUBLIC_RATE_LIMITER;
  if (!limiter || typeof limiter.limit !== "function") {
    throw new Error("PUBLIC_RATE_LIMITER binding is unavailable");
  }

  const outcome = await limiter.limit({ key: ip });
  return { limited: !outcome.success };
}

function rateLimitHeaders() {
  return {
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
  };
}

async function constantTimeStringEqual(provided, expected) {
  const encoder = new TextEncoder();
  const [providedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);

  const providedBytes = new Uint8Array(providedDigest);
  const expectedBytes = new Uint8Array(expectedDigest);

  if (typeof crypto.subtle.timingSafeEqual === "function") {
    return crypto.subtle.timingSafeEqual(providedBytes, expectedBytes);
  }

  let difference = 0;
  for (let index = 0; index < providedBytes.length; index += 1) {
    difference |= providedBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

async function checkHealthAuth(request, env) {
  const expected = typeof env.HEALTH_AUTH_TOKEN === "string"
    ? env.HEALTH_AUTH_TOKEN.trim()
    : "";

  if (!expected) {
    return { ok: true };
  }

  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const provided = match ? match[1].trim() : "";

  return { ok: await constantTimeStringEqual(provided, expected) };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const publicKey = configuredPublicKey(env);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse(
        request,
        { error: "method_not_allowed", requestId },
        405,
        { Allow: "GET, HEAD" },
      );
    }

    const ip = clientIp(request);
    let rateState;
    try {
      rateState = await checkRateLimit(ip, env);
    } catch (error) {
      console.error(JSON.stringify({
        event: "rate_limiter_unavailable",
        requestId,
        message: error instanceof Error ? error.message : "unknown_error",
      }));
      return jsonResponse(
        request,
        { error: "service_unavailable", requestId },
        503,
        { "Retry-After": "1" },
      );
    }

    if (rateState.limited) {
      return jsonResponse(
        request,
        {
          error: "rate_limit_exceeded",
          detail: "Too many requests. Please retry later.",
          requestId,
        },
        429,
        {
          ...rateLimitHeaders(),
          "Retry-After": String(RATE_LIMIT_RETRY_AFTER_SECONDS),
        },
      );
    }

    if (url.pathname === "/health") {
      const auth = await checkHealthAuth(request, env);
      if (!auth.ok) {
        return jsonResponse(
          request,
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
            ...rateLimitHeaders(),
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
            ...rateLimitHeaders(),
            "Cache-Control": "no-store",
            "Content-Type": "application/json; charset=utf-8",
          },
        },
      );
    }

    if (KEY_PATHS.has(url.pathname)) {
      if (!publicKey) {
        return jsonResponse(
          request,
          {
            error: "public_key_not_configured",
            requestId,
          },
          503,
          rateLimitHeaders(),
        );
      }

      return headAwareResponse(request, publicKey, {
        status: 200,
        headers: {
          ...BASE_HEADERS,
          ...rateLimitHeaders(),
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "Content-Disposition": "inline; filename=\"cy8er.djjessejay.ch.asc\"",
          "Content-Type": "application/pgp-keys; charset=utf-8",
          ETag: `W/"${publicKey.length}"`,
        },
      });
    }

    if (url.pathname.startsWith("/.well-known/openpgpkey/")) {
      return jsonResponse(
        request,
        {
          error: "wkd_not_enabled",
          detail: "Enable only after canonical WKD hashing and binary key export are validated.",
          requestId,
        },
        501,
        rateLimitHeaders(),
      );
    }

    return jsonResponse(
      request,
      { error: "not_found", requestId },
      404,
      rateLimitHeaders(),
    );
  },
};
