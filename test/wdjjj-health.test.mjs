import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// /__wdjjj/health: version comes from the version_metadata binding, origin details stay private.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let worker, dir;
const realFetch = globalThis.fetch;
let fetched = 0;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'wdjjj-health-'));
  const file = join(dir, 'wdjjj.mjs');
  writeFileSync(file, readFileSync(join(root, 'infra/cloudflare/wdjjj.js'), 'utf8'));
  worker = (await import(pathToFileURL(file).href)).default;
  globalThis.fetch = async () => { fetched++; return new Response('unexpected', { status: 500 }); };
});
after(() => { globalThis.fetch = realFetch; rmSync(dir, { recursive: true, force: true }); });

const health = (env) => worker.fetch(new Request('https://djjessejay.ch/__wdjjj/health'), env, { waitUntil() {} });

test('health reports the deployed version from CF_VERSION_METADATA', async () => {
  fetched = 0;
  const meta = { id: '0e2d4f6a-1111-2222-3333-444455556666', tag: 'v42', timestamp: '2026-11-12T20:40:00.000Z' };
  const res = await health({ CF_VERSION_METADATA: meta });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.proxy, 'wdjjj');
  assert.deepEqual(body.version, meta);
  assert.equal(fetched, 0, 'health must not contact the origin');
});

test('health does not reveal origin host or prefix', async () => {
  const res = await health({ ORIGIN_HOST: 'marcelraschke.github.io', ORIGIN_PREFIX: '/djjessejay.ch' });
  const text = await res.text();
  assert.doesNotMatch(text, /marcelraschke|github\.io|originPrefix|"origin"/);
});

test('health stays green without the binding and says the version is unknown', async () => {
  const body = await (await health({})).json();
  assert.equal(body.ok, true);
  assert.equal(body.proxy, 'wdjjj');
  assert.equal(body.version, 'unknown');
});

test('wrangler.toml declares the version_metadata binding', () => {
  const toml = readFileSync(join(root, 'infra/cloudflare/wrangler.toml'), 'utf8');
  assert.match(toml, /\[version_metadata\]\s*\nbinding = "CF_VERSION_METADATA"/);
});
