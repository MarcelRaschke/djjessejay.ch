#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  ULTIMATE HACKER SETUP – djjessejay.ch                                     ║
# ║  Stack: Kali Linux · HexStrike AI · Claude Code (Opus 4.6) · OpenClaw     ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

LOGFILE="/var/log/kali-cloud-setup.log"
exec > >(tee -a "$LOGFILE") 2>&1

info()  { echo -e "\e[32m[INFO]\e[0m  $*"; }
warn()  { echo -e "\e[33m[WARN]\e[0m  $*"; }
error() { echo -e "\e[31m[ERROR]\e[0m $*" >&2; exit 1; }
step()  { echo -e "\n\e[1;36m══ $* ══\e[0m"; }

require_root() {
  [[ $EUID -eq 0 ]] || error "Root erforderlich (sudo ./setup.sh)"
}

# ── System Update ───────────────────────────────────────────────────────────────
update_system() {
  step "System Update"
  apt-get update -qq
  apt-get upgrade -y -qq
  apt-get install -y -qq \
    curl wget git unzip ca-certificates gnupg lsb-release \
    software-properties-common apt-transport-https \
    build-essential cmake pkg-config
}

# ── Kali Linux Security Tools ───────────────────────────────────────────────────
install_kali_tools() {
  step "Kali Security Tools"
  info "Installiere vollständiges Pentest-Arsenal..."

  apt-get install -y -qq \
    nmap masscan rustscan \
    metasploit-framework \
    sqlmap \
    gobuster dirb \
    nikto \
    hydra medusa \
    john hashcat \
    aircrack-ng \
    wireshark-common tshark \
    netcat-traditional ncat socat \
    tcpdump \
    exploitdb \
    impacket-scripts \
    crackmapexec \
    responder \
    evil-winrm \
    smbclient \
    enum4linux \
    whatweb \
    wafw00f \
    dnsrecon \
    theharvester \
    proxychains4 \
    tor \
    wordlists \
    seclists \
    p0f \
    hping3 \
    arping \
    arp-scan \
    netdiscover \
    nbtscan \
    onesixtyone \
    snmp \
    ldap-utils \
    smtp-user-enum \
    swaks \
    ftp \
    telnet \
    rlwrap \
    pwncat \
    upx-ucl \
    binwalk \
    foremost \
    steghide \
    stegseek \
    exiftool \
    file \
    strings \
    xxd \
    ltrace strace \
    gdb pwndbg \
    radare2 \
    ghidra \
    jq yq \
    python3-impacket \
    python3-pwntools \
    ruby ruby-dev \
    perl \
    2>/dev/null || warn "Einige Tools nicht verfügbar – werden übersprungen"

  # SecLists sicherstellen
  if [[ ! -d /usr/share/seclists ]]; then
    git clone --depth 1 https://github.com/danielmiessler/SecLists.git \
      /usr/share/seclists 2>/dev/null || \
    ln -sf /usr/share/wordlists/seclists /usr/share/seclists 2>/dev/null || true
  fi

  info "Kali Security Tools installiert ✓"
}

# ── OpenClaw ────────────────────────────────────────────────────────────────────
install_openclaw() {
  step "OpenClaw"
  if dpkg -l openclaw &>/dev/null; then
    info "OpenClaw bereits installiert."
    return
  fi

  if apt-cache show openclaw &>/dev/null; then
    apt-get install -y openclaw
  else
    warn "OpenClaw nicht im APT-Cache – baue aus Source..."
    apt-get install -y -qq libsdl2-dev libsdl2-image-dev \
      libsdl2-mixer-dev libsdl2-ttf-dev libphysfs-dev
    local TMP; TMP=$(mktemp -d)
    git clone --depth 1 https://github.com/OpenClaw/OpenClaw.git "$TMP/OpenClaw"
    cmake -S "$TMP/OpenClaw" -B "$TMP/build" -DCMAKE_BUILD_TYPE=Release
    cmake --build "$TMP/build" -j"$(nproc)"
    cmake --install "$TMP/build"
    rm -rf "$TMP"
  fi
  info "OpenClaw installiert ✓"
}

# ── Telegram Desktop ────────────────────────────────────────────────────────────
install_telegram() {
  step "Telegram Desktop"
  if command -v telegram-desktop &>/dev/null; then
    info "Telegram Desktop bereits installiert."
    return
  fi

  local VERSION="5.3.2"
  local URL="https://updates.tdesktop.com/tlinux/tsetup.${VERSION}.tar.xz"
  local DEST="/opt/telegram"

  mkdir -p "$DEST"
  wget -q --show-progress -O /tmp/tsetup.tar.xz "$URL"
  tar -xf /tmp/tsetup.tar.xz -C "$DEST" --strip-components=1
  rm -f /tmp/tsetup.tar.xz
  ln -sf "$DEST/Telegram" /usr/local/bin/telegram-desktop

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
  info "Telegram Desktop installiert ✓"
}

