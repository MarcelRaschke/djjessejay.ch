#!/usr/bin/env bash
# Container-Einstiegspunkt
set -euo pipefail

# SSH-Dienst starten
service ssh start 2>/dev/null || true

# Virtuellen Framebuffer starten (für GUI-Apps ohne echten Monitor)
if ! pgrep Xvfb > /dev/null 2>&1; then
  Xvfb :1 -screen 0 1920x1080x24 &
  export DISPLAY=:1
fi

# Fenster-Manager starten
if ! pgrep fluxbox > /dev/null 2>&1; then
  DISPLAY=:1 fluxbox &
fi

echo "============================================"
echo " Kali Linux Cloud – bereit"
echo "============================================"
echo " OpenClaw:         $(command -v openclaw          2>/dev/null || echo 'nicht gefunden')"
echo " Telegram Desktop: $(command -v telegram-desktop  2>/dev/null || echo 'nicht gefunden')"
echo " HexStrike AI:     $(command -v hexstrike         2>/dev/null || echo 'nicht gefunden')"
echo " SSH:              Port 22"
echo " DISPLAY:          ${DISPLAY:-:1}"
echo "============================================"

exec "$@"
