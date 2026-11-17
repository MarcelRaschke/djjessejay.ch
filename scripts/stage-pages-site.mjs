#!/usr/bin/env node
/**
 * Stages the GitHub Pages artifact: copies only the public site allowlist
 * (lib/public-site.js) from the repository root into an output directory.
 * Server code, package manifests, docs, tests, workflows and dotfiles are
 * never copied. Run after `npm run build:css` (and `build:html` if used).
 *
 * Usage: node scripts/stage-pages-site.mjs [outDir]   (default: _site)
 */
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';

const require = createRequire(import.meta.url);
const { PUBLIC_FILES, PUBLIC_DIRS, isPublicFile } = require('../lib/public-site.js');

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, process.argv[2] || '_site');

// The output is wiped first, so it must be a dedicated directory: not the repository,
// not one of its ancestors, and not a public path that would be copied into itself.
const outRel = relative(root, out);
const insideRoot = outRel !== '' && !outRel.startsWith('..');
if (outRel === '' || root.startsWith(out + sep)) throw new Error(`Refusing output directory: ${out}`);
// Inside the repository only a top-level build directory (_site, _anything, dist) is allowed,
// so a typo cannot wipe source directories such as scripts/ or a public tree.
if (insideRoot && !/^(?:_[A-Za-z0-9-]+|dist)$/.test(outRel)) {
  throw new Error(`Refusing output directory inside the repository: ${outRel} (use _site or dist)`);
}

const copied = [];
const skipped = [];

function copy(rel) {
  const source = join(root, rel);
  const stat = lstatSync(source);
  if (!stat.isFile()) throw new Error(`Refusing non-regular file: ${rel}`);
  const target = join(out, rel);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  copied.push(rel);
}

function walk(rel) {
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
    const child = `${rel}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Refusing symlink: ${child}`);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.')) walk(child);
    } else if (entry.isFile()) {
      if (isPublicFile(child)) copy(child); else skipped.push(child);
    }
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const name of PUBLIC_FILES) {
  if (existsSync(join(root, name))) copy(name);
  else console.warn(`Public file missing, not published: ${name}`);
}
for (const dir of PUBLIC_DIRS) {
  if (existsSync(join(root, dir))) walk(dir);
}

if (!copied.includes('index.html')) throw new Error('Missing Pages entrypoint index.html');
const leaked = copied.filter((rel) => !isPublicFile(rel));
if (leaked.length) throw new Error(`Non-public files staged: ${leaked.join(', ')}`);

console.log(`Pages artifact: ${copied.length} files in ${relative(root, out) || '.'}`);
if (skipped.length) console.log(`Skipped inside public trees: ${skipped.join(', ')}`);
