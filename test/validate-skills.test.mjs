import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateSkill, parseFrontmatter, parseAllowedTools } from '../scripts/validate-skills.mjs';

// SKILL-VALIDATE: mechanische Prüfung der .claude/skills/*/SKILL.md.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const good = `---
name: demo-audit
description: Prüft Demo-Dateien. Trigger: "demo audit", "demo prüfen", "demo checken".
argument-hint: "<pfad>"
allowed-tools: Read, Grep, Bash(grep -rn *)
effort: high
---

# Demo Audit: $ARGUMENTS

\`\`\`bash
grep -rn "innerHTML" js/
node --check server.js
\`\`\`

| Befund | Priorität |
|--------|-----------|
| x | Kritisch |
| y | Optional |

\`\`\`text
## Ergebnis
Kritisch: 1 | Wichtig: 0
\`\`\`

Soll ich die kritischen Punkte beheben?
`;

test('parseFrontmatter liest Schlüssel, Werte und Body', () => {
  const fm = parseFrontmatter(good);
  assert.equal(fm.ok, true);
  assert.equal(fm.fields.name.inline, 'demo-audit');
  assert.equal(fm.fields['argument-hint'].inline, '<pfad>');
  assert.match(fm.body, /Demo Audit/);
});

test('parseAllowedTools respektiert Klammern und YAML-Listen', () => {
  assert.deepEqual(parseAllowedTools({ inline: 'Read, Bash(git log *, --oneline), Grep', block: [] }), ['Read', 'Bash(git log *, --oneline)', 'Grep']);
  assert.deepEqual(parseAllowedTools({ inline: '', block: ['  - Read', '  - "Bash(ls *)"'] }), ['Read', 'Bash(ls *)']);
});

test('gültiger Skill: keine Fehler, volle Rubrik', () => {
  const r = validateSkill(good, 'demo-audit');
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.score, 100);
});

test('Strukturfehler werden erkannt', () => {
  const bad = good
    .replace('name: demo-audit', 'name: Demo_Audit')
    .replace('allowed-tools:', 'allowed_tools:')
    .replace('effort: high', 'effort: turbo');
  const r = validateSkill(bad, 'demo-audit');
  assert.ok(r.errors.some((e) => e.includes('kebab-case')));
  assert.ok(r.errors.some((e) => e.includes('entspricht nicht dem Ordner')));
  assert.ok(r.errors.some((e) => e.includes('allowed_tools')));
  assert.ok(r.errors.some((e) => e.includes('effort')));
  assert.equal(validateSkill('kein frontmatter', 'x').errors.length, 1);
});

test('Warnungen: exaktes mkdir-Muster, Home-Pfad, Fork mit Write ohne background', () => {
  const warn = good
    .replace('allowed-tools: Read, Grep, Bash(grep -rn *)', 'allowed-tools: Read, Write, Bash(mkdir -p /root/.claude/skills/)\ncontext: fork')
    .replace('grep -rn "innerHTML" js/', 'cat /home/user/djjessejay.ch/index.html');
  const r = validateSkill(warn, 'demo-audit');
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => w.includes('nicht auf Unterpfade')));
  assert.ok(r.warnings.some((w) => w.includes('/home/user/')));
  assert.ok(r.warnings.some((w) => w.includes('background: false')));
});

test('description-Grenze 1024 Zeichen', () => {
  const long = good.replace(/description: .*/, `description: ${'x'.repeat(1030)}`);
  assert.ok(validateSkill(long, 'demo-audit').errors.some((e) => e.includes('1024')));
});

test('alle Repo-Skills sind fehlerfrei', () => {
  const dir = join(root, '.claude/skills');
  const skills = readdirSync(dir).filter((d) => existsSync(join(dir, d, 'SKILL.md')));
  assert.ok(skills.length > 0);
  for (const d of skills) {
    const r = validateSkill(readFileSync(join(dir, d, 'SKILL.md'), 'utf8'), d);
    assert.deepEqual(r.errors, [], `${d}: ${r.errors.join('; ')}`);
  }
});

test('skillcreator selbst: 0 Warnungen, Score ≥ 90', () => {
  const r = validateSkill(readFileSync(join(root, '.claude/skills/skillcreator/SKILL.md'), 'utf8'), 'skillcreator');
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.ok(r.score >= 90, `Score ${r.score}`);
});

test('CLI: Exit-Code 0 für Repo, 1 für fehlerhafte Datei, --json parsebar', () => {
  const ok = spawnSync(process.execPath, ['scripts/validate-skills.mjs', '--json'], { cwd: root, encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).ok, true);
  const missing = spawnSync(process.execPath, ['scripts/validate-skills.mjs', 'does/not/exist'], { cwd: root, encoding: 'utf8' });
  assert.equal(missing.status, 1);
});
