import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  parseArgs, readConfig, buildIngress, mergeTunnelConfig, accessPolicyMatches, serviceTokenPolicyMatches, accessAppIsStrict, conflictingAccessApps, checkServiceToken, listAll, classifyDns, run,
} = require('../scripts/cloudflare-tunnel-setup.js');

const BASE_ENV = {
  CLOUDFLARE_API_TOKEN: 't', CLOUDFLARE_ACCOUNT_ID: 'acc', CLOUDFLARE_ZONE_ID: 'zone',
  CF_PUBLIC_HOSTNAME: 'origin.djjessejay.ch',
  CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID: '00000000-0000-4000-8000-000000000001', // test fixture, not a credential
};
const TOKEN = BASE_ENV.CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID;
const PUBLIC_ORIGIN_ENV = { ...BASE_ENV, CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID: '' };
const ACCESS_ENV = { ...BASE_ENV, CF_ACCESS_HOSTNAME: 'admin.djjessejay.ch', CF_ACCESS_EMAILS: 'a@b.ch' };

/** In-memory Cloudflare API double that records every call. */
function fakeApi({ tunnels = [], config = {}, dns = {}, apps = [], policies = {}, failOn = null, zoneAccount = 'acc', serviceToken = { id: '00000000-0000-4000-8000-000000000001' } } = {}) {
  const calls = [];
  const state = { tunnels: [...tunnels], config: structuredClone(config), dns: structuredClone(dns), apps: [...apps], nextId: 1 };
  const api = async (method, path, body) => {
    calls.push({ method, path, body });
    if (failOn && failOn(method, path)) throw new Error(`injected failure ${method} ${path}`);
    if (method === 'GET' && path === '/zones/zone') return { name: 'djjessejay.ch', status: 'active', account: { id: zoneAccount } };
    if (method === 'GET' && path.startsWith('/accounts/acc/cfd_tunnel?')) return state.tunnels;
    if (method === 'POST' && path === '/accounts/acc/cfd_tunnel') { const t = { id: `tun${state.nextId++}`, ...body }; state.tunnels.push(t); return t; }
    if (method === 'GET' && path.endsWith('/configurations')) return { config: state.config };
    if (method === 'PUT' && path.endsWith('/configurations')) { state.config = body.config; return {}; }
    if (method === 'GET' && path.startsWith('/zones/zone/dns_records?name=')) return state.dns[decodeURIComponent(path.split('=')[1])] || [];
    if (method === 'POST' && path === '/zones/zone/dns_records') { const r = { id: `dns${state.nextId++}`, ...body }; state.dns[body.name] = [r]; return r; }
    if (method === 'GET' && path.startsWith('/accounts/acc/access/service_tokens/')) { if (!serviceToken) throw new Error('404 not found'); return serviceToken; }
    if (method === 'DELETE' && path.startsWith('/zones/zone/dns_records/')) {
      const id = path.split('/').pop();
      for (const k of Object.keys(state.dns)) state.dns[k] = state.dns[k].filter((r) => r.id !== id);
      return {};
    }
    if (method === 'DELETE' && path.startsWith('/accounts/acc/access/apps/')) { const id = path.split('/').pop(); state.apps = state.apps.filter((a) => a.id !== id); return {}; }
    if (method === 'DELETE' && path.startsWith('/accounts/acc/cfd_tunnel/')) { const id = path.split('/').pop(); state.tunnels = state.tunnels.filter((t) => t.id !== id); return {}; }
    if (method === 'DELETE') return {};
    if (method === 'GET' && path.startsWith('/accounts/acc/access/apps?')) {
      const q = new URLSearchParams(path.split('?')[1]);
      const page = Number(q.get('page') || 1), per = Number(q.get('per_page') || 50);
      const filtered = state.apps.filter((a) => !q.get('domain') || a.domain === q.get('domain'));
      return filtered.slice((page - 1) * per, page * per);
    }
    if (method === 'GET' && path.endsWith('/policies')) return policies[path.split('/')[5]] || [];
    if (method === 'POST' && path === '/accounts/acc/access/apps') { const a = { id: `app${state.nextId++}`, ...body }; state.apps.push(a); return a; }
    if (method === 'POST' && path.endsWith('/policies')) return { id: 'pol1' };
    throw new Error(`unexpected ${method} ${path}`);
  };
  return { api, calls, state };
}
const quiet = () => {};
const mutations = (calls) => calls.filter((c) => c.method !== 'GET');
const APPLY = { apply: true, access: false };
const APPLY_ACCESS = { apply: true, access: true };

