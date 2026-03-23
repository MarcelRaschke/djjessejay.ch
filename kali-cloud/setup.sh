#!/usr/bin/env bash
# Kali Linux Cloud Instance Setup
# Installs: OpenClaw, Telegram
set -euo pipefail

LOGFILE="/var/log/kali-cloud-setup.log"
exec > >(tee -a "$LOGFILE") 2>&1

info()  { echo "[INFO]  $*"; }
warn()  { echo "[WARN]  $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

require_root() {
  [[ $EUID -eq 0 ]] || error "Dieses Skript muss als root ausgeführt werden (sudo ./setup.sh)"
}

# ── System Update ──────────────────────────────────────────────────────────────
update_system() {
  info "Systemaktualisierung..."
  apt-get update -qq
  apt-get upgrade -y -qq
  apt-get install -y -qq \
    curl wget git unzip ca-certificates gnupg lsb-release \
    software-properties-common apt-transport-https
}

# ── OpenClaw ───────────────────────────────────────────────────────────────────
install_openclaw() {
  info "Installiere OpenClaw..."
  if dpkg -l openclaw &>/dev/null; then
    info "OpenClaw ist bereits installiert."
    return
  fi

  # OpenClaw ist im Kali-Repository verfügbar
  if apt-cache show openclaw &>/dev/null; then
    apt-get install -y openclaw
  else
    warn "OpenClaw nicht im APT-Cache gefunden – versuche manuelle Installation..."
    # Fallback: aus GitHub-Releases bauen
    apt-get install -y -qq build-essential cmake libsdl2-dev libsdl2-image-dev \
      libsdl2-mixer-dev libsdl2-ttf-dev libphysfs-dev
    local TMP; TMP=$(mktemp -d)
    git clone --depth 1 https://github.com/OpenClaw/OpenClaw.git "$TMP/OpenClaw"
    cmake -S "$TMP/OpenClaw" -B "$TMP/build" -DCMAKE_BUILD_TYPE=Release
    cmake --build "$TMP/build" -j"$(nproc)"
    cmake --install "$TMP/build"
    rm -rf "$TMP"
  fi
  info "OpenClaw installiert."
}

# ── Telegram Desktop ───────────────────────────────────────────────────────────
install_telegram() {
  info "Installiere Telegram Desktop..."
  if command -v telegram-desktop &>/dev/null; then
    info "Telegram Desktop ist bereits installiert."
    return
  fi

  # Offizielle Telegram-Binärdatei
  local VERSION="5.3.2"
  local URL="https://updates.tdesktop.com/tlinux/tsetup.${VERSION}.tar.xz"
  local DEST="/opt/telegram"

  mkdir -p "$DEST"
  wget -q --show-progress -O /tmp/tsetup.tar.xz "$URL"
  tar -xf /tmp/tsetup.tar.xz -C "$DEST" --strip-components=1
  rm -f /tmp/tsetup.tar.xz

  # Symlink für alle Benutzer
  ln -sf "$DEST/Telegram" /usr/local/bin/telegram-desktop

  # .desktop-Eintrag
  cat > /usr/share/applications/telegram-desktop.desktop <<DESKTOP
[Desktop Entry]
Version=1.0
Name=Telegram Desktop
Comment=Official Telegram messenger
Exec=/usr/local/bin/telegram-desktop -- %u
Icon=${DEST}/Telegram
Terminal=false
Type=Application
Categories=Network;InstantMessaging;
MimeType=x-scheme-handler/tg;
DESKTOP

  info "Telegram Desktop installiert → /usr/local/bin/telegram-desktop"
}

# ── Telegram CLI (Bonus) ────────────────────────────────────────────────────────
install_telegram_cli() {
  info "Installiere telegram-cli..."
  if command -v telegram-cli &>/dev/null; then
    info "telegram-cli bereits installiert."
    return
  fi
  apt-get install -y -qq telegram-cli 2>/dev/null || {
    warn "telegram-cli nicht per APT verfügbar – überspringe."
  }
}

# ── Firewall ────────────────────────────────────────────────────────────────────
configure_firewall() {
  info "Konfiguriere UFW-Firewall..."
  apt-get install -y -qq ufw
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow ssh
  # Telegram nutzt Port 443 und 80 (ausgehend – already allowed)
  ufw --force enable
  info "Firewall aktiv. Status:"
  ufw status verbose
}

# ── Zusammenfassung ─────────────────────────────────────────────────────────────
print_summary() {
  info "═══════════════════════════════════════════"
  info " Kali Linux Cloud Setup abgeschlossen"
  info "═══════════════════════════════════════════"
  info " OpenClaw:         $(command -v openclaw   2>/dev/null || echo 'nicht im PATH')"
  info " Telegram Desktop: $(command -v telegram-desktop 2>/dev/null || echo 'nicht im PATH')"
  info " Log:              $LOGFILE"
  info "═══════════════════════════════════════════"
}

main() {
  require_root
  update_system
  install_openclaw
  install_telegram
  install_telegram_cli
  configure_firewall
  print_summary
}

main "$@"
