// Contract tests for the wdjjj Worker's /api path under the Cloudflare Tunnel
// origin-protection model (ORIGIN-PROTECTION-DEPLOYMENT.md).
//
// The origin `origin.djjessejay.ch` is a proxied CNAME to the tunnel and is
// protected by an Access application whose only policy is a non_identity rule
// for this Worker's service token. These tests pin the Worker side of that
// contract: it must present the service token, it must never let a client
// present one, and it must not send a request it knows Access will reject.

import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import worker from "../infra/cloudflare/wdjjj.js";

const BASE_ENV = {
  ORIGIN_HOST: "marcelraschke.github.io",
  ORIGIN_PREFIX: "/djjessejay.ch",
  API_ORIGIN_HOST: "origin.djjessejay.ch",
  API_ORIGIN_SCHEME: "https",
  ORIGIN_ACCESS_CLIENT_ID: "test-client-id.access",
  ORIGIN_ACCESS_CLIENT_SECRET: "test-client-secret",
};

const realFetch = globalThis.fetch;
let captured = [];

beforeEach(() => {
  captured = [];
  globalThis.fetch = async (input, init = {}) => {
    captured.push({ url: String(input), init });
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
});

after(() => {
  globalThis.fetch = realFetch;
});

const ctx = { waitUntil() {} };

function apiRequest(headers = {}, { method = "GET", path = "/api/health" } = {}) {
  return new Request(`https://djjessejay.ch${path}`, { method, headers });
}

function sentHeader(name) {
  assert.equal(captured.length, 1, "expected exactly one upstream request");
  return captured[0].init.headers.get(name);
}

test("presents the Access service token on API subrequests", async () => {
  const response = await worker.fetch(apiRequest(), { ...BASE_ENV }, ctx);

  assert.equal(response.status, 200);
  assert.equal(captured[0].url, "https://origin.djjessejay.ch/api/health");
  assert.equal(sentHeader("cf-access-client-id"), BASE_ENV.ORIGIN_ACCESS_CLIENT_ID);
  assert.equal(sentHeader("cf-access-client-secret"), BASE_ENV.ORIGIN_ACCESS_CLIENT_SECRET);
});

test("never follows redirects while carrying the service token", async () => {
  await worker.fetch(apiRequest(), { ...BASE_ENV }, ctx);

  assert.equal(captured[0].init.redirect, "manual");
});

test("refuses client-supplied Access credentials and replaces them", async () => {
  await worker.fetch(
    apiRequest({
      "cf-access-client-id": "attacker-id",
      "cf-access-client-secret": "attacker-secret",
      "cf-access-jwt-assertion": "attacker-jwt",
    }),
    { ...BASE_ENV },
    ctx,
  );

  assert.equal(sentHeader("cf-access-client-id"), BASE_ENV.ORIGIN_ACCESS_CLIENT_ID);
  assert.equal(sentHeader("cf-access-client-secret"), BASE_ENV.ORIGIN_ACCESS_CLIENT_SECRET);
  assert.equal(sentHeader("cf-access-jwt-assertion"), null);
});

test("drops cookies and other non-allow-listed client headers", async () => {
  await worker.fetch(
    apiRequest({
      cookie: "session=secret",
      "x-real-ip": "203.0.113.9",
      "cf-ray": "forged",
      "x-custom-smuggled": "1",
    }),
    { ...BASE_ENV },
    ctx,
  );

  assert.equal(sentHeader("cookie"), null);
  assert.equal(sentHeader("x-real-ip"), null);
  assert.equal(sentHeader("cf-ray"), null);
  assert.equal(sentHeader("x-custom-smuggled"), null);
});

test("forwards the headers the Express backend actually reads", async () => {
  await worker.fetch(
    apiRequest(
      {
        accept: "application/json",
        "accept-language": "de-CH",
        "content-encoding": "gzip",
        "content-type": "application/json",
        origin: "https://djjessejay.ch",
        referer: "https://djjessejay.ch/kontakt",
        "user-agent": "Mozilla/5.0 (test)",
        "x-honeypot-token": "monitor-token",
      },
      { method: "POST", path: "/api/contact" },
    ),
    { ...BASE_ENV },
    ctx,
  );

  assert.equal(sentHeader("accept"), "application/json");
  assert.equal(sentHeader("accept-language"), "de-CH");
  // express.json/urlencoded inflate compressed bodies only when this survives.
  assert.equal(sentHeader("content-encoding"), "gzip");
  assert.equal(sentHeader("content-type"), "application/json");
  assert.equal(sentHeader("origin"), "https://djjessejay.ch");
  assert.equal(sentHeader("referer"), "https://djjessejay.ch/kontakt");
  assert.equal(sentHeader("user-agent"), "Mozilla/5.0 (test)");
  assert.equal(sentHeader("x-honeypot-token"), "monitor-token");
});

test("derives x-forwarded-for from cf-connecting-ip and ignores a spoofed one", async () => {
  await worker.fetch(
    apiRequest({
      "cf-connecting-ip": "198.51.100.7",
      "x-forwarded-for": "10.0.0.1",
    }),
    { ...BASE_ENV },
    ctx,
  );

  assert.equal(sentHeader("x-forwarded-for"), "198.51.100.7");
  assert.equal(sentHeader("x-forwarded-proto"), "https");
});

test("never relays upstream Set-Cookie headers to the API caller", async () => {
  // Access can answer a service-token request with a CF_Authorization cookie
  // for the Worker's service identity; a public caller must never receive it.
  globalThis.fetch = async (input, init = {}) => {
    captured.push({ url: String(input), init });
    return new Response("{}", {
      status: 200,
      headers: [
        ["content-type", "application/json"],
        ["set-cookie", "CF_Authorization=service-identity-jwt; Path=/; HttpOnly; Secure"],
        ["set-cookie", "__cflb=sticky; Path=/"],
      ],
    });
  };

  const response = await worker.fetch(apiRequest(), { ...BASE_ENV }, ctx);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.deepEqual(response.headers.getSetCookie(), []);
});

test("fails closed when both Access secrets are missing", async () => {
  const env = { ...BASE_ENV };
  delete env.ORIGIN_ACCESS_CLIENT_ID;
  delete env.ORIGIN_ACCESS_CLIENT_SECRET;

  const response = await worker.fetch(apiRequest(), env, ctx);

  assert.equal(response.status, 502);
  assert.equal(captured.length, 0, "no request may reach the origin without the service token");
});

test("fails closed when the Access configuration is incomplete", async () => {
  for (const missing of ["ORIGIN_ACCESS_CLIENT_ID", "ORIGIN_ACCESS_CLIENT_SECRET"]) {
    captured = [];
    const env = { ...BASE_ENV };
    delete env[missing];

    const response = await worker.fetch(apiRequest(), env, ctx);

    assert.equal(response.status, 502, `missing ${missing} must fail closed`);
    assert.equal(captured.length, 0);
  }
});

test("rejects unsupported methods before any credential handling", async () => {
  const response = await worker.fetch(apiRequest({}, { method: "DELETE" }), { ...BASE_ENV }, ctx);

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD, POST");
  assert.equal(captured.length, 0);
});

test("still reports a missing API origin host as 502", async () => {
  const env = { ...BASE_ENV };
  delete env.API_ORIGIN_HOST;

  const response = await worker.fetch(apiRequest(), env, ctx);

  assert.equal(response.status, 502);
  assert.equal(captured.length, 0);
});

test("health endpoint reports the Access binding state without leaking it", async () => {
  const healthRequest = () => new Request("https://djjessejay.ch/__wdjjj/health");

  const configured = await worker.fetch(healthRequest(), { ...BASE_ENV }, ctx);
  const configuredBody = await configured.json();
  assert.equal(configuredBody.ok, true);
  assert.equal(configuredBody.originAuth, "configured");

  const env = { ...BASE_ENV };
  delete env.ORIGIN_ACCESS_CLIENT_SECRET;
  const missing = await worker.fetch(healthRequest(), env, ctx);
  const missingBody = await missing.json();
  assert.equal(missingBody.originAuth, "missing");

  const serialized = JSON.stringify(configuredBody);
  assert.ok(!serialized.includes(BASE_ENV.ORIGIN_ACCESS_CLIENT_ID));
  assert.ok(!serialized.includes(BASE_ENV.ORIGIN_ACCESS_CLIENT_SECRET));
});
