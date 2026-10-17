#!/usr/bin/env bash
set -euo pipefail
echo "==> [1/8] Erstelle Verzeichnisstruktur..."
mkdir -p .github/workflows public/evidence public/media src tests

echo "==> [2/8] Schreibe wrangler.toml & package.json..."
cat <<'INNER_EOF' > wrangler.toml
name = "djjessejay-edge-control"
main = "src/index.ts"
compatibility_date = "2026-10-01"
workers_dev = false

[assets]
directory = "./public"
binding = "ASSETS"

[[routes]]
pattern = "djjessejay.ch/*"
zone_name = "djjessejay.ch"

[vars]
ENVIRONMENT = "production"
INNER_EOF

cat <<'INNER_EOF' > package.json
{
  "name": "djjessejay-edge-control",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/worker.test.mjs",
    "test:py": "python3 -m unittest tests/test_workflows.py -v",
    "verify": "npm test && npm run test:py",
    "deploy": "wrangler deploy --minify"
  },
  "devDependencies": {
    "wrangler": "^3.80.0"
  }
}
INNER_EOF

echo "==> [3/8] Schreibe Cloudflare Worker..."
cat <<'INNER_EOF' > src/index.js
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob: https://lh3.googleusercontent.com https://video-downloads.googleusercontent.com https://*.googlevideo.com; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aBytes = enc.encode(String(a ?? ''));
  const bBytes = enc.encode(String(b ?? ''));
  if (aBytes.byteLength !== bBytes.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.byteLength; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function verifyZeroTrustOrigin(request, env) {
  const expectedOriginSecret = env?.ORIGIN_VERIFY_HEADER ?? '';
  const expectedClientId = env?.CF_ACCESS_CLIENT_ID ?? '';
  const expectedClientSecret = env?.CF_ACCESS_CLIENT_SECRET ?? '';
  if (!expectedOriginSecret || !expectedClientId || !expectedClientSecret) return false;
  const providedOrigin = request.headers.get('X-Origin-Verify') ?? '';
  const providedId = request.headers.get('CF-Access-Client-Id') ?? '';
  const providedSecret = request.headers.get('CF-Access-Client-Secret') ?? '';
  return timingSafeEqual(providedOrigin, expectedOriginSecret) && timingSafeEqual(providedId, expectedClientId) && timingSafeEqual(providedSecret, expectedClientSecret);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return withSecurityHeaders(new Response(JSON.stringify({ status: 'ok', service: 'djjessejay-edge-control', commit: '2ff405c', timestamp: new Date().toISOString() }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }));
    }
    if (url.pathname.startsWith('/api/internal/')) {
      if (!verifyZeroTrustOrigin(request, env)) {
        return withSecurityHeaders(new Response(JSON.stringify({ error: 'Forbidden · Zero-Trust Origin Verification failed' }), { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }));
      }
      return withSecurityHeaders(new Response(JSON.stringify({ status: 'verified', origin: 'protected' }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }));
    }
    if (env?.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      return withSecurityHeaders(assetRes);
    }
    return withSecurityHeaders(new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
  }
};
INNER_EOF
cp src/index.js src/index.ts

echo "==> [4/8] Schreibe Test-Suites..."
cat <<'INNER_EOF' > tests/worker.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
const MOCK_ENV = { ORIGIN_VERIFY_HEADER: 'sec-token', CF_ACCESS_CLIENT_ID: 'id', CF_ACCESS_CLIENT_SECRET: 'secret' };
test('GET /health returns 200', async () => {
  const res = await worker.fetch(new Request('https://djjessejay.ch/health'), MOCK_ENV);
  assert.equal(res.status, 200);
});
INNER_EOF

cat <<'INNER_EOF' > tests/test_workflows.py
import pathlib
import unittest
ROOT = pathlib.Path(__file__).resolve().parents[1]
class TestWorkflow(unittest.TestCase):
    def test_wrangler(self):
        self.assertTrue((ROOT / "wrangler.toml").is_file())
if __name__ == "__main__":
    unittest.main()
INNER_EOF

echo "==> [5/8] Führe Tests aus..."
node --test tests/worker.test.mjs
python3 -m unittest tests/test_workflows.py -v
echo "==> Fertig! Datei setup-recovery.sh ist jetzt da und ausgeführt."
