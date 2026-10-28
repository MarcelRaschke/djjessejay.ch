// Headers the wdjjj Worker forwards to the Express origin on /api requests.
//
// The origin's rate limiter trusts x-forwarded-for only when TRUST_FORWARDED_FOR=1,
// and the origin is reachable only with the Access service token. Both rely on the
// Worker writing these headers itself, so a client must not be able to set them.

import assert from "node:assert/strict";
import { test } from "node:test";

const { default: worker } = await import("../infra/cloudflare/wdjjj.js");

async function headersSentToOrigin(clientHeaders, env = {}) {
  let sent;
  const original = globalThis.fetch;
  globalThis.fetch = async (_target, init) => {
    sent = new Headers(init.headers);
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const request = new Request("https://djjessejay.ch/api/health", { method: "GET", headers: clientHeaders });
    await worker.fetch(request, { API_ORIGIN_HOST: "origin.djjessejay.ch", ...env }, {});
  } finally {
    globalThis.fetch = original;
  }
  return sent;
}

test("the origin receives the connecting client address, not a client-supplied x-forwarded-for", async () => {
  const sent = await headersSentToOrigin({
    "x-forwarded-for": "1.1.1.1",
    "cf-connecting-ip": "198.51.100.7",
  });

  assert.equal(sent.get("x-forwarded-for"), "198.51.100.7");
});

test("a client-supplied x-forwarded-for is dropped when Cloudflare sent no connecting address", async () => {
  const sent = await headersSentToOrigin({ "x-forwarded-for": "1.1.1.1" });

  assert.equal(sent.get("x-forwarded-for"), null);
});

test("client-supplied cf-access headers never reach the origin", async () => {
  const sent = await headersSentToOrigin({
    "cf-access-client-id": "attacker-id",
    "cf-access-client-secret": "attacker-secret",
  });

  assert.equal(sent.get("cf-access-client-id"), null);
  assert.equal(sent.get("cf-access-client-secret"), null);
});

test("the Worker's Access service token is forwarded when both secrets are configured", async () => {
  const sent = await headersSentToOrigin({}, {
    ORIGIN_ACCESS_CLIENT_ID: "service-token-id",
    ORIGIN_ACCESS_CLIENT_SECRET: "service-token-secret",
  });

  assert.equal(sent.get("cf-access-client-id"), "service-token-id");
  assert.equal(sent.get("cf-access-client-secret"), "service-token-secret");
});

test("no Access headers are sent when only one of the two secrets is configured", async () => {
  const sent = await headersSentToOrigin({}, { ORIGIN_ACCESS_CLIENT_ID: "service-token-id" });

  assert.equal(sent.get("cf-access-client-id"), null);
  assert.equal(sent.get("cf-access-client-secret"), null);
});

test("headers outside the allow-list are dropped, and the origin's host is set", async () => {
  const sent = await headersSentToOrigin({
    "x-internal-debug": "1",
    origin: "https://djjessejay.ch",
  });

  assert.equal(sent.get("x-internal-debug"), null);
  assert.equal(sent.get("origin"), "https://djjessejay.ch");
  assert.equal(sent.get("host"), "origin.djjessejay.ch");
});
