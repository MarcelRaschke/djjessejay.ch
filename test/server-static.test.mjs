import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Starts the real server.js with SERVE_STATIC=1 and probes the static allowlist.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 30000 + Math.floor(Math.random() * 20000);
let child;

function get(path) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: PORT, path, method: 'GET' }, (res) => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location }));
    });
    req.on('error', reject);
    req.end();
  });
}

before(async () => {
  child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { PATH: process.env.PATH, PORT: String(PORT), SERVE_STATIC: '1', NODE_ENV: 'test' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try { await get('/'); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('server did not start');
});
after(() => { if (child) child.kill(); });

test('the site root is served', async () => {
  assert.equal((await get('/')).status, 200);
});

test('repository internals stay unreachable, also percent-encoded', async () => {
  for (const p of ['/server.js', '/%73erver.js', '/.env', '/package.json', '/docs/DEPLOYMENT.md', '/../server.js']) {
    assert.equal((await get(p)).status, 404, p);
  }
});

test('an allowlisted directory without trailing slash redirects to its index', async () => {
  const r = await get('/survey?ref=x');
  assert.equal(r.status, 301);
  assert.equal(r.location, '/survey/?ref=x');
  assert.equal((await get('/survey/')).status, 200);
});

test('a double-slash directory request cannot become an off-site redirect', async () => {
  const r = await get('//survey');
  assert.equal(r.status, 301);
  assert.equal(r.location, '/survey/');
});

test('a nested public directory without trailing slash redirects to its index', async () => {
  const r = await get('/visuals/blue-dimension-21600');
  assert.equal(r.status, 301);
  assert.equal(r.location, '/visuals/blue-dimension-21600/');
  assert.equal((await get('/visuals/blue-dimension-21600/')).status, 200);
});
