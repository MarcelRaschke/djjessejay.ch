#!/usr/bin/env bash
# Container-Einstiegspunkt – fsociety · Hello, Friend.
set -euo pipefail

# SSH-Dienst starten
service ssh start 2>/dev/null || true

# Virtuellen Framebuffer starten (für GUI-Apps ohne echten Monitor)
export DISPLAY=:1
if ! pgrep Xvfb > /dev/null 2>&1; then
  Xvfb :1 -screen 0 1920x1080x24 &
fi

# Fenster-Manager starten
if ! pgrep fluxbox > /dev/null 2>&1; then
  DISPLAY=:1 fluxbox &
fi

# HexStrike AI Server starten (Port 13145)
HEXSTRIKE_STATUS="nicht gestartet"
if ! curl -s http://127.0.0.1:13145/health &>/dev/null; then
  echo "[*] HexStrike AI hochfahren... Evil Corp schläft noch."
  PYTHONPATH=/opt/hexstrike-ai \
    /opt/hexstrike-ai/hexstrike-env/bin/python3 \
    /opt/hexstrike-ai/hexstrike_server.py --port 13145 \
    >> /var/log/hexstrike.log 2>&1 &
  for _ in $(seq 1 15); do
    sleep 1
    curl -s http://127.0.0.1:13145/health &>/dev/null && break
  done
fi

if curl -s http://127.0.0.1:13145/health &>/dev/null; then
  HEXSTRIKE_STATUS="läuft auf Port 13145 ✓"
fi

echo ""
echo -e "\e[1;32m╔══════════════════════════════════════════════════════════════╗\e[0m"
echo -e "\e[1;32m║  fsociety – Hello, Friend.                                    ║\e[0m"
echo -e "\e[1;32m║  Elliot Alderson · Zero-Day Legend · Stage 1 bereit           ║\e[0m"
echo -e "\e[1;32m╚══════════════════════════════════════════════════════════════╝\e[0m"
echo -e " \e[32mElliot (Claude Code):\e[0m  $(command -v claude           2>/dev/null || echo 'nicht gefunden')"
echo -e " \e[32mGehirn:\e[0m               claude-opus-4-6"
echo -e " \e[32mfsociety Arsenal:\e[0m     $HEXSTRIKE_STATUS"
echo -e " \e[32mNmap:\e[0m                 $(command -v nmap             2>/dev/null || echo 'nicht gefunden')"
echo -e " \e[32mMetasploit:\e[0m           $(command -v msfconsole       2>/dev/null || echo 'nicht gefunden')"
echo -e " \e[32mSQLMap:\e[0m               $(command -v sqlmap           2>/dev/null || echo 'nicht gefunden')"
echo -e " \e[32mOpenClaw:\e[0m             $(command -v openclaw         2>/dev/null || echo 'nicht gefunden')"
echo -e " \e[32mTelegram:\e[0m             $(command -v telegram-desktop 2>/dev/null || echo 'nicht gefunden')"
echo -e " \e[32mSSH:\e[0m                  Port 22"
echo -e " \e[32mDISPLAY:\e[0m              ${DISPLAY:-:1}"
echo ""
echo -e "\e[1;32m  claude             → \"Hello, Friend.\" – Elliot online · Opus 4.6 · HexStrike\e[0m"
echo -e "\e[0;32m  hack <target> full → fsociety · Stage 1 · alle 5 Operatives parallel\e[0m"
echo ""

exec "$@"
