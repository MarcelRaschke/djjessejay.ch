#!/usr/bin/env bash
# =============================================================================
# OpenClaw.sh – Captain Claw Startskript
# djjessejay.ch · kali-cloud
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

info "OpenClaw – Captain Claw Launcher"
info "================================="

# ---- OpenClaw installieren falls nicht vorhanden ----
if ! command -v openclaw &>/dev/null; then
  warn "OpenClaw nicht gefunden – starte Installation..."
  if [ -f "${SCRIPT_DIR}/install-anyclaw.sh" ]; then
    bash "${SCRIPT_DIR}/install-anyclaw.sh"
  else
    err "install-anyclaw.sh nicht gefunden in ${SCRIPT_DIR}"
    exit 1
  fi
fi

# ---- Display sicherstellen ----
if [ -z "${DISPLAY:-}" ]; then
  # Virtuellen Framebuffer starten falls kein Display vorhanden
  if command -v Xvfb &>/dev/null; then
    if ! pgrep -x Xvfb > /dev/null 2>&1; then
      log "Starte virtuellen Framebuffer (Xvfb :1)..."
      Xvfb :1 -screen 0 1280x800x24 &
      sleep 1
    fi
    export DISPLAY=:1
    log "DISPLAY gesetzt: ${DISPLAY}"
  else
    warn "Kein DISPLAY gesetzt und Xvfb nicht verfügbar."
    warn "Auf Desktop ausführen oder: export DISPLAY=:0"
  fi
fi

# ---- OpenClaw starten ----
log "Starte OpenClaw..."
log "Spiel läuft auf DISPLAY=${DISPLAY:-nicht gesetzt}"
echo ""

exec openclaw "$@"
