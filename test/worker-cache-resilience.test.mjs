import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../infra/cloudflare/wdjjj.js', import.meta.url), 'utf8');
const worker = (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;

async function exercise(t, { cache, upstream = 200, request = '/', method = 'GET', range, ctxThrows = false }) {
  const originalFetch = globalThis.fetch;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (descriptor) Object.defineProperty(globalThis, 'caches', descriptor);
    else delete globalThis.caches;
  });
  if (cache === 'getter') Object.defineProperty(globalThis, 'caches', { configurable: true, get() { throw Error('unavailable'); } });
  else if (cache === undefined) delete globalThis.caches;
  else Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: cache } });
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (upstream === 'throw') throw Error('origin failed');
    return new Response(method === 'HEAD' ? null : 'origin content', { status: upstream, headers: { 'content-type': 'text/html' } });
  };
  const pending = [];
  const response = await worker.fetch(new Request(`https://djjessejay.ch${request}`, { method, headers: range ? { range } : {} }), {}, { waitUntil(p) { if (ctxThrows) throw Error('context'); pending.push(p); } });
  await Promise.all(pending);
  return { response, calls };
}

for (const [name, cache] of [
  ['absent cache', undefined], ['throwing cache getter', 'getter'],
  ['rejected match', { match: async () => { throw Error('match'); } }],
  ['synchronous put failure', { match: async () => undefined, put() { throw Error('put'); } }],
  ['rejected put', { match: async () => undefined, put: async () => { throw Error('put'); } }],
]) test(`origin remains available with ${name}`, async t => {
  const { response } = await exercise(t, { cache });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'origin content');
  assert.equal(response.headers.get('x-proxy'), 'wdjjj');
  assert.ok(response.headers.get('content-security-policy'));
});
for (const upstream of ['throw', 503]) test(`origin ${upstream} plus failed cache returns controlled error`, async t => {
  const { response } = await exercise(t, { upstream, cache: { match: async () => { throw Error('cache'); } } });
  assert.equal(response.status, upstream === 'throw' ? 504 : 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('cache hit avoids origin', async t => {
  const { response, calls } = await exercise(t, { cache: { match: async () => new Response('cached') } });
  assert.equal(await response.text(), 'cached'); assert.equal(calls, 0);
  assert.equal(response.headers.get('x-proxy-cache'), 'HIT');
});
for (const options of [{ method: 'HEAD' }, { request: '/?q=1' }, { range: 'bytes=0-3' }]) test(`uncacheable request never reads stale cache: ${JSON.stringify(options)}`, async t => {
  let matches = 0;
  const { response } = await exercise(t, { ...options, upstream: 503, cache: { match: async () => { matches++; return new Response('wrong cached body'); } } });
  assert.equal(response.status, 503); assert.equal(matches, 0);
});
test('failed execution context does not discard origin response', async t => {
  const { response } = await exercise(t, { ctxThrows: true, cache: { match: async () => undefined, put: async () => {} } });
  assert.equal(response.status, 200);
});

for (const [label, options, expected] of [
  ['cache miss', { cache: { match: async () => undefined, put: async () => {} } }, 'MISS'],
  ['missing cache', {}, 'BYPASS'],
  ['query', { request: '/?q=1' }, 'BYPASS'],
]) test(`cache status header: ${label}`, async t => {
  const { response } = await exercise(t, options);
  assert.equal(response.headers.get('x-proxy-cache'), expected);
  assert.equal(await response.text(), 'origin content');
});
test('stale fallback replaces stored cache status', async t => {
  let reads = 0;
  const { response } = await exercise(t, { upstream: 503, cache: {
    match: async () => ++reads === 1 ? undefined : new Response('stale content', { headers: { 'x-proxy-cache': 'MISS' } }),
  } });
  assert.equal(response.headers.get('x-proxy-cache'), 'STALE');
  assert.equal(await response.text(), 'stale content');
});
