#!/usr/bin/env node
/**
 * Statischer Build nach Allow-List.
 *
 * Kopiert ausschliesslich die in public.manifest.json gelisteten Dateien und
 * Verzeichnisse nach dist/ (oder BUILD_OUT_DIR). Kein Upload des Repo-Roots mehr:
 * server.js, Dumps, infra/, db/, .claude/, .mcp.json usw. können nicht mehr
 * versehentlich öffentlich werden.
 *
 * Zero-dependency, Node >= 24.
 *   node scripts/build.mjs            -> dist/
 *   BUILD_OUT_DIR=/tmp/x node scripts/build.mjs
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function globToRegExp(glob) {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${esc}$`);
}

export function loadManifest(root = ROOT) {
  const manifest = JSON.parse(readFileSync(join(root, 'public.manifest.json'), 'utf8'));
  for (const key of ['files', 'dirs']) {
    if (!Array.isArray(manifest[key])) throw new Error(`public.manifest.json: "${key}" fehlt oder ist kein Array`);
    for (const p of manifest[key]) {
      if (p.startsWith('/') || p.split('/').includes('..')) throw new Error(`Ungültiger Pfad im Manifest: ${p}`);
    }
  }
  return manifest;
}

export function build({ root = ROOT, outDir } = {}) {
  const manifest = loadManifest(root);
  const out = resolve(root, outDir ?? process.env.BUILD_OUT_DIR ?? manifest.outDir ?? 'dist');
  const rel = relative(root, out);
  if (!rel) throw new Error('outDir darf nicht der Repo-Root sein');
  if (!rel.startsWith('..') && manifest.files.concat(manifest.dirs).some((p) => rel === p || rel.startsWith(`${p}/`))) {
    throw new Error(`outDir ${rel} liegt in einem Quellpfad des Manifests`);
  }

  const excludes = (manifest.excludeInDirs ?? []).map(globToRegExp);
  const missing = [];
  const copied = [];

  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  for (const file of manifest.files) {
    const src = join(root, file);
    if (!existsSync(src) || !statSync(src).isFile()) { missing.push(file); continue; }
    mkdirSync(dirname(join(out, file)), { recursive: true });
    cpSync(src, join(out, file));
    copied.push(file);
  }

  for (const dir of manifest.dirs) {
    const src = join(root, dir);
    if (!existsSync(src) || !statSync(src).isDirectory()) { missing.push(`${dir}/`); continue; }
    cpSync(src, join(out, dir), {
      recursive: true,
      filter: (p) => {
        const name = basename(p);
        if (statSync(p).isDirectory()) return name !== 'node_modules' && !name.startsWith('.');
        return !excludes.some((re) => re.test(name));
      },
    });
    copied.push(`${dir}/`);
  }

  if (missing.length) throw new Error(`Im Manifest gelistet, aber nicht vorhanden: ${missing.join(', ')}`);
  return { out, copied };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const { out, copied } = build();
    console.log(`build: ${copied.length} Einträge nach ${relative(ROOT, out) || out}`);
  } catch (err) {
    console.error(`build fehlgeschlagen: ${err.message}`);
    process.exit(1);
  }
}
