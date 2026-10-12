import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseArgs, readConfig, buildIngress, classifyDns, run } = require('../scripts/cloudflare-tunnel-setup.js');

const BASE_ENV = {
  CLOUDFLARE_API_TOKEN: 't', CLOUDFLARE_ACCOUNT_ID: 'acc', CLOUDFLARE_ZONE_ID: 'zone',
  CF_PUBLIC_HOSTNAME: 'origin.djjessejay.ch',
};

/** In-memory Cloudflare API double that records every call. */
function fakeApi({ tunnels = [], dns = {}, failOn = null } = {}) {
  const calls = [];
  const state = { tunnels: [...tunnels], dns: structuredClone(dns), nextId: 1 };
  const api = async (method, path, body) => {
    calls.push({ method, path, body });
    if (failOn && failOn(method, path)) throw new Error(`injected failure ${method} ${path}`);
    if (method === 'GET' && path === '/zones/zone') return { name: 'djjessejay.ch', status: 'active' };
    if (method === 'GET' && path.startsWith('/accounts/acc/cfd_tunnel?')) return state.tunnels;
    if (method === 'POST' && path === '/accounts/acc/cfd_tunnel') { const t = { id: `tun${state.nextId++}`, ...body }; state.tunnels.push(t); return t; }
    if (method === 'PUT' && path.endsWith('/configurations')) return {};
    if (method === 'GET' && path.startsWith('/zones/zone/dns_records?name=')) return state.dns[decodeURIComponent(path.split('=')[1])] || [];
    if (method === 'POST' && path === '/zones/zone/dns_records') { const r = { id: `dns${state.nextId++}`, ...body }; state.dns[body.name] = [r]; return r; }
    if (method === 'DELETE') return {};
    if (method === 'GET' && path === '/accounts/acc/access/apps') return [];
    if (method === 'POST' && path === '/accounts/acc/access/apps') return { id: 'app1', ...body };
    if (method === 'POST' && path.endsWith('/policies')) return { id: 'pol1' };
    throw new Error(`unexpected ${method} ${path}`);
  };
  return { api, calls, state };
}
const quiet = () => {};
const mutations = (calls) => calls.filter((c) => c.method !== 'GET');

test('parseArgs rejects unknown flags', () => {
  assert.deepEqual(parseArgs([]), { apply: false, access: false });
  assert.throws(() => parseArgs(['--force']), /Unknown argument/);
});

test('readConfig requires the public hostname and credentials', () => {
  assert.throws(() => readConfig({}, { access: false }), /CLOUDFLARE_API_TOKEN[\s\S]*CF_PUBLIC_HOSTNAME/);
});

test('Access is refused on the public site and on the tunnel hostname', () => {
  for (const host of ['djjessejay.ch', 'www.djjessejay.ch', 'origin.djjessejay.ch']) {
    assert.throws(() => readConfig({ ...BASE_ENV, CF_ACCESS_HOSTNAME: host, CF_ACCESS_EMAILS: 'a@b.ch' }, { access: true }), /Refusing to attach Access/);
  }
  assert.doesNotThrow(() => readConfig({ ...BASE_ENV, CF_ACCESS_HOSTNAME: 'admin.djjessejay.ch', CF_ACCESS_EMAILS: 'a@b.ch' }, { access: true }));
});

test('ingress ends with the http_status:404 catch-all', () => {
  const ing = buildIngress(['origin.djjessejay.ch'], 'http://127.0.0.1:3000');
  assert.deepEqual(ing.at(-1), { service: 'http_status:404' });
  assert.equal(ing[0].hostname, 'origin.djjessejay.ch');
});

test('classifyDns accepts only one proxied CNAME to the tunnel', () => {
  const t = 'x.cfargotunnel.com';
  assert.equal(classifyDns([], t).state, 'missing');
  assert.equal(classifyDns([{ type: 'CNAME', content: t, proxied: true, id: 1 }], t).state, 'ok');
  assert.equal(classifyDns([{ type: 'CNAME', content: t, proxied: false }], t).state, 'conflict');
  assert.equal(classifyDns([{ type: 'A', content: '192.0.2.1', proxied: true }], t).state, 'conflict');
});

test('plan mode makes no changes', async () => {
  const f = fakeApi();
  await run(readConfig(BASE_ENV, { access: false }), { apply: false, access: false }, f.api, quiet);
  assert.deepEqual(mutations(f.calls), []);
});

test('apply creates tunnel, ingress and proxied CNAME, and never asks for the token', async () => {
  const f = fakeApi();
  await run(readConfig(BASE_ENV, { access: false }), { apply: true, access: false }, f.api, quiet);
  const m = mutations(f.calls);
  assert.equal(m[0].path, '/accounts/acc/cfd_tunnel');
  assert.equal(m[0].body.config_src, 'cloudflare');
  assert.deepEqual(m[1].body.config.ingress.at(-1), { service: 'http_status:404' });
  assert.deepEqual(m[2].body, { type: 'CNAME', name: 'origin.djjessejay.ch', content: 'tun1.cfargotunnel.com', proxied: true, comment: 'tunnel djjessejay-origin' });
  assert.ok(!f.calls.some((c) => c.path.includes('/token')));
});

test('an existing tunnel is reused and duplicates are refused', async () => {
  const one = fakeApi({ tunnels: [{ id: 'old', remote_config: true }] });
  await run(readConfig(BASE_ENV, { access: false }), { apply: true, access: false }, one.api, quiet);
  assert.ok(!mutations(one.calls).some((c) => c.method === 'POST' && c.path === '/accounts/acc/cfd_tunnel'));

  const two = fakeApi({ tunnels: [{ id: 'a' }, { id: 'b' }] });
  await assert.rejects(run(readConfig(BASE_ENV, { access: false }), { apply: true, access: false }, two.api, quiet), /2 active tunnels/);
});

test('existing DNS records are never overwritten', async () => {
  const f = fakeApi({ dns: { 'origin.djjessejay.ch': [{ id: 'r1', type: 'A', content: '192.0.2.10', proxied: false }] } });
  await assert.rejects(run(readConfig(BASE_ENV, { access: false }), { apply: true, access: false }, f.api, quiet), /refusing to overwrite/);
  assert.ok(!f.calls.some((c) => c.method === 'PUT' && c.path.startsWith('/zones/')));
});

test('a failed apply rolls back the DNS record and the tunnel it created', async () => {
  const env = { ...BASE_ENV, CF_ACCESS_HOSTNAME: 'admin.djjessejay.ch', CF_ACCESS_EMAILS: 'a@b.ch' };
  const f = fakeApi({ failOn: (m, p) => m === 'POST' && p === '/accounts/acc/access/apps' });
  await assert.rejects(run(readConfig(env, { access: true }), { apply: true, access: true }, f.api, quiet), /injected failure/);
  const deletes = f.calls.filter((c) => c.method === 'DELETE').map((c) => c.path);
  assert.equal(deletes.filter((p) => p.startsWith('/zones/zone/dns_records/')).length, 2);
  assert.ok(deletes.includes('/accounts/acc/cfd_tunnel/tun1'));
});

test('hostnames outside the zone are refused before any change', async () => {
  const f = fakeApi();
  const cfg = readConfig({ ...BASE_ENV, CF_PUBLIC_HOSTNAME: 'origin.example.com' }, { access: false });
  await assert.rejects(run(cfg, { apply: true, access: false }, f.api, quiet), /not inside zone/);
  assert.deepEqual(mutations(f.calls), []);
});
