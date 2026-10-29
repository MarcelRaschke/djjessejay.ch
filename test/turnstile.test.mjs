import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { inject, PLACEHOLDER } from '../scripts/inject-site-keys.mjs';

const require = createRequire(import.meta.url);
const { verifyTurnstile, parseHostnames, SITEVERIFY_URL, MAX_TOKEN_LENGTH } = require('../lib/turnstile.js');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const base = { secret: 's3cret', token: 'tok', hostnames: ['djjessejay.ch'], action: 'contact' };
const reply = (body, status = 200) => async () => ({ ok: status < 400, status, json: async () => body });

test('Erfolg nur mit success, passendem Hostname und Action', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url, body: init.body.toString(), method: init.method };
    return { ok: true, status: 200, json: async () => ({ success: true, hostname: 'djjessejay.ch', action: 'contact' }) };
  };
  assert.deepEqual(await verifyTurnstile({ ...base, fetchImpl }), { ok: true });
  assert.equal(seen.url, SITEVERIFY_URL);
  assert.equal(seen.method, 'POST');
  assert.match(seen.body, /secret=s3cret/);
  assert.match(seen.body, /response=tok/);
});

test('Fail closed: fehlendes Secret, fehlendes oder zu langes Token', async () => {
  const fetchImpl = () => assert.fail('darf siteverify nicht aufrufen');
  assert.deepEqual(await verifyTurnstile({ ...base, secret: '', fetchImpl }), { ok: false, status: 500, reason: 'secret-missing' });
  assert.equal((await verifyTurnstile({ ...base, token: '', fetchImpl })).status, 400);
  assert.equal((await verifyTurnstile({ ...base, token: undefined, fetchImpl })).status, 400);
  assert.equal((await verifyTurnstile({ ...base, token: 'x'.repeat(MAX_TOKEN_LENGTH + 1), fetchImpl })).reason, 'token-too-long');
});

test('Ablehnung durch Turnstile, falscher Hostname, falsche Action', async () => {
  const r1 = await verifyTurnstile({ ...base, fetchImpl: reply({ success: false, 'error-codes': ['timeout-or-duplicate'] }) });
  assert.deepEqual(r1, { ok: false, status: 403, reason: 'rejected:timeout-or-duplicate' });
  const r2 = await verifyTurnstile({ ...base, fetchImpl: reply({ success: true, hostname: 'evil.example', action: 'contact' }) });
  assert.equal(r2.reason, 'hostname-mismatch:evil.example');
  const r3 = await verifyTurnstile({ ...base, fetchImpl: reply({ success: true, hostname: 'djjessejay.ch', action: 'login' }) });
  assert.equal(r3.reason, 'action-mismatch:login');
  const r4 = await verifyTurnstile({ ...base, fetchImpl: reply({ success: 'true', hostname: 'djjessejay.ch', action: 'contact' }) });
  assert.equal(r4.status, 403, 'nur boolean true gilt als Erfolg');
});

test('Siteverify nicht erreichbar oder HTTP-Fehler ergibt 502', async () => {
  const r1 = await verifyTurnstile({ ...base, fetchImpl: async () => { throw Object.assign(new Error('x'), { name: 'TimeoutError' }); } });
  assert.deepEqual(r1, { ok: false, status: 502, reason: 'siteverify-unreachable:TimeoutError' });
  const r2 = await verifyTurnstile({ ...base, fetchImpl: reply({}, 503) });
  assert.equal(r2.reason, 'siteverify-http-503');
});

test('parseHostnames', () => {
  assert.deepEqual(parseHostnames(' DjJesseJay.ch, www.djjessejay.ch ,,'), ['djjessejay.ch', 'www.djjessejay.ch']);
  assert.deepEqual(parseHostnames(undefined), []);
});

test('inject-site-keys: setzt Key ein, prüft Format, ohne Key keine Änderung', () => {
  const dir = mkdtempSync(join(tmpdir(), 'djjj-ts-'));
  try {
    writeFileSync(join(dir, 'a.html'), `<div data-sitekey="${PLACEHOLDER}"></div>`);
    assert.deepEqual(inject('', { root: dir, targets: ['a.html'] }), []);
    assert.throws(() => inject('6LcXXXXXXXXXXXXXXXXX', { root: dir, targets: ['a.html'] }), /Format/);
    assert.deepEqual(inject('0x4AAAAAAABkMYinukE8nzY', { root: dir, targets: ['a.html', 'fehlt.html'] }), ['a.html']);
    assert.equal(readFileSync(join(dir, 'a.html'), 'utf8'), '<div data-sitekey="0x4AAAAAAABkMYinukE8nzY"></div>');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Repo: kein reCAPTCHA mehr in Server, Seiten und Workflow', () => {
  for (const f of ['server.js', 'index.html', 'index-legacy.html', '.github/workflows/static.yml', '.env.example']) {
    assert.doesNotMatch(readFileSync(join(ROOT, f), 'utf8'), /recaptcha|grecaptcha/i, f);
  }
  const legacy = readFileSync(join(ROOT, 'index-legacy.html'), 'utf8');
  assert.match(legacy, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/);
  assert.match(legacy, /connect-src 'self'/, 'Formular-fetch auf /api/contact muss per CSP erlaubt sein');
  assert.match(legacy, /frame-src https:\/\/challenges\.cloudflare\.com/);
  assert.match(readFileSync(join(ROOT, 'server.js'), 'utf8'), /req\.body\['cf-turnstile-response'\]/);
});
