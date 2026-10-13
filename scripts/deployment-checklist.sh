#!/bin/bash
set -e

echo "🔒 Origin Protection Deployment Checklist"
echo "==========================================="
echo ""

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

failed=0
passed=0
warnings=0

# On pull_request events, repository secrets are often not available to CI.
# Secret-presence checks become warnings there; they remain hard requirements
# on push events to protected branches.
if [[ "$GITHUB_EVENT_NAME" == "pull_request" ]]; then
  secret_mode="warn"
else
  secret_mode="required"
fi

check() {
  printf "%-50s" "Checking: $1... "
  if eval "$2" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"
    passed=$((passed + 1))
  elif [[ "$secret_mode" == "warn" && "$3" == "secret" ]]; then
    echo -e "${YELLOW}⚠️ (not set)${NC}"
    warnings=$((warnings + 1))
  else
    echo -e "${RED}❌${NC}"
    failed=$((failed + 1))
  fi
}

check "CLOUDFLARE_API_TOKEN set" "[[ -n \$CLOUDFLARE_API_TOKEN ]]" secret
check "CLOUDFLARE_ACCOUNT_ID set" "[[ -n \$CLOUDFLARE_ACCOUNT_ID ]]" secret
check "CLOUDFLARE_ZONE_ID set" "[[ -n \$CLOUDFLARE_ZONE_ID ]]" secret
check "CF_PUBLIC_HOSTNAME set" "[[ -n \$CF_PUBLIC_HOSTNAME ]]" secret
check "CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID set" "[[ -n \$CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID ]]" secret

check "cloudflare-tunnel-setup.js exists" "[[ -f scripts/cloudflare-tunnel-setup.js ]]"
check "verify-origin-protection.js exists" "[[ -f scripts/verify-origin-protection.js ]]"
check "cloudflare-tunnel-setup.js executable" "[[ -x scripts/cloudflare-tunnel-setup.js ]]"
check "verify-origin-protection.js executable" "[[ -x scripts/verify-origin-protection.js ]]"
check "Node.js installed" "command -v node"
check "ORIGIN-PROTECTION-DEPLOYMENT.md exists" "[[ -f ORIGIN-PROTECTION-DEPLOYMENT.md ]]"
check "GitHub Actions workflow exists" "[[ -f .github/workflows/origin-protection-ci-block.yml ]]"

echo ""
echo "==========================================="
echo -e "${GREEN}✅ Passed: $passed${NC}"
if [[ $warnings -gt 0 ]]; then
  echo -e "${YELLOW}⚠️ Warnings: $warnings${NC}"
fi
if [[ $failed -gt 0 ]]; then
  echo -e "${RED}❌ Failed: $failed${NC}"
  exit 1
elif [[ $warnings -gt 0 ]]; then
  echo ""
  echo "🚀 Structural checks passed. Secret checks skipped as warnings (pull_request event)."
  echo "    Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID, CF_PUBLIC_HOSTNAME and"
  echo "    CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID in repository secrets before merging."
  exit 0
else
  echo ""
  echo "🚀 All checks passed! Ready for deployment."
  exit 0
fi
