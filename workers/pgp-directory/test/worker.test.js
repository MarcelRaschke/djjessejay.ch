import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const envWithoutKey = { DEPLOYMENT_ENV: "test" };
const envWithKey = {
  DEPLOYMENT_ENV: "test",
  PUBLIC_PGP_KEY: "-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: test\n\nZmFrZQ==\n-----END PGP PUBLIC KEY BLOCK-----",
};

test("health endpoint reports configuration state", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/health"),
    envWithoutKey,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
  assert.equal(body.keyConfigured, false);
});

test("root remains unavailable until a public key is configured", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/"),
    envWithoutKey,
  );
  assert.equal(response.status, 503);
});

test("public key endpoint serves the configured key", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/cy8er.djjessejay.ch.asc"),
    envWithKey,
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/pgp-keys/);
  assert.match(await response.text(), /BEGIN PGP PUBLIC KEY BLOCK/);
});

test("HEAD requests do not return a body", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/pgp.txt", { method: "HEAD" }),
    envWithKey,
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
});

test("unsafe methods are rejected", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/pgp.txt", { method: "POST" }),
    envWithKey,
  );
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
});

test("WKD remains explicitly disabled", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/.well-known/openpgpkey/hu/example"),
    envWithKey,
  );
  assert.equal(response.status, 501);
});
