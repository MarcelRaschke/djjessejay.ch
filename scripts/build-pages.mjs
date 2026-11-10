#!/usr/bin/env node
/**
 * Cloudflare Pages: publish only explicit, reviewed public assets.
 * No recursive copies, repository-root upload, backend files or secrets.
 */
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const allowlist = ['index.html', 'ivdj-supreme.html', 'favicon.svg', 'tailwind.css'];
const optionalAssets = ['DJ-Jesse-Jay.jpg'];

function safeCopy(name, required) {
  const source = join(root, name);
  if (!existsSync(source)) {
    if (required) throw new Error('Required public asset missing: ' + name);
    console.warn('Optional public asset missing: ' + name);
    return;
  }
  if (!lstatSync(source).isFile()) throw new Error('Refusing non-regular asset: ' + name);
  copyFileSync(source, join(dist, name));
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const file of allowlist) safeCopy(file, true);
for (const file of optionalAssets) safeCopy(file, false);
const published = readdirSync(dist).sort();
if (!published.includes('index.html')) throw new Error('Missing Pages entrypoint');
if (published.some(file => ![...allowlist, ...optionalAssets].includes(file))) {
  throw new Error('Unexpected public asset in dist/');
}
console.log('Pages dist allowlist:', published.join(', '));
