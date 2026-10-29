#!/usr/bin/env node
/**
 * Prüft das Build-Ergebnis vor dem Upload.
 *
 * 1. Verbotene Dateien: Dumps, Server-Code, Secrets, Agent- und Infra-Konfiguration.
 * 2. Lokale Referenzen (src/href, CSS url(), JS-Imports) zeigen auf existierende Dateien in dist/.
 *
 * Exit 1 bei jedem Treffer. Kein WARN-Zustand.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const FORBIDDEN = [
  { re: /\.sql$/i, why: 'SQL-Dump' },
  { re: /(^|\/)[^/]*\.xml$/i, why: 'XML-Dump' },
  { re: /(^|\/)\.env(\.|$)/, why: 'Umgebungsdatei' },
  { re: /(^|\/)\.(git|github|claude|vscode|vs)(\/|$)/, why: 'Repo- oder Agent-Konfiguration' },
  { re: /(^|\/)\.mcp\.json$/, why: 'MCP-Konfiguration' },
  { re: /^server\.js$/, why: 'Express-Server' },
  { re: /^(infra|db|workers|render-farm|control-center|honeypot|scripts|src|test|tests|triage|policy|contracts|patches|release|provenance|tools|graph|routes|jj-ai|audio-core|docs|archive)\//, why: 'nicht öffentliches Verzeichnis' },
  { re: /(^|\/)node_modules\//, why: 'node_modules' },
  { re: /\.(pem|key|p12|pfx|gpg|asc)$/i, why: 'Schlüsselmaterial' },
  { re: /\.(mov|swf)$/i, why: 'Altmedien' },
  { re: /(^|\/)package(-lock)?\.json$/, why: 'Paketdefinition' },
  { re: /\.md$/i, why: 'Repo-Dokumentation' },
];

const REF_RE = [
  /\b(?:src|href)\s*=\s*"([^"]+)"/g,
  /\b(?:src|href)\s*=\s*'([^']+)'/g,
  /url\(\s*['"]?([^)'"]+)['"]?\s*\)/g,
  /\bimport\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  /"imports"\s*:\s*\{[^}]*?:\s*"([^"]+)"/g,
];

function walk(dir, base = dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, base, acc);
    else acc.push(relative(base, p).split('\\').join('/'));
  }
  return acc;
}

export function isLocalRef(ref) {
  if (!ref || ref.startsWith('#')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith('//')) return false;
  if (ref.includes('${') || ref.includes('{{')) return false;
  return /\.[a-z0-9]{2,10}$/i.test(ref.split(/[?#]/)[0]) || ref.endsWith('/');
}

export function resolveRef(fromFile, ref) {
  const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
  const target = clean.startsWith('/') ? posix.normalize(clean.slice(1)) : posix.normalize(posix.join(posix.dirname(fromFile), clean));
  return target.endsWith('/') || target === '.' ? posix.join(target, 'index.html') : target;
}

export function checkDist(distDir) {
  const problems = [];
  if (!existsSync(distDir)) return [`${distDir} existiert nicht, zuerst npm run build`];
  const files = walk(distDir);
  const set = new Set(files);

  for (const f of files) {
    for (const rule of FORBIDDEN) if (rule.re.test(f)) problems.push(`verboten (${rule.why}): ${f}`);
  }

  for (const f of files.filter((x) => ['.html', '.css', '.js', '.mjs'].includes(extname(x)))) {
    const text = readFileSync(join(distDir, f), 'utf8');
    for (const re of REF_RE) {
      for (const m of text.matchAll(re)) {
        const ref = m[1].trim();
        if (!isLocalRef(ref)) continue;
        const target = resolveRef(f, ref);
        if (target.startsWith('..')) { problems.push(`Referenz ausserhalb dist/: ${f} -> ${ref}`); continue; }
        if (!set.has(target)) problems.push(`fehlende Referenz: ${f} -> ${ref}`);
      }
    }
  }
  return [...new Set(problems)];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = resolve(ROOT, process.argv[2] ?? process.env.BUILD_OUT_DIR ?? 'dist');
  const problems = checkDist(dist);
  if (problems.length) {
    console.error(`check:dist FAIL (${problems.length})`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check:dist OK (${walk(dist).length} Dateien)`);
}
