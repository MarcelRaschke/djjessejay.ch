import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { isPublicFile } = require('../lib/public-site.js');
const script = join(root, 'scripts', 'stage-pages-site.mjs');

function stage(out) {
  return spawnSync(process.execPath, [script, out], { cwd: root, encoding: 'utf8' });
}

test('isPublicFile admits the public site and nothing else', () => {
  for (const p of ['index.html', 'datenschutz.html', 'scripts.js', 'artist-profile.json',
    'js/player-consent.js', 'website/provenance.json', 'visuals/djjessejay-binary/binary.js']) {
    assert.equal(isPublicFile(p), true, p);
  }
  for (const p of ['server.js', 'package.json', 'package-lock.json', 'CLAUDE.md', '.env.example',
    'docs/DEPLOYMENT.md', 'index-legacy.html', 'presskit/README.md', 'js/.hidden.js',
    'website/../server.js', 'honeypot/honeypot-config.js', '.github/workflows/ci.yml', '']) {
    assert.equal(isPublicFile(p), false, p);
  }
});

test('the staged Pages artifact holds the site and no repository internals', () => {
  const out = mkdtempSync(join(tmpdir(), 'pages-site-'));
  try {
    const r = stage(out);
    assert.equal(r.status, 0, r.stderr);
    for (const p of ['index.html', 'datenschutz.html', 'tailwind.css', 'js/player-consent.js',
      'website/provenance.json', 'presskit/ARCHIVE_CITATION_APPENDIX.html']) {
      assert.ok(existsSync(join(out, p)), `missing ${p}`);
    }
    for (const p of ['server.js', 'package.json', 'package-lock.json', 'CLAUDE.md', 'README.md',
      '.env.example', 'docs', 'node_modules', '.github', 'test', 'honeypot', 'index-legacy.html',
      'presskit/README.md']) {
      assert.ok(!existsSync(join(out, p)), `leaked ${p}`);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('a public tree that is itself a symlink is refused', () => {
  const fake = mkdtempSync(join(tmpdir(), 'pages-root-'));
  const outside = mkdtempSync(join(tmpdir(), 'pages-outside-'));
  try {
    mkdirSync(join(fake, 'scripts'));
    mkdirSync(join(fake, 'lib'));
    copyFileSync(script, join(fake, 'scripts', 'stage-pages-site.mjs'));
    copyFileSync(join(root, 'lib', 'public-site.js'), join(fake, 'lib', 'public-site.js'));
    writeFileSync(join(fake, 'index.html'), '<!doctype html>');
    writeFileSync(join(outside, 'secret.txt'), 'not public');
    symlinkSync(outside, join(fake, 'assets'), 'dir');
    const r = spawnSync(process.execPath, [join(fake, 'scripts', 'stage-pages-site.mjs'), '_site'],
      { cwd: fake, encoding: 'utf8' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Refusing symlink: assets/);
    assert.ok(!existsSync(join(fake, '_site', 'assets', 'secret.txt')));
  } finally {
    rmSync(fake, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('the staging script refuses to wipe source directories', () => {
  for (const out of ['.', 'scripts', 'js', '..']) {
    const r = stage(out);
    assert.notEqual(r.status, 0, out);
    assert.match(r.stderr, /Refusing output directory/, out);
  }
  assert.ok(existsSync(join(root, 'scripts', 'stage-pages-site.mjs')));
});
