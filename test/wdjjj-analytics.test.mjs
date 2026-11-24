import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

// WDJJJ-ANALYTICS: /__wdjjj/collect, cron maintenance and the stale-cache fallback.
// wdjjj.js is an ES module for the Workers runtime; load a copy as .mjs for Node.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION = readFileSync(join(root, 'infra/cloudflare/migrations/0002_djjj_analytics.sql'), 'utf8');
let worker, dir;
const realFetch = globalThis.fetch;
const realCaches = globalThis.caches;
const store = new Map();

// Minimal D1 stand-in on node:sqlite: prepare().bind().run() and batch().
function d1() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(MIGRATION);
  const prepare = (sql) => {
    const stmt = { args: [] };
    stmt.bind = (...args) => { stmt.args = args.map((v) => (v === undefined ? null : v)); return stmt; };
    stmt.run = async () => db.prepare(sql).run(...stmt.args);
    return stmt;
  };
  return { raw: db, prepare, batch: async (list) => { for (const s of list) await s.run(); } };
}

function ctx() {
  const pending = [];
  return { waitUntil: (p) => pending.push(p), done: () => Promise.all(pending) };
}

const collect = (body, headers = {}) => new Request('https://djjessejay.ch/__wdjjj/collect', {
  method: 'POST',
  headers: {
    origin: 'https://djjessejay.ch',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
    'cf-connecting-ip': '203.0.113.7',
    'accept-language': 'de-CH,de;q=0.9',
    ...headers,
  },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'wdjjj-analytics-'));
  const file = join(dir, 'wdjjj.mjs');
  writeFileSync(file, readFileSync(join(root, 'infra/cloudflare/wdjjj.js'), 'utf8'));
  worker = (await import(pathToFileURL(file).href)).default;
  globalThis.caches = { default: {
    match: async (req) => { const r = store.get(req.url); return r ? r.clone() : undefined; },
    put: async (req, res) => { store.set(req.url, res); },
  } };
});
after(() => {
  globalThis.fetch = realFetch;
  globalThis.caches = realCaches;
  rmSync(dir, { recursive: true, force: true });
});

test('migration 0002 is idempotent', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(MIGRATION);
  db.exec(MIGRATION);
  assert.equal(db.prepare('SELECT count(*) AS n FROM ev_type').get().n, 10);
});

test('collect is inert without HASH_SECRET or DB', async () => {
  const DB = d1();
  const c = ctx();
  const res = await worker.fetch(collect({ type: 'page_view', path: '/' }), { DB }, c);
  await c.done();
  assert.equal(res.status, 204);
  assert.equal(DB.raw.prepare('SELECT count(*) AS n FROM ev').get().n, 0);
});

test('collect stores a pseudonymous event without IP or user agent', async () => {
  const DB = d1();
  const c = ctx();
  const res = await worker.fetch(collect({ type: 'page_view', path: '/press/?utm_source=x#top', ref: 'https://www.google.com/search?q=dj', sid: 's1' }), { DB, HASH_SECRET: 'test-secret' }, c);
  await c.done();
  assert.equal(res.status, 204);
  const row = DB.raw.prepare('SELECT * FROM ev').get();
  assert.equal(row.path, '/press/');
  assert.equal(row.ref_host, 'www.google.com');
  assert.equal(row.device, 'desktop');
  assert.equal(row.lang, 'de-CH');
  assert.match(row.visitor_hash, /^[0-9a-f]{16}$/);
  const serialized = JSON.stringify(row);
  assert.ok(!serialized.includes('203.0.113.7'), 'IP must not be stored');
  assert.ok(!serialized.includes('Macintosh'), 'user agent must not be stored');
});

test('collect rejects foreign origins, unknown types, oversized bodies and GET', async () => {
  const env = { DB: d1(), HASH_SECRET: 'test-secret' };
  assert.equal((await worker.fetch(collect({ type: 'page_view' }, { origin: 'https://evil.example' }), env, ctx())).status, 403);
  assert.equal((await worker.fetch(collect({ type: 'drop_table' }), env, ctx())).status, 400);
  assert.equal((await worker.fetch(collect('x'.repeat(3000)), env, ctx())).status, 413);
  assert.equal((await worker.fetch(new Request('https://djjessejay.ch/__wdjjj/collect'), env, ctx())).status, 405);
});

test('collect honours DNT / Sec-GPC and drops bots', async () => {
  const DB = d1();
  const env = { DB, HASH_SECRET: 'test-secret' };
  for (const headers of [{ dnt: '1' }, { 'sec-gpc': '1' }, { 'user-agent': 'Googlebot/2.1' }]) {
    const c = ctx();
    assert.equal((await worker.fetch(collect({ type: 'page_view' }, headers), env, c)).status, 204);
    await c.done();
  }
  assert.equal(DB.raw.prepare('SELECT count(*) AS n FROM ev').get().n, 0);
});

test('cron aggregates yesterday and enforces retention', async () => {
  const DB = d1();
  const ins = DB.raw.prepare("INSERT INTO ev (id, ts, type, visitor_hash, path, device) VALUES (?, ?, 'page_view', ?, '/', 'desktop')");
  const y = Date.now() - 86400000;
  ins.run('A', y, 'aaaaaaaaaaaaaaaa');
  ins.run('B', y, 'aaaaaaaaaaaaaaaa');
  ins.run('C', y, 'bbbbbbbbbbbbbbbb');
  ins.run('OLD', Date.now() - 500 * 86400000, 'cccccccccccccccc');
  const c = ctx();
  await worker.scheduled({}, { DB }, c);
  await c.done();
  const agg = DB.raw.prepare('SELECT events, visitors FROM ev_daily').get();
  assert.deepEqual({ ...agg }, { events: 3, visitors: 2 });
  assert.equal(DB.raw.prepare("SELECT count(*) AS n FROM ev WHERE id = 'OLD'").get().n, 0);
});

test('stale copy is served after the primary cache entry expired', async () => {
  store.clear();
  globalThis.fetch = async () => new Response('<h1>ok</h1>', { status: 200, headers: { 'content-type': 'text/html' } });
  const c = ctx();
  await worker.fetch(new Request('https://djjessejay.ch/bio/'), {}, c);
  await c.done();
  store.delete('https://djjessejay.ch/bio/'); // primary entry expired after s-maxage
  globalThis.fetch = async () => new Response('down', { status: 502 });
  const res = await worker.fetch(new Request('https://djjessejay.ch/bio/'), {}, ctx());
  globalThis.fetch = realFetch;
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-wdjjj-stale'), '1');
  assert.equal(await res.text(), '<h1>ok</h1>');
});

test('error page no longer discloses the origin', async () => {
  store.clear();
  globalThis.fetch = async () => { throw new Error('timeout'); };
  const res = await worker.fetch(new Request('https://djjessejay.ch/nope/'), {}, ctx());
  globalThis.fetch = realFetch;
  assert.equal(res.status, 504);
  assert.ok(!(await res.text()).includes('github.io'));
});
