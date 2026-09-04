#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'AGENT-SEC gate failed: %s\n' "$*" >&2
  exit 1
}

required_files=(
  'src/agent/mcp-boundary.mjs'
  'src/agent/mcp-boundary.d.ts'
  'test/agent-mcp-boundary.test.mjs'
  'test/agent-security-boundary.test.mjs'
)

for file in "${required_files[@]}"; do
  [[ -f "$file" ]] || fail "missing required file: $file"
done

command -v node >/dev/null 2>&1 || fail 'node is required'

# AGENT-SEC-02/09: the authoritative policy path must explicitly require an
# allowlisted tool/effect and reject unknown operations by default.
grep -Eq 'normalizeAllowedEffects\(policy, request\.tool\)' src/agent/mcp-boundary.mjs \
  || fail 'policy allowlist check is missing'
grep -Eq 'tool .* is not allowlisted' src/agent/mcp-boundary.mjs \
  || fail 'unknown-tool fail-closed check is missing'

# AGENT-SEC-05: assertToolRequestIsSafe() must remain immediately before the
# sole raw transport dispatch.
node --input-type=module <<'NODE'
import fs from 'node:fs';

const source = fs.readFileSync('src/agent/mcp-boundary.mjs', 'utf8');
const dispatchToken = 'transport.call(';
const assertionToken = 'assertToolRequestIsSafe(request, policy);';
const functionToken = 'export async function dispatchToolRequest';

const dispatches = [];
for (let index = source.indexOf(dispatchToken);
  index !== -1;
  index = source.indexOf(dispatchToken, index + dispatchToken.length)) {
  dispatches.push(index);
}
if (dispatches.length !== 1) {
  throw new Error(`expected one raw transport dispatch, found ${dispatches.length}`);
}

const dispatchIndex = dispatches[0];
const functionIndex = source.lastIndexOf(functionToken, dispatchIndex);
const assertionIndex = source.lastIndexOf(assertionToken, dispatchIndex);
if (functionIndex === -1 || assertionIndex < functionIndex || assertionIndex > dispatchIndex) {
  throw new Error('raw transport dispatch is not guarded by assertToolRequestIsSafe()');
}

const gap = source.slice(assertionIndex, dispatchIndex);
if (gap.includes('await ') || gap.includes('transport.')) {
  throw new Error('work/transport occurs between authorization and raw dispatch');
}
NODE

# AGENT-SEC-08: reject common hard-coded credential assignments. The scanner
# intentionally excludes tests and documentation from this heuristic.
while IFS= read -r -d '' file; do
  if grep -EInq \
    '(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)' \
    "$file"; then
    fail "possible hard-coded credential in $file"
  fi

done < <(find src scripts .github -type f \
  \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.ts' -o -name '*.tsx' -o -name '*.sh' -o -name '*.yml' -o -name '*.yaml' \) \
  -print0)

# AGENT-SEC-07: provider credentials must be read from the environment rather
# than passed through request input. This is a static boundary check.
if grep -REInq \
  'request\.(input|params|arguments).*([A-Z_]*(API_KEY|TOKEN|SECRET)|privateKey)|["'"'](api[_-]?key|access[_-]?token|private[_-]?key)["'"'][[:space:]]*:' \
  src/agent --include='*.js' --include='*.mjs' --include='*.ts' 2>/dev/null; then
  fail 'credential material appears to cross the agent/tool request boundary'
fi

# AGENT-SEC-03/04/06/09/10 are executable tests against the real boundary.
node --check src/agent/mcp-boundary.mjs
node --test test/agent-mcp-boundary.test.mjs test/agent-security-boundary.test.mjs

printf 'All AGENT-SEC-01..10 gates passed.\n'