test('parseArgs rejects unknown flags', () => {
  assert.deepEqual(parseArgs([]), { apply: false, access: false, allowPublicOrigin: false });
  assert.throws(() => parseArgs(['--force']), /Unknown argument/);
});

test('readConfig requires the public hostname and credentials', () => {
  assert.throws(() => readConfig({}, { access: false }), /CLOUDFLARE_API_TOKEN[\s\S]*CF_PUBLIC_HOSTNAME/);
});

test('apex and www are refused as tunnel hostname', () => {
  for (const host of ['djjessejay.ch', 'www.djjessejay.ch']) {
    assert.throws(() => readConfig({ ...BASE_ENV, CF_PUBLIC_HOSTNAME: host }, { access: false }), /must stay behind the wdjjj Worker/);
  }
});

test('origin service rejects credentials and paths and is normalised', () => {
  assert.throws(() => readConfig({ ...BASE_ENV, CF_ORIGIN_SERVICE: 'http://user:secret@127.0.0.1:3000' }, { access: false }), /must not contain credentials/);
  assert.throws(() => readConfig({ ...BASE_ENV, CF_ORIGIN_SERVICE: 'http://127.0.0.1:3000/api' }, { access: false }), /path/);
  assert.equal(readConfig({ ...BASE_ENV, CF_ORIGIN_SERVICE: 'http://127.0.0.1:3000/' }, { access: false }).originService, 'http://127.0.0.1:3000');
});

test('Access is refused on the public site and on the tunnel hostname', () => {
  for (const host of ['djjessejay.ch', 'www.djjessejay.ch', 'origin.djjessejay.ch']) {
    assert.throws(() => readConfig({ ...BASE_ENV, CF_ACCESS_HOSTNAME: host, CF_ACCESS_EMAILS: 'a@b.ch' }, { access: true }), /Refusing to attach Access/);
  }
  assert.doesNotThrow(() => readConfig(ACCESS_ENV, { access: true }));
});

test('ingress ends with the http_status:404 catch-all', () => {
  const ing = buildIngress(['origin.djjessejay.ch'], 'http://127.0.0.1:3000');
  assert.deepEqual(ing.at(-1), { service: 'http_status:404' });
  assert.equal(ing[0].hostname, 'origin.djjessejay.ch');
});

test('mergeTunnelConfig keeps originRequest, foreign and path-only rules, and rule precedence', () => {
  const existing = {
    originRequest: { connectTimeout: 10, caPool: '/etc/ca.pem' },
    ingress: [
      { hostname: 'origin.djjessejay.ch', service: 'http://old:1' },
      { hostname: '*.djjessejay.ch', service: 'http://127.0.0.1:9000' },
      { path: '^/metrics$', service: 'http://127.0.0.1:2000' },
      { hostname: 'origin.djjessejay.ch', path: '^/ws', service: 'ws://127.0.0.1:3001' },
      { service: 'http_status:404' },
    ],
  };
  const merged = mergeTunnelConfig(existing, ['origin.djjessejay.ch'], 'http://127.0.0.1:3000');
  assert.deepEqual(merged.originRequest, existing.originRequest);
  assert.deepEqual(merged.ingress, [
    { hostname: 'origin.djjessejay.ch', service: 'http://127.0.0.1:3000' },
    { hostname: '*.djjessejay.ch', service: 'http://127.0.0.1:9000' },
    { path: '^/metrics$', service: 'http://127.0.0.1:2000' },
    { hostname: 'origin.djjessejay.ch', path: '^/ws', service: 'ws://127.0.0.1:3001' },
    { service: 'http_status:404' },
  ]);
  assert.equal(existing.ingress[0].service, 'http://old:1', 'input is not mutated');
});

