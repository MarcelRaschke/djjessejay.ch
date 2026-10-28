#!/usr/bin/env node
/**
 * Setzt öffentliche Site-Keys zur Build-Zeit in die HTML-Seiten ein.
 *
 *   TURNSTILE_SITE_KEY=0x4AAAA... node scripts/inject-site-keys.mjs
 *
 * Ersetzt YOUR_TURNSTILE_SITE_KEY in allen Zielseiten. Ohne Key bleibt alles
 * unverändert (Exit 0), damit Forks und PR-Builds ohne Variable laufen. Der
 * Site-Key ist öffentlich; der Secret-Key gehört nur auf den Origin
 * (TURNSTILE_SECRET_KEY) und nie in dieses Script.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PLACEHOLDER = 'YOUR_TURNSTILE_SITE_KEY';
export const TARGETS = ['index.html', 'index-legacy.html'];
// Turnstile-Site-Keys: 0x + Base64url-ähnliche Zeichen
export const SITE_KEY_RE = /^0x[0-9A-Za-z_-]{16,64}$/;

export function inject(siteKey, { root = ROOT, targets = TARGETS } = {}) {
  if (!siteKey) return [];
  if (!SITE_KEY_RE.test(siteKey)) throw new Error('TURNSTILE_SITE_KEY hat kein gültiges Format (erwartet 0x…)');
  const changed = [];
  for (const rel of targets) {
    const file = join(root, rel);
    if (!existsSync(file)) continue;
    const before = readFileSync(file, 'utf8');
    if (!before.includes(PLACEHOLDER)) continue;
    writeFileSync(file, before.replaceAll(PLACEHOLDER, siteKey), 'utf8');
    changed.push(rel);
  }
  return changed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const key = process.env.TURNSTILE_SITE_KEY || '';
  if (!key) {
    console.log('TURNSTILE_SITE_KEY nicht gesetzt; Seiten unverändert');
    process.exit(0);
  }
  try {
    const changed = inject(key);
    console.log(`Turnstile-Site-Key eingesetzt: ${changed.join(', ') || 'kein Platzhalter gefunden'}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
