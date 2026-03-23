#!/bin/bash
# =============================================================================
# Kali Linux Deploy Setup – PRITOM TAB10 Max (Allwinner A133)
# Läuft INNERHALB des Kali-Containers (nach Linux Deploy Installation)
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[-]${NC} $*" >&2; }
info() { echo -e "${CYAN}[*]${NC} $*"; }

info "Kali Linux Deploy Setup – PRITOM TAB10 Max"
info "=========================================="

# Root-Check
if [ "$(id -u)" -ne 0 ]; then
    err "Als root ausführen: sudo $0"
    exit 1
fi

# ---- System Update ----
log "System wird aktualisiert..."
apt-get update -qq
apt-get upgrade -y -qq

# ---- Basis-Tools ----
log "Basis-Tools werden installiert..."
apt-get install -y -qq \
    curl wget git vim nano \
    net-tools iputils-ping \
    openssh-server \
    python3 python3-pip \
    tmux screen \
    zip unzip p7zip-full

# ---- XFCE4 Desktop ----
log "XFCE4 Desktop wird installiert..."
apt-get install -y -qq \
    xfce4 \
    xfce4-terminal \
    xfce4-goodies \
    dbus-x11 \
    x11-xserver-utils

# ---- VNC Server ----
log "VNC Server wird installiert..."
apt-get install -y -qq tightvncserver

# VNC Passwort setzen (interaktiv)
echo ""
warn "VNC Passwort setzen (min. 6 Zeichen):"
vncpasswd

# VNC Startup-Script
mkdir -p ~/.vnc
cat > ~/.vnc/xstartup << 'EOF'
#!/bin/bash
export XKL_XMODMAP_DISABLE=1
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
exec startxfce4
EOF
chmod +x ~/.vnc/xstartup

# ---- SSH Server ----
log "SSH Server konfigurieren..."
mkdir -p /var/run/sshd
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
service ssh start || true

# ---- Top 10 Kali Tools ----
log "Kali Top-10 Tools werden installiert..."
apt-get install -y -qq \
    nmap \
    netcat-openbsd \
    wireshark \
    hydra \
    john \
    hashcat \
    sqlmap \
    aircrack-ng \
    nikto \
    dirb \
    gobuster \
    masscan

# ---- Metasploit ----
info "Metasploit Framework installieren? (dauert ~10 min) [j/N]"
read -r INSTALL_MSF
if [[ "$INSTALL_MSF" =~ ^[jJyY]$ ]]; then
    log "Metasploit wird installiert..."
    apt-get install -y -qq metasploit-framework
    # Datenbank initialisieren
    msfdb init || warn "MSF DB Init fehlgeschlagen – später manuell: msfdb init"
fi

# ---- Python Pentest Tools ----
log "Python Pentest-Tools werden installiert..."
pip3 install --quiet \
    impacket \
    requests \
    scapy \
    pwntools \
    crackmapexec 2>/dev/null || true

# ---- HexStrike AI Setup ----
info "HexStrike AI MCP-Server installieren? [j/N]"
read -r INSTALL_HEXSTRIKE
if [[ "$INSTALL_HEXSTRIKE" =~ ^[jJyY]$ ]]; then
    log "HexStrike AI wird eingerichtet..."
    mkdir -p /opt/hexstrike-ai
    python3 -m venv /opt/hexstrike-ai/hexstrike-env
    /opt/hexstrike-ai/hexstrike-env/bin/pip install --quiet \
        mcp anthropic fastapi uvicorn
    log "HexStrike AI Basis eingerichtet. Siehe kali-cloud/README.md für Details."
fi

# ---- Startskript ----
log "Startskript wird erstellt..."
cat > /usr/local/bin/start-kali.sh << 'EOF'
#!/bin/bash
# SSH starten
service ssh start
# VNC auf Display :1 starten (1280x800 für Tab10)
vncserver :1 -geometry 1280x800 -depth 24 -localhost no
echo ""
echo "=== Kali Linux läuft ==="
echo "VNC:  127.0.0.1:5900 (VNC Viewer App auf Tablet)"
echo "SSH:  ssh root@localhost"
echo ""
EOF
chmod +x /usr/local/bin/start-kali.sh

# ---- Zusammenfassung ----
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Kali Linux Setup abgeschlossen!         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
log "Kali starten:    /usr/local/bin/start-kali.sh"
log "VNC verbinden:   127.0.0.1:5900 (bVNC App)"
log "SSH verbinden:   ssh root@localhost"
echo ""
warn "Wichtig: VNC Viewer App auf Android installieren (bVNC Free)"
warn "Empfohlen: adb forward tcp:5900 tcp:5900 für PC-Zugriff"