test('mergeTunnelConfig adds a missing rule before the catch-all', () => {
  const merged = mergeTunnelConfig({ ingress: [{ hostname: 'other.djjessejay.ch', service: 'http://x:1' }, { service: 'http_status:404' }] }, ['origin.djjessejay.ch'], 'http://127.0.0.1:3000');
  assert.deepEqual(merged.ingress.map((r) => r.hostname || 'catch-all'), ['other.djjessejay.ch', 'origin.djjessejay.ch', 'catch-all']);
});

test('a DNS record whose create response was lost is still removed on rollback', async () => {
  const f = fakeApi();
  // Cloudflare creates the record, but the response never arrives.
  const realApi = f.api;
  const api = async (m, p, b) => {
    if (m === 'POST' && p === '/zones/zone/dns_records') {
      f.state.dns[b.name] = [{ id: 'lost1', ...b }];
      f.calls.push({ method: m, path: p, body: b });
      throw new Error('response lost');
    }
    return realApi(m, p, b);
  };
  await assert.rejects(run(readConfig(BASE_ENV, { access: false }), APPLY, api, quiet), /response lost/);
  assert.ok(f.calls.some((c) => c.method === 'DELETE' && c.path === '/zones/zone/dns_records/lost1'));
  assert.ok(f.calls.some((c) => c.method === 'DELETE' && c.path === '/accounts/acc/cfd_tunnel/tun1'));
});

test('a missing exact rule is inserted before a shadowing wildcard', () => {
  const merged = mergeTunnelConfig({ ingress: [
    { path: '^/metrics$', service: 'http://127.0.0.1:2000' },
    { hostname: '*.djjessejay.ch', service: 'http://127.0.0.1:9000' },
    { service: 'http_status:404' },
  ] }, ['origin.djjessejay.ch'], 'http://127.0.0.1:3000');
  assert.deepEqual(merged.ingress.map((r) => r.hostname || r.path || 'catch-all'),
    ['^/metrics$', 'origin.djjessejay.ch', '*.djjessejay.ch', 'catch-all']);
});

test('a zone from another account is refused before any change', async () => {
  const f = fakeApi({ zoneAccount: 'other' });
  await assert.rejects(run(readConfig(BASE_ENV, { access: false }), APPLY, f.api, quiet), /does not belong to CLOUDFLARE_ACCOUNT_ID/);
  assert.deepEqual(mutations(f.calls), []);
});

test('a lost response to the ingress PUT still restores the previous configuration', async () => {
  const previous = { ingress: [{ service: 'http_status:404' }] };
  let first = true;
  const f = fakeApi({
    tunnels: [{ id: 'old', remote_config: true }], config: previous,
    apps: [{ id: 'appO', type: 'self_hosted', domain: 'origin.djjessejay.ch' }],
    policies: { appO: [{ decision: 'non_identity', include: [{ service_token: { token_id: TOKEN } }] }] },
    failOn: (m, p) => { if (m === 'PUT' && first) { first = false; return true; } return false; },
  });
  await assert.rejects(run(readConfig(BASE_ENV, { access: false }), APPLY, f.api, quiet), /injected failure/);
  const puts = f.calls.filter((c) => c.method === 'PUT');
  assert.equal(puts.length, 2);
  assert.deepEqual(puts[1].body.config, previous);
});

test('accessAppIsStrict rejects other types, extra domains and destination overrides', () => {
  const h = 'admin.djjessejay.ch';
  assert.equal(accessAppIsStrict({ type: 'self_hosted', domain: h }, h), true);
  assert.equal(accessAppIsStrict({ type: 'self_hosted', domain: h, destinations: [{ type: 'public', uri: h }] }, h), true);
  assert.equal(accessAppIsStrict({ type: 'bookmark', domain: h }, h), false);
  assert.equal(accessAppIsStrict({ type: 'self_hosted', domain: h, self_hosted_domains: [h, 'x.djjessejay.ch'] }, h), false);
  assert.equal(accessAppIsStrict({ type: 'self_hosted', domain: h, destinations: [{ type: 'public', uri: `${h}/public` }] }, h), false);
});

