#!/usr/bin/env node
// Prüft data/assets.json gegen das Dateisystem. Keine Abhängigkeiten.
// Aufruf: npm run check:assets

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'data', 'assets.json');
const imgRoot = join(root, 'assets', 'img');

const STATUSES = new Set(['candidate', 'concept', 'reference', 'hold']);
const AI_STATUSES = new Set(['ai-generated', 'unverified']);
const RIGHTS_STATUSES = new Set(['unklaert', 'geklaert']);
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX64 = /^[0-9a-f]{64}$/;
const WARN_BYTES = 200 * 1024;

const errors = [];
const warnings = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warnings.push(`${id}: ${msg}`);

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (err) {
  console.error(`data/assets.json nicht lesbar: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(manifest.assets)) {
  console.error('data/assets.json: Feld "assets" fehlt oder ist kein Array');
  process.exit(1);
}

const seen = new Set();
const trackedPaths = new Set();

for (const a of manifest.assets) {
  const id = a.id ?? '(ohne id)';

  if (!ID_PATTERN.test(a.id ?? '')) fail(id, 'id ist nicht kebab-case');
  if (seen.has(a.id)) fail(id, 'id doppelt');
  seen.add(a.id);

  if (!STATUSES.has(a.status)) fail(id, `status "${a.status}" ungültig`);
  if (!nonEmpty(a.alt)) fail(id, 'alt fehlt');
  if (!nonEmpty(a.role)) fail(id, 'role fehlt');

  if (!nonEmpty(a.source?.upload) || !HEX64.test(a.source?.sha256 ?? '')) {
    fail(id, 'source.upload oder source.sha256 fehlt');
  }

  if (!AI_STATUSES.has(a.ai?.status)) fail(id, `ai.status "${a.ai?.status}" ungültig`);
  if (a.ai?.evidence !== false) fail(id, 'ai.evidence muss false sein');
  if (a.ai?.status === 'ai-generated' && !nonEmpty(a.ai?.label)) fail(id, 'ai.label fehlt');
  if (a.ai?.status === 'ai-generated') {
    const g = a.ai?.generator;
    if (!Array.isArray(g) || g.length === 0 || !g.every(nonEmpty)) {
      fail(id, 'ai.generator muss eine nicht leere Liste von Werkzeugnamen sein');
    }
  }

  if (!RIGHTS_STATUSES.has(a.rights?.status)) fail(id, `rights.status "${a.rights?.status}" ungültig`);
  if (a.rights?.status === 'geklaert' && !nonEmpty(a.rights?.holder)) {
    fail(id, 'rights.status geklaert verlangt rights.holder');
  }

  if (a.status === 'hold') {
    if (a.path !== null) fail(id, 'hold verlangt path null');
    if (!nonEmpty(a.planned_path) || !a.planned_path.startsWith('assets/img/')) {
      fail(id, 'hold verlangt planned_path unter assets/img/');
    } else if (existsSync(join(root, a.planned_path))) {
      fail(id, `hold, aber Datei liegt vor: ${a.planned_path}`);
    }
    continue;
  }

  if (!nonEmpty(a.path) || !a.path.startsWith('assets/')) {
    fail(id, 'path fehlt oder liegt nicht unter assets/');
    continue;
  }
  trackedPaths.add(join(root, a.path));

  const file = join(root, a.path);
  if (!existsSync(file)) {
    fail(id, `Datei fehlt: ${a.path}`);
    continue;
  }
  if (!Number.isInteger(a.width) || !Number.isInteger(a.height) || a.width < 1 || a.height < 1) {
    fail(id, 'width oder height ungültig');
  }
  const bytes = statSync(file).size;
  if (bytes !== a.bytes) fail(id, `bytes weicht ab (Datei ${bytes}, Manifest ${a.bytes})`);
  if (sha256(file) !== a.sha256) fail(id, 'sha256 weicht ab');
  if (bytes > WARN_BYTES) warn(id, `${Math.round(bytes / 1024)} KB, Budget über dem Falz ist 200 KB`);
}

for (const file of walk(imgRoot)) {
  if (!trackedPaths.has(file)) fail(relative(root, file).split(sep).join('/'), 'Datei fehlt im Manifest');
}

for (const w of warnings) console.warn(`WARN  ${w}`);
for (const e of errors) console.error(`FEHLER ${e}`);

const held = manifest.assets.filter((a) => a.status === 'hold').length;
console.log(`${manifest.assets.length} Einträge, ${held} zurückgestellt, ${warnings.length} Warnungen, ${errors.length} Fehler`);
process.exit(errors.length ? 1 : 0);