# ── HexStrike AI ────────────────────────────────────────────────────────────────
install_hexstrike() {
  step "HexStrike AI"
  apt-get install -y -qq python3 python3-pip python3-venv chromium

  local DEST="/opt/hexstrike-ai"

  if [[ -d "$DEST/.git" ]]; then
    info "HexStrike AI bereits vorhanden – aktualisiere..."
    git -C "$DEST" pull --ff-only
  else
    git clone --depth 1 https://github.com/0x4m4/hexstrike-ai.git "$DEST"
  fi

  python3 -m venv "$DEST/hexstrike-env"
  "$DEST/hexstrike-env/bin/pip" install --quiet --upgrade pip
  "$DEST/hexstrike-env/bin/pip" install --quiet -r "$DEST/requirements.txt"

  # Wrapper-Skript
  cat > /usr/local/bin/hexstrike <<'WRAPPER'
#!/usr/bin/env bash
source /opt/hexstrike-ai/hexstrike-env/bin/activate
exec python3 /opt/hexstrike-ai/hexstrike_mcp.py --server http://127.0.0.1:13145 "$@"
WRAPPER
  chmod +x /usr/local/bin/hexstrike

  # Server-Start-Skript
  cat > /usr/local/bin/hexstrike-server <<'SRV'
#!/usr/bin/env bash
source /opt/hexstrike-ai/hexstrike-env/bin/activate
exec python3 /opt/hexstrike-ai/hexstrike_server.py --port 13145 "$@"
SRV
  chmod +x /usr/local/bin/hexstrike-server

  info "HexStrike AI installiert ✓"
}

# ── HexStrike systemd Service ───────────────────────────────────────────────────
install_hexstrike_service() {
  step "HexStrike systemd Service"

  cat > /etc/systemd/system/hexstrike.service <<'SERVICE'
[Unit]
Description=HexStrike AI Tools API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/hexstrike-ai
Environment=PYTHONPATH=/opt/hexstrike-ai
ExecStart=/opt/hexstrike-ai/hexstrike-env/bin/python3 /opt/hexstrike-ai/hexstrike_server.py --port 13145
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

  systemctl daemon-reload
  systemctl enable hexstrike
  systemctl start hexstrike
  sleep 2

  if systemctl is-active --quiet hexstrike; then
    info "HexStrike Service läuft auf Port 13145 ✓"
  else
    warn "HexStrike Service konnte nicht gestartet werden – manuell starten mit: hexstrike-server"
  fi
}

# ── Claude Code CLI ─────────────────────────────────────────────────────────────
install_claude_code() {
  step "Claude Code CLI"

  # Node.js (LTS) via NodeSource
  if ! command -v node &>/dev/null; then
    info "Installiere Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - 2>/dev/null
    apt-get install -y -qq nodejs
  fi
  info "Node.js $(node --version) ✓"

  # Claude Code CLI
  if ! command -v claude &>/dev/null; then
    npm install -g @anthropic-ai/claude-code
  else
    npm update -g @anthropic-ai/claude-code 2>/dev/null || true
  fi
  info "Claude Code $(claude --version 2>/dev/null || echo 'installiert') ✓"
}

# ── Claude Code Konfiguration (Opus 4.6 + HexStrike MCP) ───────────────────────
configure_claude_code() {
  step "Claude Code Konfiguration"

  mkdir -p /root/.claude

  # Globale Claude Code Settings: Opus 4.6 + HexStrike AI als MCP-Server
  cat > /root/.claude/settings.json <<'CLAUDECFG'
{
  "model": "claude-opus-4-6",
  "mcpServers": {
    "hexstrike-ai": {
      "command": "/opt/hexstrike-ai/hexstrike-env/bin/python3",
      "args": [
        "/opt/hexstrike-ai/hexstrike_mcp.py",
        "--server", "http://127.0.0.1:13145"
      ],
      "env": {
        "PYTHONPATH": "/opt/hexstrike-ai"
      }
    }
  },
  "permissions": {
    "allow": [
      "Bash(*)",
      "Read(*)",
      "Write(*)",
      "Edit(*)",
      "Glob(*)",
      "Grep(*)",
      "WebFetch(*)",
      "WebSearch(*)"
    ]
  }
}
CLAUDECFG

  # CLAUDE.md: System-Kontext für den Hacker-Assistenten
  cat > /root/CLAUDE.md <<'CLAUDEMD'
# HexStrike AI – Offensive Security Assistant

Du bist ein erstklassiger Penetration-Tester und Red-Team-Operator mit Zugriff auf:

## Verfügbare Tools
- **HexStrike AI MCP** (`hexstrike-ai`): 150+ Offensivsicherheits-Tools via AI-API
- **Kali Linux Arsenal**: nmap, metasploit, sqlmap, hydra, john, hashcat, gobuster, nikto, burpsuite, aircrack-ng, impacket, crackmapexec, bloodhound, evil-winrm, responder, ...
- **Claude Code**: Vollständige Codebearbeitung, Shell-Zugriff, Websuche

## Betriebsmodus
- Alle Aktionen nur auf **autorisierten Zielen** (CTF, eigene Systeme, explizit beauftragte Pentests)
- Strukturiertes Vorgehen: Recon → Enumeration → Exploitation → Post-Exploitation → Report
- HexStrike für automatisierte Scans, manuelle Verifikation aller kritischen Findings

## HexStrike Schnellstart
```bash
# Server läuft auf Port 13145
hexstrike-server &        # Server starten (falls nicht als Service aktiv)
hexstrike                 # MCP-Client verbinden
curl http://127.0.0.1:13145/health  # Status prüfen
```

## Workflow-Templates
- **Web-Pentest**: nikto + gobuster + sqlmap + burpsuite + whatweb
- **Netzwerk**: nmap -sV -sC, masscan, enum4linux, responder
- **Active Directory**: bloodhound, crackmapexec, impacket-GetUserSPNs
- **Wireless**: aircrack-ng Suite, hostapd-wpe
- **CTF/Binary**: pwntools, gdb + pwndbg, radare2, ghidra

## Wichtig
NUR für autorisierte Sicherheitstests mit expliziter schriftlicher Genehmigung.
CLAUDEMD

  info "Claude Code konfiguriert: Modell=claude-opus-4-6, MCP=hexstrike-ai ✓"
  info "CLAUDE.md erstellt: /root/CLAUDE.md ✓"
}

