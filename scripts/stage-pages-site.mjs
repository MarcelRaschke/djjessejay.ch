#!/usr/bin/env node
/**
 * Stages the GitHub Pages artifact: copies only the public site allowlist
 * (lib/public-site.js) from the repository root into an output directory.
 * Server code, package manifests, docs, tests, workflows and dotfiles are
 * never copied. Run after `npm run build:css` (and `build:html` if used).
 *
 * Usage: node scripts/stage-pages-site.mjs [outDir]   (default: _site)
 */
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, isAbsolute, join, parse, relative, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { PUBLIC_FILES, PUBLIC_DIRS, isPublicFile } = require('../lib/public-site.js');

const root = realpathSync(resolve(import.meta.dirname, '..'));
const out = realOutput(resolve(root, process.argv[2] || '_site'));

// Resolves symlinks in every existing ancestor, so an alias such as /tmp/link -> repo
// cannot make a path inside the repository look like an outside one.
function realOutput(target) {
  const rest = [];
  let probe = target;
  while (!existsSync(probe)) {
    rest.unshift(basename(probe));
    const parent = dirname(probe);
    if (parent === probe) break;
    probe = parent;
  }
  // The output itself may be a symlink: it is removed as a link below, so resolve only
  // its parent and keep the last segment as written.
  if (rest.length === 0) return join(realpathSync(dirname(target)), basename(target));
  return join(realpathSync(probe), ...rest);
}

// The output is wiped first, so it must be a dedicated directory: not the filesystem root,
// not the repository or one of its ancestors, and not a source directory.
const rootRel = relative(out, root);
if (out === parse(out).root || rootRel === '' || !rootRel.startsWith('..')) {
  throw new Error(`Refusing output directory: ${out}`);
}
const outRel = relative(root, out);
const insideRoot = !outRel.startsWith('..') && !isAbsolute(outRel);
// Inside the repository only a top-level build directory (_site, _anything, dist) is allowed,
// so a typo cannot wipe source directories such as scripts/ or a public tree.
if (insideRoot && !/^(?:_[A-Za-z0-9-]+|dist)$/.test(outRel)) {
  throw new Error(`Refusing output directory inside the repository: ${outRel} (use _site or dist)`);
}
// Outside the repository an existing directory is only reused when it is empty.
if (!insideRoot && existsSync(out) && !lstatSync(out).isSymbolicLink()
  && (!lstatSync(out).isDirectory() || readdirSync(out).length > 0)) {
  throw new Error(`Refusing output directory: ${out} exists and is not an empty directory`);
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
  const source = join(root, dir);
  if (!existsSync(source)) continue;
  // readdirSync follows symlinks, so a public tree that is itself a link would pull in
  // files from outside the repository. Child entries are checked in walk().
  const stat = lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error(`Refusing symlink: ${dir}`);
  if (stat.isDirectory()) walk(dir);
}

if (!copied.includes('index.html')) throw new Error('Missing Pages entrypoint index.html');
const leaked = copied.filter((rel) => !isPublicFile(rel));
if (leaked.length) throw new Error(`Non-public files staged: ${leaked.join(', ')}`);

console.log(`Pages artifact: ${copied.length} files in ${relative(root, out) || '.'}`);
if (skipped.length) console.log(`Skipped inside public trees: ${skipped.join(', ')}`);
