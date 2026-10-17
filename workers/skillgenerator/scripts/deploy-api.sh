#!/usr/bin/env bash
# Deploy workers/skillgenerator ohne Wrangler — direkt per Cloudflare REST API.
# Funktioniert unter Termux, auf jedem POSIX-System mit bash, curl und jq.
#
# Benötigte Umgebungsvariablen:
#   CF_API_TOKEN   API-Token mit Scope "Workers Scripts:Edit"
#                  (https://dash.cloudflare.com/profile/api-tokens)
#   CF_ACCOUNT_ID  Account-ID (Dashboard: Workers & Pages → rechts "Account ID")
# Optional:
#   CF_OPENAI_API_KEY  setzt das Worker-Secret OPENAI_API_KEY mit
#   CORS_ALLOW_ORIGIN  erlaubte Origin für Cross-Origin-Requests
#                      (Default: Worker-eigene Origin)
#   WORKER_NAME        Default: cy8er-skillgenerator

set -euo pipefail

WORKER_NAME="${WORKER_NAME:-cy8er-skillgenerator}"
COMPAT_DATE="2026-07-14"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MAIN_FILE="$SCRIPT_DIR/src/skillgenerator.js"
MAIN_MODULE="skillgenerator.js"

: "${CF_API_TOKEN:?CF_API_TOKEN ist nicht gesetzt (API-Token mit Scope 'Workers Scripts:Edit' erstellen)}"
: "${CF_ACCOUNT_ID:?CF_ACCOUNT_ID ist nicht gesetzt (Dashboard: Workers & Pages → Account ID)}"
[[ -f "$MAIN_FILE" ]] || { echo "Fehler: $MAIN_FILE nicht gefunden" >&2; exit 1; }

API="https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/workers/scripts/$WORKER_NAME"

# Bindings aus wrangler.jsonc nachbauen (plain_text-Vars)
BINDINGS='[{"type":"plain_text","name":"DEPLOYMENT_ENV","text":"preview"}'
if [[ -n "${CORS_ALLOW_ORIGIN:-}" ]]; then
  BINDINGS+=",{\"type\":\"plain_text\",\"name\":\"CORS_ALLOW_ORIGIN\",\"text\":\"$CORS_ALLOW_ORIGIN\"}"
fi
BINDINGS+=']'

METADATA=$(jq -n \
  --arg main "$MAIN_MODULE" \
  --arg date "$COMPAT_DATE" \
  --argjson bindings "$BINDINGS" \
  '{main_module: $main,
    compatibility_date: $date,
    bindings: $bindings,
    observability: {enabled: true, head_sampling_rate: 1}}')

BOUNDARY="----deploy$RANDOM$RANDOM"

api_call() {
  local method="$1" url="$2" body="$3" ctype="$4"
  local args=(-sS -X "$method" "$url" \
    -H "Authorization: Bearer $CF_API_TOKEN")
  [[ -n "$ctype" ]] && args+=(-H "Content-Type: $ctype")
  [[ -n "$body" ]] && args+=(--data "$body")
  curl "${args[@]}"
}

cf_check() {
  jq -e '.success == true' >/dev/null \
    || { echo "Cloudflare-API-Fehler:" >&2; jq . >&2; exit 1; }
}

echo "→ Deploye Worker '$WORKER_NAME' (Modul-Upload per REST API)…"

RESP=$( {
  printf -- '--%s\r\n' "$BOUNDARY"
  printf 'Content-Disposition: form-data; name="metadata"; filename="metadata.json"\r\n'
  printf 'Content-Type: application/json\r\n\r\n'
  printf '%s\r\n' "$METADATA"
  printf -- '--%s\r\n' "$BOUNDARY"
  printf 'Content-Disposition: form-data; name="%s"; filename="%s"\r\n' "$MAIN_MODULE" "$MAIN_MODULE"
  printf 'Content-Type: text/application_module+worker\r\n\r\n'
  cat "$MAIN_FILE"
  printf '\r\n--%s--\r\n' "$BOUNDARY"
} | curl -sS -X PUT "$API" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: multipart/form-data; boundary=$BOUNDARY" \
    --data-binary @- )

echo "$RESP" | cf_check
echo "✓ Worker deployiert."

# Optional: Secret OPENAI_API_KEY setzen (überschreibt ein bestehendes)
if [[ -n "${CF_OPENAI_API_KEY:-}" ]]; then
  echo "→ Setze Secret OPENAI_API_KEY…"
  SECRET_BODY=$(jq -n --arg t "$CF_OPENAI_API_KEY" '{name: "OPENAI_API_KEY", text: $t, type: "worker"}')
  api_call PUT "$API/secrets" "$SECRET_BODY" 'application/json' | cf_check
  echo "✓ Secret gesetzt."
fi

# workers.dev-Subdomain für Smoke-Test ermitteln
SUBDOMAIN=$(api_call GET "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/workers/subdomain" '' '' \
  | jq -r '.result.subdomain // empty')
if [[ -n "$SUBDOMAIN" ]]; then
  echo
  echo "URL: https://$WORKER_NAME.$SUBDOMAIN.workers.dev"
  echo "Smoke-Test:"
  echo "  curl -s -X OPTIONS -i https://$WORKER_NAME.$SUBDOMAIN.workers.dev/api/v1/extract-skills"
  echo "  curl -s -X POST https://$WORKER_NAME.$SUBDOMAIN.workers.dev/api/v1/gap-analysis \\"
  echo "       -H 'Content-Type: application/json' \\"
  echo "       -d '{\"user_skills\":[\"JavaScript\"],\"target_role_requirements\":[\"javascript\",\"kubernetes\"]}'"
fi
