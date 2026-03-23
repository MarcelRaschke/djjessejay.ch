#!/usr/bin/env bash
# =============================================================================
# install-anyclaw.sh – OpenClaw (Captain Claw) Installer
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

info "AnyClaw / OpenClaw – Installer"
info "================================"

# Root-Check
if [ "$(id -u)" -ne 0 ]; then
  err "Als root ausführen: sudo $0"
  exit 1
fi

# Bereits installiert?
if command -v openclaw &>/dev/null; then
  info "OpenClaw ist bereits installiert: $(command -v openclaw)"
  exit 0
fi

# ---- Versuche APT ----
log "Prüfe APT-Paket..."
apt-get update -qq
if apt-cache show openclaw &>/dev/null 2>&1; then
  log "Installiere über APT..."
  apt-get install -y openclaw
else
  warn "Kein APT-Paket gefunden – kompiliere aus Source (GitHub)..."

  # Build-Abhängigkeiten
  log "Installiere Build-Abhängigkeiten..."
  apt-get install -y \
    build-essential cmake git \
    libsdl2-dev libsdl2-image-dev \
    libsdl2-mixer-dev libsdl2-ttf-dev \
    libphysfs-dev

  # Quellcode holen
  TMPDIR="$(mktemp -d)"
  log "Klone OpenClaw nach ${TMPDIR}..."
  git clone --depth 1 https://github.com/OpenClaw/OpenClaw.git "${TMPDIR}/OpenClaw"

  # Bauen
  log "Konfiguriere CMake..."
  cmake -S "${TMPDIR}/OpenClaw" -B "${TMPDIR}/build" \
    -DCMAKE_BUILD_TYPE=Release

  log "Kompiliere ($(nproc) Threads)..."
  cmake --build "${TMPDIR}/build" -j"$(nproc)"

  log "Installiere..."
  cmake --install "${TMPDIR}/build"

  # Aufräumen
  rm -rf "${TMPDIR}"
fi

# Ergebnis prüfen
if command -v openclaw &>/dev/null; then
  log "OpenClaw erfolgreich installiert: $(command -v openclaw)"
  log "Starten mit: ./OpenClaw.sh   oder   openclaw"
else
  err "Installation fehlgeschlagen – 'openclaw' nicht im PATH."
  exit 1
fi
