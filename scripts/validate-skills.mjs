#!/usr/bin/env node
// validate-skills.mjs — mechanische Prüfung von Claude-Code-Skills (SKILL.md).
//
// Zero-dependency (nur node:fs/node:path). Prüft Frontmatter gegen die
// Claude-Code-Skill-Felder und bewertet den Body heuristisch nach der
// autoloop-Rubrik. Fehler (error) brechen mit Exit-Code 1 ab, Warnungen nicht.
//
//   node scripts/validate-skills.mjs                    # alle .claude/skills/*/SKILL.md
//   node scripts/validate-skills.mjs .claude/skills/x   # einzelner Skill (Ordner oder Datei)
//   node scripts/validate-skills.mjs --json             # maschinenlesbar
//   node scripts/validate-skills.mjs --strict           # Warnungen zählen als Fehler

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';

// Bekannte Frontmatter-Felder (Agent-Skills-Standard + Claude-Code-Erweiterungen).
export const KNOWN_KEYS = new Set([
  'name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools',
  'when_to_use', 'argument-hint', 'arguments', 'disable-model-invocation', 'user-invocable',
  'disallowed-tools', 'model', 'effort', 'context', 'agent', 'background', 'paths', 'shell', 'hooks',
  'version',
]);
// Felder, die Claude Code mit Unterstrich erwartet; alle anderen Unterstrich-Varianten werden still ignoriert.
const UNDERSCORE_OK = new Set(['when_to_use']);
export const EFFORT_LEVELS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DESCRIPTION_MAX = 1024;
const LISTING_MAX = 1536; // description + when_to_use im Skill-Listing