test('listAll follows pagination', async () => {
  const data = Array.from({ length: 120 }, (_, i) => i);
  const api = async (m, p) => { const q = new URLSearchParams(p.split('?')[1]); const page = +q.get('page'), per = +q.get('per_page'); return data.slice((page - 1) * per, page * per); };
  assert.equal((await listAll(api, '/x?a=1', 50)).length, 120);
});

test('accessPolicyMatches accepts only one exact allow policy', () => {
  const ok = [{ decision: 'allow', include: [{ email: { email: 'A@b.ch' } }] }];
  assert.equal(accessPolicyMatches(ok, ['a@b.ch']), true);
  assert.equal(accessPolicyMatches([], ['a@b.ch']), false);
  assert.equal(accessPolicyMatches([{ decision: 'bypass', include: [{ everyone: {} }] }], ['a@b.ch']), false);
  assert.equal(accessPolicyMatches([{ decision: 'allow', include: [{ everyone: {} }] }], ['a@b.ch']), false);
  assert.equal(accessPolicyMatches([...ok, ...ok], ['a@b.ch']), false);
  assert.equal(accessPolicyMatches(ok, ['a@b.ch', 'c@d.ch']), false);
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
  await run(readConfig(ACCESS_ENV, { access: true }), { apply: false, access: true }, f.api, quiet);
  assert.deepEqual(mutations(f.calls), []);
});

test('apply creates tunnel, worker-only Access, ingress and proxied CNAME, never asking for the token', async () => {
  const f = fakeApi();
  await run(readConfig(BASE_ENV, { access: false }), APPLY, f.api, quiet);
  const m = mutations(f.calls);
  const at = (method, pred) => m.findIndex((c) => c.method === method && pred(c.path));
  const iTunnel = at('POST', (p) => p === '/accounts/acc/cfd_tunnel');
  const iApp = at('POST', (p) => p === '/accounts/acc/access/apps');
  const iPol = at('POST', (p) => p.endsWith('/policies'));
  const iCfg = at('PUT', (p) => p.endsWith('/configurations'));
  const iDns = at('POST', (p) => p === '/zones/zone/dns_records');
  assert.ok(iTunnel < iApp && iApp < iPol && iPol < iCfg && iCfg < iDns, 'order: tunnel, access app, policy, ingress, dns');
  assert.equal(m[iTunnel].body.config_src, 'cloudflare');
  assert.equal(m[iApp].body.domain, 'origin.djjessejay.ch');
  assert.deepEqual(m[iPol].body, { name: 'wdjjj worker only', decision: 'non_identity', precedence: 1, include: [{ service_token: { token_id: TOKEN } }] });
  assert.deepEqual(m[iCfg].body.config.ingress.at(-1), { service: 'http_status:404' });
  assert.deepEqual(m[iDns].body, { type: 'CNAME', name: 'origin.djjessejay.ch', content: 'tun1.cfargotunnel.com', proxied: true, comment: 'tunnel djjessejay-origin' });
  assert.ok(!f.calls.some((c) => c.path.includes('/token')));
});

test('the service token is mandatory unless --allow-public-origin is passed', () => {
  assert.throws(() => readConfig(PUBLIC_ORIGIN_ENV, { access: false }), /CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID/);
  assert.throws(() => readConfig({ ...BASE_ENV, CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID: 'abc.secret-value' }, { access: false }), /not the client secret/);
  assert.equal(readConfig(PUBLIC_ORIGIN_ENV, { access: false, allowPublicOrigin: true }).originTokenId, null);
  assert.deepEqual(parseArgs(['--allow-public-origin']), { apply: false, access: false, allowPublicOrigin: true });
});

test('--allow-public-origin creates no Access app for the tunnel hostname', async () => {
  const f = fakeApi();
  await run(readConfig(PUBLIC_ORIGIN_ENV, { access: false, allowPublicOrigin: true }), APPLY, f.api, quiet);
  assert.ok(!mutations(f.calls).some((c) => c.path === '/accounts/acc/access/apps'));
});

