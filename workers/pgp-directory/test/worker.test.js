import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const envWithoutKey = { DEPLOYMENT_ENV: "test" };
const envWithKey = {
  DEPLOYMENT_ENV: "test",
  PUBLIC_PGP_KEY: "-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: test\n\nZmFrZQ==\n-----END PGP PUBLIC KEY BLOCK-----",
};
const envWithHealthToken = {
  ...envWithKey,
  HEALTH_AUTH_TOKEN: "test-secret-token",
};

function requestWithIp(url, init, ip = "203.0.113.7") {
  const req = new Request(url, init);
  req.headers.set("cf-connecting-ip", ip);
  return req;
}

test("health endpoint reports configuration state", async () => {
  const response = await worker.fetch(
    requestWithIp("https://example.test/health"),
    envWithoutKey,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
  assert.equal(body.keyConfigured, false);
});

test("root remains unavailable until a public key is configured", async () => {
  const response = await worker.fetch(
    requestWithIp("https://example.test/"),
    envWithoutKey,
  );
  assert.equal(response.status, 503);
});

test("public key endpoint serves the configured key", async () => {
  const response = await worker.fetch(
    requestWithIp("https://example.test/cy8er.djjessejay.ch.asc"),
    envWithKey,
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/pgp-keys/);
  assert.match(await response.text(), /BEGIN PGP PUBLIC KEY BLOCK/);
});

test("HEAD requests do not return a body", async () => {
  const response = await worker.fetch(
    requestWithIp("https://example.test/pgp.txt", { method: "HEAD" }),
    envWithKey,
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
});

test("unsafe methods are rejected", async () => {
  const response = await worker.fetch(
    requestWithIp("https://example.test/pgp.txt", { method: "POST" }),
    envWithKey,
  );
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
});

test("WKD remains explicitly disabled", async () => {
  const response = await worker.fetch(
    requestWithIp("https://example.test/.well-known/openpgpkey/hu/example"),
    envWithKey,
  );
  assert.equal(response.status, 501);
});

test("security headers are present on responses", async () => {
  const response = await worker.fetch(
    requestWithIp("https://example.test/health"),
    envWithoutKey,
  );
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000; includeSubDomains; preload");
  assert.match(response.headers.get("permissions-policy"), /geolocation=\(\)/);
  assert.match(response.headers.get("permissions-policy"), /camera=\(\)/);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

test("rate limit headers are exposed while under the limit", async () => {
  const response = await worker.fetch(
    requestWithIp("https://example.test/health"),
    envWithoutKey,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-ratelimit-limit"), "60");
  const remaining = Number(response.headers.get("x-ratelimit-remaining"));
  assert.ok(remaining >= 0 && remaining < 60, "remaining must be within valid range");
  const reset = Number(response.headers.get("x-ratelimit-reset"));
  assert.ok(reset > 0, "reset must be a positive unix timestamp");
});

test("rate limiting returns 429 once the limit is exceeded", async () => {
  const ip = "198.51.100.42";
  let lastResponse;
  for (let i = 0; i < 61; i += 1) {
    lastResponse = await worker.fetch(
      requestWithIp("https://example.test/health", {}, ip),
      envWithoutKey,
    );
  }
  assert.equal(lastResponse.status, 429);
  const body = await lastResponse.json();
  assert.equal(body.error, "rate_limit_exceeded");
  assert.equal(lastResponse.headers.get("x-ratelimit-remaining"), "0");
  const retryAfter = Number(lastResponse.headers.get("retry-after"));
  assert.ok(retryAfter >= 1, "Retry-After must be at least 1 second");
});

test("rate limiting is independent per client IP", async () => {
  const ipA = "198.51.100.1";
  const ipB = "198.51.100.2";
  for (let i = 0; i < 61; i += 1) {
    await worker.fetch(requestWithIp("https://example.test/health", {}, ipA), envWithoutKey);
  }
  const blocked = await worker.fetch(
    requestWithIp("https://example.test/health", {}, ipA),
    envWithoutKey,
  );
  assert.equal(blocked.status, 429);
  const otherIp = await worker.fetch(
    requestWithIp("https://example.test/health", {}, ipB),
    envWithoutKey,
  );
  assert.equal(otherIp.status, 200);
});

test("health endpoint is public when HEALTH_AUTH_TOKEN is not set", async () => {
  const response = await worker.fetch(
    requestWithIp("https://example.test/health"),
    envWithKey,
  );
  assert.equal(response.status, 200);
});

test("health endpoint rejects requests without a bearer token when configured", async () => {
  const response = await worker.fetch(
    requestWithIp("https://example.test/health"),
    envWithHealthToken,
  );
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("www-authenticate"), "Bearer");
  const body = await response.json();
  assert.equal(body.error, "unauthorized");
});

test("health endpoint accepts a valid bearer token", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/health", {
      headers: {
        "cf-connecting-ip": "203.0.113.9",
        authorization: "Bearer test-secret-token",
      },
    }),
    envWithHealthToken,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
});

test("health endpoint rejects an invalid bearer token", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/health", {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        authorization: "Bearer wrong-token",
      },
    }),
    envWithHealthToken,
  );
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("www-authenticate"), "Bearer");
});