/** Minimaler Frontmatter-Parser: Top-Level-Schlüssel mit einzeiligem Wert oder eingerücktem Block. */
export function parseFrontmatter(text) {
  const src = text.replace(/^﻿/, '');
  if (!src.startsWith('---\n') && !src.startsWith('---\r\n')) return { ok: false, reason: 'Frontmatter fehlt (Datei muss mit --- beginnen)' };
  const lines = src.split(/\r?\n/);
  const end = lines.indexOf('---', 1);
  if (end === -1) return { ok: false, reason: 'Frontmatter nicht mit --- abgeschlossen' };
  const fields = {};
  const order = [];
  let current = null;
  for (const line of lines.slice(1, end)) {
    if (/^\s*(#|$)/.test(line)) continue;
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (m && !/^\s/.test(line)) {
      current = m[1];
      order.push(current);
      fields[current] = { inline: stripQuotes(m[2].replace(/\s+#.*$/, '').trim()), block: [] };
    } else if (current) {
      fields[current].block.push(line);
    }
  }
  return { ok: true, fields, order, body: lines.slice(end + 1).join('\n'), bodyStartLine: end + 2 };
}

function stripQuotes(v) {
  return /^(['"]).*\1$/.test(v) ? v.slice(1, -1) : v;
}

/** allowed-tools als Liste: kommagetrennt (Klammern respektiert), leerzeichengetrennt oder YAML-Liste. */
export function parseAllowedTools(field) {
  if (!field) return [];
  const fromBlock = field.block.map((l) => /^\s*-\s*(.+)$/.exec(l)).filter(Boolean).map((m) => stripQuotes(m[1].trim()));
  let inline = field.inline.replace(/^\[|\]$/g, '');
  const out = [];
  let depth = 0, buf = '';
  const sep = inline.includes(',') ? ',' : ' ';
  for (const ch of inline) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) { if (buf.trim()) out.push(buf.trim()); buf = ''; } else buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return [...out.map(stripQuotes), ...fromBlock];
}

const PRIORITY_RE = /(kritisch|wichtig|optional|nice-to-have|hoch|mittel|niedrig|critical|high|medium|low)/gi;

/** Heuristische autoloop-Rubrik (10 × 10 Punkte). Liefert Score und je Kriterium true/false. */
export function rubric(fm, body) {
  const f = fm.fields;
  const usesArgs = /\$ARGUMENTS|\$[0-9]\b/.test(body);
  const heavy = /audit|review|research|recherche|analyse|security|prüf/i.test(`${f.name?.inline || ''} ${f.description?.inline || ''}`);
  const triggers = ((f.description?.inline || '').split(/Trigger:/i)[1] || '').match(/"[^"]+"/g) || [];
  const shellBlocks = [...body.matchAll(/```(?:bash|sh|shell)\n([\s\S]*?)```/g)].map((m) => m[1]);
  const shellCmds = shellBlocks.flatMap((b) => b.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')));
  const injected = (body.match(/!`[^`]+`/g) || []).length;
  const hasTemplate = /```(?:text|markdown|md)?\n[\s\S]*?(##|\|[^\n]*\||- \[ \])[\s\S]*?```/.test(body);
  const priorities = new Set((body.match(PRIORITY_RE) || []).map((s) => s.toLowerCase()));
  const tail = body.trim().split('\n').slice(-15).join('\n');
  const followUp = /Soll ich|Nächste[rn]? Schritt|Möchtest du/i.test(tail);
  const rootAware = /git rev-parse --show-toplevel|\$CLAUDE_PROJECT_DIR|\$\{CLAUDE_SKILL_DIR\}/.test(body);
  const hardcoded = /\/home\/user\//.test(body);
  const pseudo = /\[(Pfad|path|TODO|Name|Beschreibung)\]|<variable>|TODO:|FIXME/.test(body.replace(/```(?:text|markdown|md)?\n[\s\S]*?```/g, ''));
  const c = {
    allowedTools: Boolean(f['allowed-tools']),
    argumentHint: !usesArgs || Boolean(f['argument-hint']),
    effort: !heavy || Boolean(f.effort) || f.context?.inline === 'fork',
    triggers: triggers.length >= 3,
    shellCommands: shellCmds.length + injected >= 2,
    outputTemplate: hasTemplate,
    prioritization: priorities.size >= 2,
    followUp,
    paths: rootAware || (!hardcoded && !/\b(?:cat|ls|grep)\s+[a-z]/.test(shellBlocks.join('\n'))),
    noPseudocode: !pseudo,
  };
  const score = Object.values(c).filter(Boolean).length * 10;
  return { score, criteria: c };
}

/** Prüft eine SKILL.md. dirName = Name des Skill-Ordners (für name-Abgleich). */
export function validateSkill(text, dirName) {
  const errors = [], warnings = [];
  const fm = parseFrontmatter(text);
  if (!fm.ok) return { errors: [fm.reason], warnings, score: 0, criteria: {} };
  const f = fm.fields;

  for (const key of fm.order) {
    if (key.includes('_') && !UNDERSCORE_OK.has(key)) errors.push(`Schlüssel "${key}" mit Unterstrich wird von Claude Code ignoriert; richtig: "${key.replace(/_/g, '-')}"`);
    else if (!KNOWN_KEYS.has(key)) warnings.push(`Unbekannter Frontmatter-Schlüssel "${key}" (wird ignoriert)`);
  }
  if (new Set(fm.order).size !== fm.order.length) errors.push('Doppelter Frontmatter-Schlüssel');

  const name = f.name?.inline;
  if (!name) errors.push('name fehlt');
  else {
    if (!NAME_RE.test(name)) errors.push(`name "${name}" muss kebab-case sein (a-z, 0-9, Bindestrich)`);
    if (name.length > 64) errors.push(`name länger als 64 Zeichen (${name.length})`);
    if (dirName && name !== dirName) errors.push(`name "${name}" entspricht nicht dem Ordner "${dirName}"`);
  }

  const desc = f.description?.inline || f.description?.block.join(' ').trim();
  if (!desc) errors.push('description fehlt');
  else {
    if (desc.length > DESCRIPTION_MAX) errors.push(`description länger als ${DESCRIPTION_MAX} Zeichen (${desc.length})`);
    const listing = desc.length + (f.when_to_use?.inline.length || 0);
    if (listing > LISTING_MAX) warnings.push(`description + when_to_use > ${LISTING_MAX} Zeichen, wird im Listing gekürzt`);
    if (/[<>]/.test(desc)) warnings.push('description enthält < oder >; manche Clients verwerfen das');
  }

  if (f.effort && !EFFORT_LEVELS.has(f.effort.inline)) errors.push(`effort "${f.effort.inline}" ungültig; erlaubt: ${[...EFFORT_LEVELS].join(', ')}`);
  if (f.context && f.context.inline !== 'fork') errors.push(`context "${f.context.inline}" ungültig; einziger Wert: fork`);
  if (f.agent && f.context?.inline !== 'fork') warnings.push('agent wirkt nur zusammen mit context: fork');
  if (f.background && f.context?.inline !== 'fork') warnings.push('background wirkt nur zusammen mit context: fork');
  for (const key of ['disable-model-invocation', 'user-invocable', 'background']) {
    if (f[key] && !['true', 'false'].includes(f[key].inline)) errors.push(`${key} muss true oder false sein`);
  }

  for (const tool of parseAllowedTools(f['allowed-tools'])) {
    const m = /^Bash\((.*)\)$/.exec(tool);
    if (!m) continue;
    const pattern = m[1];
    // Exakte Muster wie Bash(mkdir -p /pfad/) erlauben nur genau diesen Befehl, nie /pfad/neuer-ordner.
    if (/^(mkdir|cp|mv|touch|cat|tee)\b/.test(pattern) && /\/$/.test(pattern) && !pattern.includes('*')) {
      warnings.push(`allowed-tools "${tool}" passt nur auf genau diesen Befehl, nicht auf Unterpfade; z. B. "Bash(${pattern}*)" verwenden`);
    }
    if (/^(rm|sudo|curl|wget|git push)\b/.test(pattern)) warnings.push(`allowed-tools "${tool}" gibt einen riskanten Befehl ohne Rückfrage frei`);
  }

  const body = fm.body;
  if (/\/home\/user\//.test(body)) warnings.push('Hartkodierter Pfad /home/user/…; besser !`git rev-parse --show-toplevel` oder relative Pfade ab Repo-Root');
  if (f.context?.inline === 'fork' && /\b(Write|Edit)\b/.test(f['allowed-tools']?.inline || '') && f.background?.inline !== 'false') {
    warnings.push('context: fork mit Write/Edit ohne background: false — Änderungen landen ausserhalb der /rewind-Checkpoints');
  }
  if (body.trim().length < 200) warnings.push('Body sehr kurz (< 200 Zeichen)');

  const { score, criteria } = rubric(fm, body);
  return { errors, warnings, score, criteria };
}

function collectTargets(args, root) {
  const paths = args.filter((a) => !a.startsWith('--'));
  if (paths.length === 0) {
    const dir = join(root, '.claude/skills');
    if (!existsSync(dir)) return [];
    return readdirSync(dir).map((d) => join(dir, d, 'SKILL.md')).filter((p) => existsSync(p)).sort();
  }
  return paths.map((p) => {
    const abs = resolve(p);
    return existsSync(abs) && statSync(abs).isDirectory() ? join(abs, 'SKILL.md') : abs;
  });
}

function main(argv) {
  const json = argv.includes('--json');
  const strict = argv.includes('--strict');
  const root = process.cwd();
  const targets = collectTargets(argv, root);
  if (targets.length === 0) { console.error('Keine SKILL.md gefunden.'); return 2; }

  const results = targets.map((file) => {
    if (!existsSync(file)) return { file, skill: basename(dirname(file)), errors: ['Datei nicht gefunden'], warnings: [], score: 0, criteria: {} };
    return { file, skill: basename(dirname(file)), ...validateSkill(readFileSync(file, 'utf8'), basename(dirname(file))) };
  });
  const failed = results.filter((r) => r.errors.length || (strict && r.warnings.length));

  if (json) {
    console.log(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
  } else {
    console.log('| Skill | Score | Fehler | Warnungen |');
    console.log('|-------|------:|-------:|----------:|');
    for (const r of results) console.log(`| ${r.skill} | ${r.score} | ${r.errors.length} | ${r.warnings.length} |`);
    for (const r of results) {
      if (!r.errors.length && !r.warnings.length) continue;
      console.log(`\n${r.skill}:`);
      for (const e of r.errors) console.log(`  FEHLER   ${e}`);
      for (const w of r.warnings) console.log(`  WARNUNG  ${w}`);
      const missing = Object.entries(r.criteria).filter(([, v]) => !v).map(([k]) => k);
      if (missing.length) console.log(`  RUBRIK   fehlt: ${missing.join(', ')}`);
    }
    console.log(`\n${results.length} Skills geprüft, ${failed.length} mit ${strict ? 'Fehlern oder Warnungen' : 'Fehlern'}.`);
  }
  return failed.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  process.exitCode = main(process.argv.slice(2));
}