test('serviceTokenPolicyMatches accepts only one non_identity policy for this token', () => {
  const ok = [{ decision: 'non_identity', include: [{ service_token: { token_id: TOKEN } }] }];
  assert.equal(serviceTokenPolicyMatches(ok, TOKEN), true);
  assert.equal(serviceTokenPolicyMatches(ok, 'other'), false);
  assert.equal(serviceTokenPolicyMatches([{ decision: 'non_identity', include: [{ any_valid_service_token: {} }] }], TOKEN), false);
  assert.equal(serviceTokenPolicyMatches([{ decision: 'bypass', include: [{ everyone: {} }] }], TOKEN), false);
  assert.equal(serviceTokenPolicyMatches([...ok, ...ok], TOKEN), false);
});

test('an existing origin Access app with a broader policy fails closed', async () => {
  const f = fakeApi({
    apps: [{ id: 'appO', type: 'self_hosted', domain: 'origin.djjessejay.ch' }],
    policies: { appO: [{ decision: 'non_identity', include: [{ any_valid_service_token: {} }] }] },
  });
  await assert.rejects(run(readConfig(BASE_ENV, { access: false }), APPLY, f.api, quiet), /service token/);
  assert.deepEqual(mutations(f.calls), []);
});

test('Access app is created before the dedicated hostname is routed', async () => {
  const f = fakeApi();
  await run(readConfig(ACCESS_ENV, { access: true }), APPLY_ACCESS, f.api, quiet);
  const m = mutations(f.calls).map((c) => `${c.method} ${c.path}`);
  assert.ok(m.indexOf('POST /accounts/acc/access/apps') < m.findIndex((x) => x.endsWith('/configurations')));
});

test('an existing tunnel is reused and duplicates are refused', async () => {
  const one = fakeApi({ tunnels: [{ id: 'old', remote_config: true }] });
  await run(readConfig(BASE_ENV, { access: false }), APPLY, one.api, quiet);
  assert.ok(!mutations(one.calls).some((c) => c.method === 'POST' && c.path === '/accounts/acc/cfd_tunnel'));

  const two = fakeApi({ tunnels: [{ id: 'a' }, { id: 'b' }] });
  await assert.rejects(run(readConfig(BASE_ENV, { access: false }), APPLY, two.api, quiet), /2 active tunnels/);
});

test('existing DNS records are never overwritten and nothing is mutated', async () => {
  const f = fakeApi({ dns: { 'origin.djjessejay.ch': [{ id: 'r1', type: 'A', content: '192.0.2.10', proxied: false }] } });
  await assert.rejects(run(readConfig(BASE_ENV, { access: false }), APPLY, f.api, quiet), /refusing to overwrite/);
  assert.deepEqual(mutations(f.calls), []);
});

test('an existing Access app with a different policy fails closed before any change', async () => {
  const f = fakeApi({
    tunnels: [{ id: 'old', remote_config: true }],
    apps: [{ id: 'appX', type: 'self_hosted', domain: 'admin.djjessejay.ch' }],
    policies: { appX: [{ decision: 'bypass', include: [{ everyone: {} }] }] },
  });
  await assert.rejects(run(readConfig(ACCESS_ENV, { access: true }), APPLY_ACCESS, f.api, quiet), /do not match the expected/);
  assert.deepEqual(mutations(f.calls), []);
});

test('an Access app on a later page is found, and one with overrides fails closed', async () => {
  const apps = Array.from({ length: 60 }, (_, i) => ({ id: `f${i}`, type: 'self_hosted', domain: `f${i}.djjessejay.ch` }));
  apps.push({ id: 'appZ', type: 'self_hosted', domain: 'admin.djjessejay.ch', destinations: [{ type: 'public', uri: 'admin.djjessejay.ch/open' }] });
  const f = fakeApi({ apps, policies: { appZ: [{ decision: 'allow', include: [{ email: { email: 'a@b.ch' } }] }] } });
  await assert.rejects(run(readConfig(ACCESS_ENV, { access: true }), APPLY_ACCESS, f.api, quiet), /destination overrides/);
  assert.ok(f.calls.some((c) => c.path.startsWith('/accounts/acc/access/apps?') && c.path.includes('page=2')));
  assert.deepEqual(mutations(f.calls), []);
});

