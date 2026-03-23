#!/usr/bin/env bash
# Container-Einstiegspunkt – fsociety (Mr. Robot Setup)
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

# HexStrike AI Server starten (Port 13145)
if ! curl -s http://127.0.0.1:13145/health &>/dev/null; then
  echo "[*] Starte HexStrike AI Server auf Port 13145..."
  PYTHONPATH=/opt/hexstrike-ai \
    /opt/hexstrike-ai/hexstrike-env/bin/python3 \
    /opt/hexstrike-ai/hexstrike_server.py --port 13145 \
    >> /var/log/hexstrike.log 2>&1 &
  sleep 3
fi

HEXSTRIKE_STATUS="nicht gestartet"
if curl -s http://127.0.0.1:13145/health &>/dev/null; then
  HEXSTRIKE_STATUS="läuft auf Port 13145 ✓"
fi

echo ""
echo -e "\e[1;31m╔══════════════════════════════════════════════════════════════╗\e[0m"
echo -e "\e[1;31m║  fsociety – \"Hello, Friend.\"                                  ║\e[0m"
echo -e "\e[1;31m║  Mr. Robot SubAgent Cluster – bereit                         ║\e[0m"
echo -e "\e[1;31m╚══════════════════════════════════════════════════════════════╝\e[0m"
echo -e " \e[32mClaude Code:\e[0m   $(command -v claude           2>/dev/null || echo 'nicht gefunden')"
echo -e " \e[32mModell:\e[0m        claude-opus-4-6"
echo -e " \e[32mHexStrike AI:\e[0m  $HEXSTRIKE_STATUS"
echo -e " \e[32mNmap:\e[0m          $(command -v nmap             2>/dev/null || echo 'nicht gefunden')"
echo -e " \e[32mMetasploit:\e[0m    $(command -v msfconsole       2>/dev/null || echo 'nicht gefunden')"
echo -e " \e[32mSQLMap:\e[0m        $(command -v sqlmap           2>/dev/null || echo 'nicht gefunden')"
echo -e " \e[32mOpenClaw:\e[0m      $(command -v openclaw         2>/dev/null || echo 'nicht gefunden')"
echo -e " \e[32mTelegram:\e[0m      $(command -v telegram-desktop 2>/dev/null || echo 'nicht gefunden')"
echo -e " \e[32mSSH:\e[0m           Port 22"
echo -e " \e[32mDISPLAY:\e[0m       ${DISPLAY:-:1}"
echo ""
echo -e "\e[1;33m  claude  →  \"Hello, Friend.\" – Elliot Alderson erwartet dich\e[0m"
echo -e "\e[1;33m  hack <target> full  →  fsociety – alle Agents parallel\e[0m"
echo ""

exec "$@"
