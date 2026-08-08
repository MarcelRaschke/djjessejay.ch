const KEY_PATHS = new Set([
  "/pgp.txt",
  "/cy8er.djjessejay.ch.asc",
]);

const BASE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

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

    if (url.pathname === "/health") {
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
        }, 503);
      }

      return headAwareResponse(request, publicKey, {
        status: 200,
        headers: {
          ...BASE_HEADERS,
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "Content-Disposition": "inline; filename=\"cy8er.djjessejay.ch.asc\"",
          "Content-Type": "application/pgp-keys; charset=utf-8",
          ETag: `W/\"${publicKey.length}\"`,
        },
      });
    }

    if (url.pathname.startsWith("/.well-known/openpgpkey/")) {
      return jsonResponse({
        error: "wkd_not_enabled",
        detail: "Enable only after canonical WKD hashing and binary key export are validated.",
        requestId,
      }, 501);
    }

    return jsonResponse({ error: "not_found", requestId }, 404);
  },
};
