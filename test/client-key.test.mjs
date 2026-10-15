// Rate-limit identity behind the Cloudflare Tunnel.
//
// The threat these tests pin down: with cloudflared in front, every request
// reaches Express from the loopback address, so a key derived from the socket
// address turns a per-client limit into one global counter. The usable value is
// the leftmost x-forwarded-for entry, which the wdjjj Worker writes from
// cf-connecting-ip after dropping whatever the client sent.

import assert from "node:assert/strict";
import { test } from "node:test";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { clientAddressFromHeaders, createClientKeyGenerator, normalizeAddress } = require("../src/client-key.js");

const key = createClientKeyGenerator();

test("takes the address the Worker wrote, not the hop that appended last", () => {
  const headers = { "x-forwarded-for": "198.51.100.7, 162.158.0.1, 127.0.0.1" };

  assert.equal(clientAddressFromHeaders(headers), "198.51.100.7");
  assert.equal(key({ headers, ip: "127.0.0.1" }), "198.51.100.7");
});

test("two clients behind the same tunnel get different buckets", () => {
  const first = key({ headers: { "x-forwarded-for": "198.51.100.7, 127.0.0.1" }, ip: "127.0.0.1" });
  const second = key({ headers: { "x-forwarded-for": "203.0.113.9, 127.0.0.1" }, ip: "127.0.0.1" });

  assert.notEqual(first, second);
});

test("falls back to the socket address when no forwarded header is present", () => {
  assert.equal(key({ headers: {}, ip: "198.51.100.7" }), "198.51.100.7");
  assert.equal(key({ headers: {}, ip: "127.0.0.1" }), "127.0.0.1");
});

test("never returns an empty key", () => {
  assert.equal(key({ headers: {}, ip: undefined }), "unknown");
  assert.equal(key({ headers: { "x-forwarded-for": "   " }, ip: "" }), "unknown");
  assert.equal(key({}), "unknown");
});

test("rejects a forwarded value that is not an address", () => {
  for (const value of ["not-an-ip", "<script>", "999.1.1.1", "10.0.0", "', 1); DROP"]) {
    assert.equal(clientAddressFromHeaders({ "x-forwarded-for": value }), "", value);
    assert.equal(key({ headers: { "x-forwarded-for": value }, ip: "198.51.100.7" }), "198.51.100.7", value);
  }
});

test("strips ports and brackets so one client cannot occupy many buckets", () => {
  assert.equal(normalizeAddress("198.51.100.7:51514"), "198.51.100.7");
  assert.equal(normalizeAddress("[2001:db8::1]:443"), "2001:db8::1");
  assert.equal(normalizeAddress("2001:DB8::1"), "2001:db8::1");
  assert.equal(
    key({ headers: { "x-forwarded-for": "198.51.100.7:51514" } }),
    key({ headers: { "x-forwarded-for": "198.51.100.7:51515" } }),
  );
});

test("hands IPv6 to the normalizer so a client cannot walk its own prefix", () => {
  const seen = [];
  const subnetKey = createClientKeyGenerator((ip) => {
    seen.push(ip);
    return ip.startsWith("2001:db8:") ? "2001:db8::/64" : ip;
  });

  const first = subnetKey({ headers: { "x-forwarded-for": "2001:db8::1" } });
  const second = subnetKey({ headers: { "x-forwarded-for": "2001:db8::2" } });

  assert.deepEqual(seen, ["2001:db8::1", "2001:db8::2"]);
  assert.equal(first, second);
});

test("works without a normalizer, as when the dependency does not export one", () => {
  const plain = createClientKeyGenerator(undefined);

  assert.equal(plain({ headers: { "x-forwarded-for": "198.51.100.7" } }), "198.51.100.7");
});

test("accepts a repeated header array as Node delivers it", () => {
  assert.equal(clientAddressFromHeaders({ "x-forwarded-for": ["198.51.100.7, 127.0.0.1", "203.0.113.9"] }), "198.51.100.7");
});
