#!/bin/bash
set -e
echo "🔒 Origin Protection Deployment Checklist"; echo "==========================================="; echo ""
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
failed=0; passed=0
check() {
  printf "%-50s" "Checking: $1... "
  if eval "$2" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"; ((passed++))
  else
    echo -e "${RED}❌${NC}"; ((failed++))
  fi
}
check "CLOUDFLARE_API_TOKEN set" "[[ -n \$CLOUDFLARE_API_TOKEN ]]"
check "CLOUDFLARE_ACCOUNT_ID set" "[[ -n \$CLOUDFLARE_ACCOUNT_ID ]]"
check "CLOUDFLARE_ZONE_ID set" "[[ -n \$CLOUDFLARE_ZONE_ID ]]"
check "ORIGIN_HOST set" "[[ -n \$ORIGIN_HOST ]]"
check "cloudflare-tunnel-setup.js exists" "[[ -f scripts/cloudflare-tunnel-setup.js ]]"
check "verify-origin-protection.js exists" "[[ -f scripts/verify-origin-protection.js ]]"
check "cloudflare-tunnel-setup.js executable" "[[ -x scripts/cloudflare-tunnel-setup.js ]]"
check "verify-origin-protection.js executable" "[[ -x scripts/verify-origin-protection.js ]]"
check "Node.js installed" "command -v node"
check "ORIGIN-PROTECTION-DEPLOYMENT.md exists" "[[ -f ORIGIN-PROTECTION-DEPLOYMENT.md ]]"
check "GitHub Actions workflow exists" "[[ -f .github/workflows/origin-protection-ci-block.yml ]]"
echo ""; echo "==========================================="; echo -e "${GREEN}✅ Passed: $passed${NC}"
if [[ $failed -gt 0 ]]; then
  echo -e "${RED}❌ Failed: $failed${NC}"
  exit 1
else
  echo ""; echo "🚀 All checks passed! Ready for deployment."; exit 0
fi
