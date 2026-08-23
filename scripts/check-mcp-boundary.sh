#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'Agent/MCP boundary gate failed: %s\n' "$*" >&2
  exit 1
}

required_files=(
  'src/agent/mcp-boundary.mjs'
  'src/agent/mcp-boundary.d.ts'
  'test/agent-mcp-boundary.test.mjs'
  '.github/CODEOWNERS'
  '.github/PULL_REQUEST_TEMPLATE.md'
  '.github/workflows/agent-architecture-gate.yml'
)

for file in "${required_files[@]}"; do
  [[ -f "$file" ]] || fail "missing required file: $file"
done

command -v node >/dev/null 2>&1 || fail 'node is required'

grep -Eq 'interface[[:space:]]+InternalToolRequest' \
  src/agent/mcp-boundary.d.ts \
  || fail 'InternalToolRequest is missing'
grep -Eq '^[[:space:]]*operationId:[[:space:]]*string;' \
  src/agent/mcp-boundary.d.ts \
  || fail 'InternalToolRequest.operationId is missing'
grep -Eq '^[[:space:]]*effect:[[:space:]]*ToolEffect;' \
  src/agent/mcp-boundary.d.ts \
  || fail 'InternalToolRequest.effect is missing'

node --input-type=module <<'NODE'
import fs from 'node:fs';

const path = 'src/agent/mcp-boundary.mjs';
const source = fs.readFileSync(path, 'utf8');
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

const functionIndex = source.lastIndexOf(functionToken, dispatches[0]);
const assertionIndex = source.lastIndexOf(assertionToken, dispatches[0]);
if (functionIndex === -1 || assertionIndex < functionIndex) {
  throw new Error('raw transport dispatch is not guarded by assertToolRequestIsSafe()');
}
NODE

scan_roots=()
for candidate in src server.js workers render-farm; do
  [[ -e "$candidate" ]] && scan_roots+=("$candidate")
done

while IFS= read -r -d '' file; do
  if [[ "$file" != 'src/agent/mcp-boundary.mjs' \
      && "$file" != './src/agent/mcp-boundary.mjs' ]] \
      && grep -Eq 'transport\.call[[:space:]]*\(' "$file"; then
    fail "raw transport.call outside boundary: $file"
  fi

  if grep -Eq '\.(callTool|executeTool|invokeTool)[[:space:]]*\(' "$file"; then
    fail "direct tool dispatch bypasses boundary: $file"
  fi
done < <(find "${scan_roots[@]}" -type f \
  \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.ts' -o -name '*.tsx' \) \
  -print0)

grep -Fq -- '- [ ] `InternalToolRequest` carries `effect` and `operationId`' \
  .github/PULL_REQUEST_TEMPLATE.md \
  || fail 'PR template is missing the request-field checkbox'
grep -Fq -- '- [ ] `assertToolRequestIsSafe()` runs before every tool dispatch' \
  .github/PULL_REQUEST_TEMPLATE.md \
  || fail 'PR template is missing the dispatch-assertion checkbox'
grep -Fq -- '- [ ] Retry and reconnect behavior is covered by tests' \
  .github/PULL_REQUEST_TEMPLATE.md \
  || fail 'PR template is missing the retry/reconnect checkbox'

node --check src/agent/mcp-boundary.mjs
node --test test/agent-mcp-boundary.test.mjs

printf 'Agent/MCP boundary gate passed.\n'
