#!/usr/bin/env bash
# =============================================================================
# deploy-gateway.sh – Cloudflare Worker API Gateway deployen
# djjessejay.ch/api → api.anthropic.com (sicherer Proxy)
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[-]${NC} $*" >&2; }
info() { echo -e "${CYAN}[*]${NC} $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

info "Cloudflare API Gateway – Deploy"
info "================================"
info "Route: djjessejay.ch/api/claude → api.anthropic.com"

# ---- Wrangler prüfen / installieren ----
if ! command -v wrangler &>/dev/null; then
  warn "Wrangler nicht gefunden – installiere global..."
  npm install -g wrangler
fi

log "Wrangler Version: $(wrangler --version)"

# ---- API-Key konfigurieren ----
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  warn "ANTHROPIC_API_KEY nicht gesetzt."
  warn "Jetzt als Cloudflare Secret hinterlegen (sicher, wird nicht in Git gespeichert):"
  cd "$SCRIPT_DIR"
  wrangler secret put ANTHROPIC_API_KEY
else
  log "ANTHROPIC_API_KEY gefunden – als Cloudflare Secret speichern..."
  echo "$ANTHROPIC_API_KEY" | wrangler secret put ANTHROPIC_API_KEY
fi

# ---- Gateway deployen ----
log "Deploye Worker nach Cloudflare..."
cd "$SCRIPT_DIR"
wrangler deploy

log "Gateway erfolgreich deployed!"
log "Endpoint: https://djjessejay.ch/api/claude"
echo ""
info "Test-Request:"
echo '  curl -X POST https://djjessejay.ch/api/claude \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"model":"claude-sonnet-4-6","max_tokens":100,"messages":[{"role":"user","content":"Hallo"}]}'"'"
