#!/usr/bin/env bash
set -euo pipefail

fail=0
check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then printf 'PASS  %s\n' "$name"; else printf 'FAIL  %s\n' "$name"; fail=1; fi
}

check 'Node.js >= 22' node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'
check 'Node syntax: tunnel setup' node --check scripts/cloudflare-tunnel-setup.js
check 'Node syntax: verifier' node --check scripts/verify-origin-protection.js
check 'Shell syntax' bash -n scripts/deployment-checklist.sh
check 'Workflow exists' test -f .github/workflows/origin-protection-ci-block.yml
check 'No hard-coded Cloudflare token' bash -c '! grep -RInE "(CF-[A-Za-z0-9_-]{20,}|Bearer [A-Za-z0-9._-]{20,})" scripts .github/workflows --exclude-dir=.git'
check 'No private key material' bash -c '! grep -RInE "BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY" scripts .github/workflows --exclude-dir=.git'
check 'No insecure curl TLS bypass' bash -c '! grep -RInE -- "curl([^\\n]|\\n)*--insecure|curl([^\\n]|\\n)*-k([[:space:]]|$)" scripts .github/workflows --exclude-dir=.git'

if (( fail )); then
  printf '\nDEPLOYMENT CHECKLIST: FAIL\n' >&2
  exit 1
fi
printf '\nDEPLOYMENT CHECKLIST: PASS\n'
