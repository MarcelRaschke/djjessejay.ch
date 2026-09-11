#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'FAULI-BOUNDARY gate failed: %s\n' "$*" >&2
  exit 1
}

[[ -f js/fauli.js ]] || fail 'missing js/fauli.js'
[[ -f tests/fauli-boundary.test.js ]] || fail 'missing tests/fauli-boundary.test.js'
command -v node >/dev/null 2>&1 || fail 'node is required'

# I3: inspect executable source after removing comments and string literals.
# Canonical visual state names such as `network` remain allowed; authority
# surfaces are denied by operation/API name instead.
node --input-type=module <<'NODE'
import fs from 'node:fs';

const source = fs.readFileSync('js/fauli.js', 'utf8');
const executable = source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')
  .replace(/'(?:\\.|[^'\\])*'/g, '')
  .replace(/"(?:\\.|[^"\\])*"/g, '')
  .replace(/`(?:\\.|[^`\\])*`/g, '');

const forbidden = [
  /\bAudioContext\b/,
  /\bOfflineAudioContext\b/,
  /\bGainNode\b/,
  /\bAudioBuffer\b/,
  /\bplayTrack\b/,
  /\bpauseTrack\b/,
  /\bplaybackRate\b/,
  /\bwindow\.(?:fetch|WebSocket|XMLHttpRequest)\b/,
  /\b(?:fetch|WebSocket|XMLHttpRequest)\s*\(/,
  /\b(?:gain|dsp|audioBpm|audioEngine|audioContext|systemAuthority|networkControl)\b/i
];

for (const pattern of forbidden) {
  if (pattern.test(executable)) {
    throw new Error(`forbidden FAULI authority symbol: ${pattern}`);
  }
}

const apiMatch = executable.match(/window\.FAULI\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/);
if (!apiMatch) throw new Error('public FAULI API declaration not found');

const api = [...apiMatch[1].matchAll(/\b([A-Za-z_$][\w$]*)\s*:/g)].map((m) => m[1]);
const expected = ['STATES', 'getSnapshot', 'getState', 'render', 'setState'].sort();
if (JSON.stringify(api.sort()) !== JSON.stringify(expected)) {
  throw new Error(`unexpected public API surface: ${api.join(', ')}`);
}
NODE

# I1/I2/I4/I5/I6: executable boundary contract.
node --experimental-default-type=module --test tests/fauli-boundary.test.js

printf 'FAULI_BOUNDARY_INVARIANT I1..I6 passed.\n'
