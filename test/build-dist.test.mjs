import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { build, globToRegExp } from '../scripts/build.mjs';
import { checkDist, isLocalRef, resolveRef } from '../scripts/check-dist.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fixture(files, manifest) {
  const dir = mkdtempSync(join(tmpdir(), 'djjj-build-'));
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), c);
  }
  writeFileSync(join(dir, 'public.manifest.json'), JSON.stringify(manifest));
  return dir;
}

test('Repo-Build: dist/ besteht die Prüfung ohne Befund', () => {
  const out = mkdtempSync(join(tmpdir(), 'djjj-dist-'));
  try {
    build({ root: ROOT, outDir: out });
    assert.deepEqual(checkDist(out), []);
    for (const f of ['index.html', 'ivdj-supreme.html', 'favicon.svg', 'tailwind.css']) {
      assert.ok(existsSync(join(out, f)), `${f} fehlt in dist/`);
    }
    for (const f of ['server.js', '.mcp.json', 'infra', 'db', '.claude', 'control-center', 'package.json', 'CLAUDE.md']) {
      assert.ok(!existsSync(join(out, f)), `${f} darf nicht in dist/ liegen`);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('Build kopiert nur Manifest-Einträge und filtert excludeInDirs', () => {
  const dir = fixture(
    { 'index.html': '<a href="sub/a.html">a</a>', 'sub/a.html': 'x', 'sub/README.md': '#', 'server.js': 'x', 'dump.sql': 'x' },
    { files: ['index.html'], dirs: ['sub'], excludeInDirs: ['*.md'] },
  );
  try {
    const { out } = build({ root: dir, outDir: 'dist' });
    assert.ok(existsSync(join(out, 'sub/a.html')));
    assert.ok(!existsSync(join(out, 'sub/README.md')));
    assert.ok(!existsSync(join(out, 'server.js')));
    assert.ok(!existsSync(join(out, 'dump.sql')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Build bricht ab bei fehlendem Manifest-Eintrag, Pfad-Traversal und Root als Ziel', () => {
  const dir = fixture({ 'index.html': 'x' }, { files: ['index.html', 'gibtsnicht.html'], dirs: [] });
  try {
    assert.throws(() => build({ root: dir, outDir: 'dist' }), /nicht vorhanden: gibtsnicht\.html/);
    writeFileSync(join(dir, 'public.manifest.json'), JSON.stringify({ files: ['../etc/passwd'], dirs: [] }));
    assert.throws(() => build({ root: dir, outDir: 'dist' }), /Ungültiger Pfad/);
    writeFileSync(join(dir, 'public.manifest.json'), JSON.stringify({ files: ['index.html'], dirs: [] }));
    assert.throws(() => build({ root: dir, outDir: '.' }), /Repo-Root/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('checkDist meldet verbotene Dateien', () => {
  const dist = mkdtempSync(join(tmpdir(), 'djjj-bad-'));
  try {
    for (const f of ['guestbook.sql', 'server.js', '.env.local', '.mcp.json', 'infra/cloudflare/wdjjj.js', 'events.xml', 'README.md']) {
      mkdirSync(dirname(join(dist, f)), { recursive: true });
      writeFileSync(join(dist, f), 'x');
    }
    const problems = checkDist(dist).join('\n');
    for (const f of ['guestbook.sql', 'server.js', '.env.local', '.mcp.json', 'infra/cloudflare/wdjjj.js', 'events.xml', 'README.md']) {
      assert.match(problems, new RegExp(f.replace(/[.]/g, '\\.')));
    }
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('checkDist meldet fehlende und ausbrechende Referenzen', () => {
  const dist = mkdtempSync(join(tmpdir(), 'djjj-ref-'));
  try {
    writeFileSync(join(dist, 'index.html'), '<img src="fehlt.png"><a href="../geheim.txt">x</a><a href="https://example.com/a.png">ok</a><a href="#top">ok</a>');
    const problems = checkDist(dist);
    assert.ok(problems.some((p) => p.includes('fehlende Referenz') && p.includes('fehlt.png')));
    assert.ok(problems.some((p) => p.includes('ausserhalb dist/')));
    assert.equal(problems.length, 2);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('Hilfsfunktionen', () => {
  assert.equal(isLocalRef('https://x.ch/a.js'), false);
  assert.equal(isLocalRef('mailto:a@b.ch'), false);
  assert.equal(isLocalRef('css/a.css?v=2'), true);
  assert.equal(resolveRef('Hotze/index.html', 'game.js'), 'Hotze/game.js');
  assert.equal(resolveRef('js/a.js', '../vendor/three/x.js'), 'vendor/three/x.js');
  assert.equal(resolveRef('survey/index.html', '../'), 'index.html');
  assert.equal(resolveRef('a/b.html', '/control-center/app.js'), 'control-center/app.js');
  assert.ok(globToRegExp('*.md').test('README.md'));
  assert.ok(!globToRegExp('*.md').test('README.mdx'));
});

test('static.yml lädt nur dist/ hoch', () => {
  const wf = readFileSync(join(ROOT, '.github/workflows/static.yml'), 'utf8');
  assert.match(wf, /npm run build\b/);
  assert.match(wf, /npm run check:dist/);
  assert.match(wf, /path:\s*'?dist'?/);
  assert.doesNotMatch(wf, /path:\s*'\.'/);
});