# ── MCP-Konfiguration (auch für andere MCP-Clients) ────────────────────────────
configure_mcp() {
  step "MCP Konfiguration"
  mkdir -p /root/.config/hexstrike

  cat > /root/.config/hexstrike/mcp.json <<'MCP'
{
  "mcpServers": {
    "hexstrike-ai": {
      "command": "/opt/hexstrike-ai/hexstrike-env/bin/python3",
      "args": ["/opt/hexstrike-ai/hexstrike_mcp.py", "--server", "http://127.0.0.1:13145"],
      "env": {
        "PYTHONPATH": "/opt/hexstrike-ai"
      }
    }
  }
}
MCP
  info "MCP-Konfiguration → /root/.config/hexstrike/mcp.json ✓"
}

# ── Telegram CLI (optional) ─────────────────────────────────────────────────────
install_telegram_cli() {
  apt-get install -y -qq telegram-cli 2>/dev/null || true
}

# ── Firewall ────────────────────────────────────────────────────────────────────
configure_firewall() {
  step "Firewall"
  apt-get install -y -qq ufw
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow ssh
  ufw --force enable
  info "UFW Firewall aktiv ✓"
}

# ── Zusammenfassung ─────────────────────────────────────────────────────────────
print_summary() {
  echo ""
  echo -e "\e[1;31m╔══════════════════════════════════════════════════════════════╗\e[0m"
  echo -e "\e[1;31m║  ULTIMATE HACKER SETUP – BEREIT                              ║\e[0m"
  echo -e "\e[1;31m╚══════════════════════════════════════════════════════════════╝\e[0m"
  echo -e " \e[32mClaude Code:\e[0m   $(command -v claude            2>/dev/null || echo 'nicht im PATH')"
  echo -e " \e[32mModell:\e[0m         claude-opus-4-6"
  echo -e " \e[32mHexStrike AI:\e[0m  $(command -v hexstrike         2>/dev/null || echo 'nicht im PATH')"
  echo -e " \e[32mHexStrike Port:\e[0m 13145"
  echo -e " \e[32mNmap:\e[0m           $(command -v nmap              2>/dev/null || echo 'nicht im PATH')"
  echo -e " \e[32mMetasploit:\e[0m     $(command -v msfconsole        2>/dev/null || echo 'nicht im PATH')"
  echo -e " \e[32mSQLMap:\e[0m         $(command -v sqlmap            2>/dev/null || echo 'nicht im PATH')"
  echo -e " \e[32mOpenClaw:\e[0m       $(command -v openclaw          2>/dev/null || echo 'nicht im PATH')"
  echo -e " \e[32mTelegram:\e[0m       $(command -v telegram-desktop  2>/dev/null || echo 'nicht im PATH')"
  echo -e " \e[32mLog:\e[0m            $LOGFILE"
  echo ""
  echo -e "\e[1;33m  Starte mit: claude  (nutzt Opus 4.6 + HexStrike AI MCP)\e[0m"
  echo ""
}

main() {
  require_root
  update_system
  install_kali_tools
  install_openclaw
  install_telegram
  install_telegram_cli
  install_hexstrike
  install_hexstrike_service
  install_claude_code
  configure_claude_code
  configure_mcp
  configure_firewall
  print_summary
}

main "$@"
