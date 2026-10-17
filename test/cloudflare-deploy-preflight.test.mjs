import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runPreflight, renderSummary } from '../scripts/cloudflare-deploy-preflight.mjs';

const TOKEN = 'synthetic-test-credential';
const CONFIG = { token: TOKEN, accountId: 'a'.repeat(32) };
const response = (status, body) => new Response(JSON.stringify(body), { status });
const accepted = result => response(200, { success: true, result });

test('missing or malformed configuration makes no network requests', async () => {
  for (const config of [{}, { ...CONFIG, token: 'bad\nheader' }, { ...CONFIG, workerName: '../other' }, { ...CONFIG, accountId: 'wrong' }, { ...CONFIG, tokenKind: 'invalid' }]) {
    const report = await runPreflight(config, () => assert.fail('unexpected network call'));
    assert.equal(report.ok, false);
    assert.equal(report.classification, 'configuration_error');
  }
});

test('user token is checked against the exact deployed Worker account', async () => {
  const calls = [];
  const report = await runPreflight(CONFIG, async (url, init) => {
    calls.push({ url, init });
    return accepted(url.endsWith('/verify') ? { status: 'active' } : { id: 'wdjjj' });
  });
  assert.equal(report.ok, true);
  assert.equal(report.writePermissionVerified, false);
  assert.equal(calls[0].url, 'https://api.cloudflare.com/client/v4/user/tokens/verify');
  assert.equal(calls[1].url, `https://api.cloudflare.com/client/v4/accounts/${CONFIG.accountId}/workers/services/wdjjj`);
  for (const { init } of calls) {
    assert.equal(init.method, 'GET');
    assert.equal(init.redirect, 'manual');
    assert.equal(init.headers.authorization, `Bearer ${TOKEN}`);
    assert(init.signal instanceof AbortSignal);
  }
});

test('auto detects account-owned token without calling /accounts list', async () => {
  const calls = [];
  const report = await runPreflight(CONFIG, async url => {
    calls.push(url);
    if (url.endsWith('/user/tokens/verify')) return response(403, { success: false, errors: [{ code: 10000 }] });
    return accepted(url.endsWith('/verify') ? { status: 'active' } : {});
  });
  assert.equal(report.tokenKind, 'account');
  assert(calls[1].endsWith(`/accounts/${CONFIG.accountId}/tokens/verify`));
  assert(!calls.some(url => url.endsWith('/accounts')));
});

test('explicit account token kind never probes user verification', async () => {
  const calls = [];
  const report = await runPreflight({ ...CONFIG, tokenKind: 'account' }, async url => {
    calls.push(url); return accepted(url.endsWith('/verify') ? { status: 'active' } : {});
  });
  assert(report.ok);
  assert(!calls.some(url => url.endsWith('/user/tokens/verify')));
});

test('nonempty but rejected token fails before Worker access', async () => {
  const calls = [];
  const report = await runPreflight(CONFIG, async url => {
    calls.push(url); return response(403, { success: false, errors: [{ code: 10000, message: TOKEN }] });
  });
  assert.equal(report.classification, 'token_not_verified');
  assert.equal(calls.length, 2);
  assert(!calls.some(url => url.includes('/workers/')));
  assert(!JSON.stringify(report).includes(TOKEN));
  assert(!renderSummary(report).includes(TOKEN));
});

test('expired or disabled token never passes verification', async () => {
  for (const status of ['expired', 'disabled']) {
    const report = await runPreflight({ ...CONFIG, tokenKind: 'user' }, async () => accepted({ status }));
    assert.equal(report.ok, false);
    assert.equal(report.classification, 'token_not_verified');
  }
});

test('active token does not imply access to this Worker', async () => {
  for (const http of [403, 404, 500]) {
    const report = await runPreflight(CONFIG, async url => url.endsWith('/verify')
      ? accepted({ status: 'active' }) : response(http, { success: false, errors: [{ code: 10000 }] }));
    assert.equal(report.classification, 'worker_access_not_verified');
    assert.equal(report.ok, false);
  }
});

test('HTTP 200 with unsuccessful API envelope does not pass', async () => {
  const report = await runPreflight(CONFIG, async () => response(200, { success: false, result: { status: 'active' } }));
  assert.equal(report.ok, false);
});

test('redirects are refused without reading or echoing the response', async () => {
  const report = await runPreflight(CONFIG, async () => ({ status: 302, json() { assert.fail('redirect body read'); } }));
  assert.equal(report.ok, false);
  assert(report.checks.every(check => check.reason === 'redirect_refused'));
});

test('non-JSON bodies and thrown exceptions cannot leak credentials', async () => {
  for (const fake of [async () => new Response(TOKEN, { status: 520 }), async () => { throw new Error(TOKEN); }]) {
    const report = await runPreflight(CONFIG, fake);
    assert.equal(report.ok, false);
    assert(!JSON.stringify(report).includes(TOKEN));
    assert(!renderSummary(report).includes(TOKEN));
  }
});

test('active Worker name still matches the checked target', () => {
  const config = readFileSync(new URL('../infra/cloudflare/wrangler.toml', import.meta.url), 'utf8');
  assert.match(config, /^name = "wdjjj"$/m);
});
