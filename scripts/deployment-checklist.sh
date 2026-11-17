#!/bin/bash
set -e

echo "🔒 Origin Protection Deployment Checklist"
echo "==========================================="
echo ""

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

failed=0
passed=0
warnings=0

# Die Secret-Presence-Checks sind ein Bereitschaftssignal fuer das
# Origin-Protection-Deployment, keine Code- oder Sicherheitspruefung. Sie sind
# nur dann ein harter Fehler, wenn das Repository ausdruecklich erklaert, dass
# die Credentials gesetzt sein sollen: Variable ORIGIN_PROTECTION_ENFORCE=true.
#
# Default ist warn. Grund: die Credentials sind bewusst nicht gesetzt, und ein
# Check, der auf jedem Push nach main rot steht, ist kein Signal mehr, sondern
# Rauschen, in dem echte Fehlschlaege untergehen. Vorher haengte der Modus am
# Event-Typ, dadurch war der Check auf PRs gruen und auf main rot -- derselbe
# Commit, zwei Ergebnisse.
#
# Die strukturellen Checks darunter bleiben in jedem Modus hart.
if [[ "${ORIGIN_PROTECTION_ENFORCE:-false}" == "true" ]]; then
  secret_mode="required"
else
  secret_mode="warn"
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
  echo "🚀 Strukturelle Checks bestanden. $warnings Credential(s) nicht gesetzt."
  echo "    Origin Protection ist damit nicht deploybar. Das ist der aktuelle"
  echo "    Stand des Repositories, kein Fehler dieses Laufs."
  echo "    Harte Pruefung einschalten: Repository-Variable"
  echo "    ORIGIN_PROTECTION_ENFORCE=true setzen."
  exit 0
else
  echo ""
  echo "🚀 All checks passed! Ready for deployment."
  exit 0
fi
