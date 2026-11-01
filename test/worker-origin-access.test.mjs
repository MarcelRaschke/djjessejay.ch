import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../infra/cloudflare/wdjjj.js', import.meta.url), 'utf8');
const worker = (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
const target = 'https://djjessejay.ch/api/health';
const credentials = {
  API_ORIGIN_HOST: 'origin.djjessejay.ch',
  API_ORIGIN_SCHEME: 'https',
  ORIGIN_ACCESS_CLIENT_ID: 'worker-id',
  ORIGIN_ACCESS_CLIENT_SECRET: 'worker-secret',
};

test('API request fails closed without both Worker Access secrets', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('unexpected'); };
  try {
    for (const omitted of ['ORIGIN_ACCESS_CLIENT_ID', 'ORIGIN_ACCESS_CLIENT_SECRET']) {
      const env = { ...credentials };
      delete env[omitted];
      const response = await worker.fetch(new Request(target), env, {});
      assert.equal(response.status, 502);
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('API request uses only Worker Access credentials and a fixed HTTPS origin', async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async (url, init) => {
    forwarded = { url, init };
    return new Response('{"status":"healthy"}', { headers: { 'content-type': 'application/json' } });
  };
  try {
    const request = new Request(target, { headers: {
      authorization: 'Bearer caller',
      'cf-access-client-id': 'attacker-id',
      'cf-access-client-secret': 'attacker-secret',
      'cf-access-jwt-assertion': 'attacker-jwt',
      'x-forwarded-for': '198.51.100.9',
      cookie: 'session=attacker',
    } });
    const response = await worker.fetch(request, credentials, {});
    assert.equal(response.status, 200);
    assert.equal(forwarded.url, 'https://origin.djjessejay.ch/api/health');
    assert.equal(forwarded.init.redirect, 'manual');
    assert.equal(forwarded.init.headers.get('cf-access-client-id'), 'worker-id');
    assert.equal(forwarded.init.headers.get('cf-access-client-secret'), 'worker-secret');
    assert.equal(forwarded.init.headers.get('cf-access-jwt-assertion'), null);
    assert.equal(forwarded.init.headers.get('x-forwarded-for'), null);
    assert.equal(forwarded.init.headers.get('cookie'), null);
    assert.equal(forwarded.init.headers.get('authorization'), 'Bearer caller');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Worker never sends Access credentials to another host or over HTTP', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('unexpected'); };
  try {
    for (const change of [{ API_ORIGIN_HOST: 'example.org' }, { API_ORIGIN_SCHEME: 'http' }]) {
      const response = await worker.fetch(new Request(target), { ...credentials, ...change }, {});
      assert.equal(response.status, 502);
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
