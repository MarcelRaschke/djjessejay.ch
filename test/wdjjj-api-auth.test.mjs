import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// wdjjj.js is an ES module for the Workers runtime; load a copy as .mjs for Node.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let worker, dir;
const realFetch = globalThis.fetch;
let seen = [];
const defaultResponse = () => new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
let respond = defaultResponse;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'wdjjj-'));
  const file = join(dir, 'wdjjj.mjs');
  writeFileSync(file, readFileSync(join(root, 'infra/cloudflare/wdjjj.js'), 'utf8'));
  worker = (await import(pathToFileURL(file).href)).default;
  globalThis.fetch = async (url, init) => { seen.push({ url, headers: new Headers(init.headers) }); return respond(); };
});
after(() => { globalThis.fetch = realFetch; rmSync(dir, { recursive: true, force: true }); });

const ENV = { API_ORIGIN_HOST: 'origin.djjessejay.ch', ORIGIN_ACCESS_CLIENT_ID: 'id.access', ORIGIN_ACCESS_CLIENT_SECRET: 's3cret' };

test('API requests carry the Worker service token and drop client-supplied Access headers', async () => {
  seen = [];
  const req = new Request('https://djjessejay.ch/api/health', { headers: { 'cf-access-client-id': 'evil', 'cf-access-client-secret': 'evil', 'cf-access-jwt-assertion': 'forged' } });
  const res = await worker.fetch(req, ENV, {});
  assert.equal(res.status, 200);
  assert.equal(seen.length, 1);
  assert.equal(new URL(seen[0].url).hostname, 'origin.djjessejay.ch');
  assert.equal(seen[0].headers.get('cf-access-client-id'), 'id.access');
  assert.equal(seen[0].headers.get('cf-access-client-secret'), 's3cret');
  assert.equal(seen[0].headers.get('cf-access-jwt-assertion'), null);
});

test('missing service token fails closed without contacting the origin', async () => {
  seen = [];
  for (const env of [{ API_ORIGIN_HOST: 'origin.djjessejay.ch' }, { ...ENV, ORIGIN_ACCESS_CLIENT_SECRET: '' }]) {
    const res = await worker.fetch(new Request('https://djjessejay.ch/api/health'), env, {});
    assert.equal(res.status, 502);
    assert.match(await res.text(), /credentials not configured/);
  }
  assert.equal(seen.length, 0);
});

test('missing API origin still answers 502 before the credential check', async () => {
  const res = await worker.fetch(new Request('https://djjessejay.ch/api/health'), {}, {});
  assert.equal(res.status, 502);
  assert.match(await res.text(), /API origin not configured/);
});

test('Access session cookies from the origin never reach the browser', async () => {
  const h = new Headers({ 'content-type': 'application/json' });
  h.append('set-cookie', 'CF_Authorization=eyJ.jwt; Path=/; Secure; HttpOnly');
  h.append('set-cookie', 'CF_AppSession=abc; Path=/; Secure');
  h.append('set-cookie', 'sid=1; Path=/api; Secure; HttpOnly');
  h.append('set-cookie', 'pref=dark; Path=/');
  respond = () => new Response('{}', { status: 200, headers: h });
  try {
    const res = await worker.fetch(new Request('https://djjessejay.ch/api/health'), ENV, {});
    const cookies = res.headers.getSetCookie();
    assert.deepEqual(cookies, ['sid=1; Path=/api; Secure; HttpOnly', 'pref=dark; Path=/']);
    assert.equal(cookies.some((c) => /^CF_/i.test(c)), false);
  } finally {
    respond = defaultResponse;
  }
});

test('a non-https API origin scheme is refused before the token is attached', async () => {
  seen = [];
  const res = await worker.fetch(new Request('https://djjessejay.ch/api/health'), { ...ENV, API_ORIGIN_SCHEME: 'http' }, {});
  assert.equal(res.status, 502);
  assert.match(await res.text(), /must use https/);
  assert.equal(seen.length, 0);
});

test('the service token only goes to a subdomain of the own zone', async () => {
  for (const host of ['evil.example', 'origin.djjessejay.ch.evil.example', 'djjessejay.ch', 'www.djjessejay.ch', 'user@origin.djjessejay.ch', 'origin.djjessejay.ch/x', 'origin.djjessejay.ch:8443', '']) {
    seen = [];
    const res = await worker.fetch(new Request('https://djjessejay.ch/api/health'), { ...ENV, API_ORIGIN_HOST: host }, {});
    assert.equal(res.status, 502, host);
    assert.equal(seen.length, 0, host);
  }
  seen = [];
  const ok = await worker.fetch(new Request('https://djjessejay.ch/api/health'), { ...ENV, API_ORIGIN_HOST: 'api.djjessejay.ch' }, {});
  assert.equal(ok.status, 200);
  assert.equal(new URL(seen[0].url).hostname, 'api.djjessejay.ch');
});

test('API_ORIGIN_PORT cannot redirect the token to another host', async () => {
  seen = [];
  const res = await worker.fetch(new Request('https://djjessejay.ch/api/health?x=1'), { ...ENV, API_ORIGIN_PORT: '443@attacker.example' }, {});
  assert.equal(res.status, 200);
  assert.equal(seen.length, 1);
  const u = new URL(seen[0].url);
  assert.equal(u.hostname, 'origin.djjessejay.ch');
  assert.equal(u.port, '');
  assert.equal(u.search, '?x=1');
});