test('an existing Access app without policies (half-created) fails closed', async () => {
  const f = fakeApi({ apps: [{ id: 'appY', type: 'self_hosted', domain: 'admin.djjessejay.ch' }], policies: { appY: [] } });
  await assert.rejects(run(readConfig(ACCESS_ENV, { access: true }), APPLY_ACCESS, f.api, quiet), /do not match/);
  assert.deepEqual(mutations(f.calls), []);
});

test('a failed apply on a reused tunnel restores its previous configuration', async () => {
  const previous = { originRequest: { connectTimeout: 10 }, ingress: [{ service: 'http_status:404' }] };
  const f = fakeApi({
    tunnels: [{ id: 'old', remote_config: true }],
    config: previous,
    failOn: (m, p) => m === 'POST' && p === '/zones/zone/dns_records',
  });
  await assert.rejects(run(readConfig(BASE_ENV, { access: false }), APPLY, f.api, quiet), /injected failure/);
  const puts = f.calls.filter((c) => c.method === 'PUT');
  assert.equal(puts.length, 2);
  assert.deepEqual(puts[1].body.config, previous);
  assert.ok(!f.calls.some((c) => c.method === 'DELETE' && c.path.includes('/cfd_tunnel/old')));
});

test('a failed apply deletes the Access app, DNS records and tunnel it created', async () => {
  const f = fakeApi({ failOn: (m, p) => m === 'POST' && p === '/zones/zone/dns_records' && f.calls.filter((c) => c.path === p).length > 1 });
  await assert.rejects(run(readConfig(ACCESS_ENV, { access: true }), APPLY_ACCESS, f.api, quiet), /injected failure/);
  const deletes = f.calls.filter((c) => c.method === 'DELETE').map((c) => c.path);
  assert.equal(deletes.filter((p) => p.startsWith('/zones/zone/dns_records/')).length, 1);
  assert.equal(deletes.filter((p) => p.startsWith('/accounts/acc/access/apps/')).length, 2, 'both created Access apps are deleted');
  assert.ok(deletes.includes('/accounts/acc/cfd_tunnel/tun1'));
});

test('hostnames outside the zone are refused before any change', async () => {
  const f = fakeApi();
  const cfg = readConfig({ ...BASE_ENV, CF_PUBLIC_HOSTNAME: 'origin.example.com' }, { access: false });
  await assert.rejects(run(cfg, APPLY, f.api, quiet), /not inside zone/);
  assert.deepEqual(mutations(f.calls), []);
});

test('accessAppIsStrict rejects destination overrides on an exact-host destination', () => {
  const h = 'origin.djjessejay.ch';
  assert.equal(accessAppIsStrict({ type: 'self_hosted', domain: h, destinations: [{ type: 'public', uri: h, overrides: [] }] }, h), true);
  assert.equal(accessAppIsStrict({ type: 'self_hosted', domain: h, destinations: [{ type: 'public', uri: h, overrides: [{ path: '/public' }] }] }, h), false);
  assert.equal(accessAppIsStrict({ type: 'self_hosted', domain: h, destinations: [{ type: 'public', uri: h, overrides: {} }] }, h), false);
});

test('conflictingAccessApps finds path apps and other exact-host apps, allows a wildcard root app', () => {
  const h = 'origin.djjessejay.ch';
  const apps = [
    { id: 'root', domain: h },
    { id: 'path', domain: `${h}/public` },
    { id: 'dest', domain: 'x.djjessejay.ch', destinations: [{ type: 'public', uri: `https://${h}/open` }] },
    { id: 'multi', domain: 'y.djjessejay.ch', self_hosted_domains: ['y.djjessejay.ch', h] },
    { id: 'wild', domain: '*.djjessejay.ch' },
    { id: 'wildpath', domain: '*.djjessejay.ch/admin' },
    { id: 'other', domain: 'admin.djjessejay.ch/x' },
  ];
  assert.deepEqual(conflictingAccessApps(apps, h).map((a) => a.id), ['path', 'dest', 'multi', 'wildpath']);
});

