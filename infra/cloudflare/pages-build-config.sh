#!/usr/bin/env bash
# Corrects the Cloudflare Pages build configuration for the djjessejay.ch repository.
#
# Root cause of failed builds (2026-10-13): the Pages project runs
# `npx next build` (Next.js preset) but the repository is a static site
# (index.html + Tailwind, Express backend for /api). There is no pages/ or
# app/ directory and no next/react dependency, so every build fails with
# "Couldn't find any pages or app directory". Additionally the Pages
# environment runs Node 22 while package.json requires engines node >=24.
#
# Usage:
#   export CF_API_TOKEN="..."   # scoped token, permission: Cloudflare Pages Edit
#   export CF_ACCOUNT_ID="..."
#   ./pages-build-config.sh [PAGES_PROJECT_NAME]
#
# Idempotent. Sets:
#   - build command:        npm run build:css
#   - build output dir:     / (repo root, like static.yml uploads ".")
#   - production branch:    main
#   - NODE_VERSION:         24 (production environment)
# Then triggers a fresh production deployment and waits for the result.
#
# Dashboard fallback (Workers & Pages -> <project> -> Settings -> Builds & deployments):
#   Framework preset:       None
#   Build command:          npm run build:css
#   Build output directory: /
#   Production branch:      main
#   Environment variable:   NODE_VERSION = 24
#
# Known limitation: Cloudflare Pages serves static assets only. server.js
# (Express, /api/*, contact form, AI proxy) is NOT executed by Pages.
# Production traffic for djjessejay.ch continues to run via the wdjjj
# Worker route (see infra/cloudflare/README.md) until decided otherwise.
set -euo pipefail

API="https://api.cloudflare.com/client/v4"
PROJECT="${1:-}"
POLL_ATTEMPTS=20
POLL_INTERVAL=15

command -v curl >/dev/null 2>&1 || { echo "curl not found" >&2; exit 1; }
command -v jq   >/dev/null 2>&1 || { echo "jq not found" >&2; exit 1; }

: "${CF_API_TOKEN:?CF_API_TOKEN must be set (scope: Cloudflare Pages Edit)}"
: "${CF_ACCOUNT_ID:?CF_ACCOUNT_ID must be set}"

cf() { curl -sS --fail-with-body -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" "$@"; }

# ---- 1/5 Resolve Pages project -----------------------------------------
if [ -z "${PROJECT}" ]; then
  echo "[1/5] Resolving Pages project for MarcelRaschke/djjessejay.ch ..."
  PROJECT="$(cf "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects" \
    | jq -r '[.result[] | select(.source.config.owner=="MarcelRaschke" and .source.config.repository_name=="djjessejay.ch")] | if length > 0 then .[0].name else empty end')"
fi

if [ -z "${PROJECT}" ]; then
  echo "ERROR: could not resolve the Pages project automatically." >&2
  echo "Available projects:" >&2
  cf "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects" | jq -r '.result[].name' | sed 's/^/  /' >&2
  echo "Re-run with: $0 <project-name>" >&2
  exit 1
fi
echo "      project: ${PROJECT}"

# ---- 2/5 Patch build configuration --------------------------------------
echo "[2/5] Patching build configuration (build command, output dir, production branch) ..."
cf -X PATCH "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects/${PROJECT}" \
  --data '{
    "production_branch": "main",
    "build_config": {
      "build_command": "npm run build:css",
      "destination_dir": "",
      "root_dir": ""
    }
  }' | jq -e '.success' >/dev/null
echo "      ok"

# ---- 3/5 Set NODE_VERSION ------------------------------------------------
echo "[3/5] Ensuring environment variable NODE_VERSION=24 (production) ..."
HAS_NODE_VERSION="$(cf "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects/${PROJECT}/env" \
  | jq -r '.result[] | select(.name=="NODE_VERSION") | .value')"

if [ "${HAS_NODE_VERSION}" = "24" ]; then
  echo "      already set to 24, skipping"
elif [ -n "${HAS_NODE_VERSION}" ]; then
  cf -X PATCH "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects/${PROJECT}/env/NODE_VERSION" \
    --data '{"name":"NODE_VERSION","type":"plain_text","value":"24","production_environment":true}' | jq -e '.success' >/dev/null
  echo "      updated to 24"
else
  cf -X POST "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects/${PROJECT}/env" \
    --data '{"name":"NODE_VERSION","type":"plain_text","value":"24","production_environment":true}' | jq -e '.success' >/dev/null
  echo "      created"
fi

# ---- 4/5 Trigger production deployment ----------------------------------
echo "[4/5] Triggering production deployment from main ..."
DEPLOY_ID="$(cf -X POST "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects/${PROJECT}/deployments" \
  | jq -r '.result.id')"
echo "      deployment id: ${DEPLOY_ID}"

# ---- 5/5 Wait for build result -------------------------------------------
echo "[5/5] Waiting for build (polling every ${POLL_INTERVAL}s, max ${POLL_ATTEMPTS} attempts) ..."
for i in $(seq 1 "${POLL_ATTEMPTS}"); do
  sleep "${POLL_INTERVAL}"
  STATUS="$(cf "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects/${PROJECT}/deployments/${DEPLOY_ID}" \
    | jq -r '.result | (.latest_stage.status // "unknown")')"

  case "${STATUS}" in
    success)
      URL="$(cf "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects/${PROJECT}/deployments/${DEPLOY_ID}" | jq -r '.result.url')"
      echo "BUILD OK: ${URL}"
      echo "Next: verify endpoints, e.g. curl -fsSI https://<pages-domain>/ and scripts/wkd-verify.sh"
      exit 0
      ;;
    failure|canceled)
      echo "BUILD ${STATUS} after attempt ${i}." >&2
      echo "Inspect logs: Workers & Pages -> ${PROJECT} -> deployments -> ${DEPLOY_ID}" >&2
      exit 1
      ;;
    *)
      echo "      attempt ${i}/${POLL_ATTEMPTS}: ${STATUS}"
      ;;
  esac
done

echo "Timeout after $((POLL_ATTEMPTS * POLL_INTERVAL))s. Check the dashboard for the final status." >&2
exit 1