test('a more specific path app on the hostname is refused before any change', async () => {
  const f = fakeApi({ apps: [{ id: 'pub', name: 'public area', type: 'self_hosted', domain: 'origin.djjessejay.ch/public' }] });
  await assert.rejects(run(readConfig(BASE_ENV, { access: false }), APPLY, f.api, quiet), /Other Access apps also cover origin\.djjessejay\.ch[\s\S]*public area/);
  assert.deepEqual(mutations(f.calls), []);
});

test('a disabled, expired or unreadable service token is refused before any change', async () => {
  for (const serviceToken of [{ id: TOKEN, enabled: false }, { id: TOKEN, expires_at: '2020-01-01T00:00:00Z' }, null]) {
    const f = fakeApi({ serviceToken });
    await assert.rejects(run(readConfig(BASE_ENV, { access: false }), APPLY, f.api, quiet), /disabled|expired|could not be read/);
    assert.deepEqual(mutations(f.calls), []);
  }
  const ok = await checkServiceToken(async () => ({ id: TOKEN, expires_at: '2099-01-01T00:00:00Z' }), 'acc', TOKEN);
  assert.equal(ok.expiresAt, '2099-01-01T00:00:00Z');
});

test('a tunnel whose create response was lost is found by name and deleted on rollback', async () => {
  const f = fakeApi({ failOn: (m, p) => m === 'POST' && p === '/accounts/acc/access/apps' });
  const api = async (m, p, b) => {
    if (m === 'POST' && p === '/accounts/acc/cfd_tunnel') {
      f.calls.push({ method: m, path: p, body: b });
      f.state.tunnels.push({ id: 'ghost', name: b.name });
      throw new Error('response lost');
    }
    return f.api(m, p, b);
  };
  await assert.rejects(run(readConfig(BASE_ENV, { access: false }), APPLY, api, quiet), /response lost/);
  assert.ok(f.calls.some((c) => c.method === 'DELETE' && c.path === '/accounts/acc/cfd_tunnel/ghost'));
  assert.equal(f.state.tunnels.length, 0);
});

test('an Access app whose create response was lost is reconciled on rollback', async () => {
  const f = fakeApi();
  const api = async (m, p, b) => {
    if (m === 'POST' && p === '/accounts/acc/access/apps') {
      f.calls.push({ method: m, path: p, body: b });
      f.state.apps.push({ id: 'ghostapp', ...b });
      throw new Error('response lost');
    }
    return f.api(m, p, b);
  };
  await assert.rejects(run(readConfig(BASE_ENV, { access: false }), APPLY, api, quiet), /response lost/);
  assert.ok(f.calls.some((c) => c.method === 'DELETE' && c.path === '/accounts/acc/access/apps/ghostapp'));
  assert.equal(f.state.apps.length, 0);
});

test('a DNS record whose rollback delete failed is retried during reconciliation', async () => {
  let dnsPosts = 0, firstDelete = true;
  const f = fakeApi({
    failOn: (m, p) => {
      if (m === 'POST' && p === '/zones/zone/dns_records') return ++dnsPosts === 2;
      if (m === 'DELETE' && p.startsWith('/zones/zone/dns_records/') && firstDelete) { firstDelete = false; return true; }
      return false;
    },
  });
  await assert.rejects(run(readConfig(ACCESS_ENV, { access: true }), APPLY_ACCESS, f.api, quiet), /injected failure/);
  const dnsDeletes = f.calls.filter((c) => c.method === 'DELETE' && c.path.startsWith('/zones/zone/dns_records/'));
  assert.equal(dnsDeletes.length, 2, 'failed delete, then the reconciliation retry');
  assert.equal(f.state.dns['origin.djjessejay.ch'].length, 0);
});
