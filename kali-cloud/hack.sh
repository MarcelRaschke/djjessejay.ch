#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  hack.sh – fsociety SubAgent Orchestrator (Mr. Robot)                      ║
# ║  "Hello, Friend." – Claude Opus 4.6 · HexStrike AI                        ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

TARGET="${1:-}"
MODE="${2:-full}"    # full | recon | web | ad | ctf

RED='\033[0;31m'    BOLD='\033[1m'   RESET='\033[0m'
GREEN='\033[0;32m'  CYAN='\033[0;36m'

banner() {
  echo -e "${GREEN}${BOLD}"
  cat <<'BANNER'
  __
 / _|___  ___   ___(_) ___| |_ _   _
| |_/ __|/ _ \ / __| |/ _ \ __| | | |
|  _\__ \ (_) | (__| |  __/ |_| |_| |
|_| |___/\___/ \___|_|\___|\__|\__, |
                                |___/
  "Hello, Friend."
  fsociety · Zero-Day Legend · Claude Opus 4.6 · HexStrike AI
BANNER
  echo -e "${RESET}"
}

usage() {
  echo -e "${CYAN}Verwendung:${RESET}"
  echo "  hack.sh <target> [mode]"
  echo ""
  echo -e "${CYAN}Modi:${RESET}"
  echo "  full    → Recon + Enum + Exploit + Report (alle Agents parallel)"
  echo "  recon   → Nur Recon-Agent"
  echo "  web     → Web-Pentest-Agent"
  echo "  ad      → Active Directory Attack Agent"
  echo "  ctf     → CTF/Binary-Agent"
  echo "  report  → Report-Agent (aus bestehenden Ergebnissen)"
  echo ""
  echo -e "${CYAN}Beispiele:${RESET}"
  echo "  hack.sh 10.10.10.1 full"
  echo "  hack.sh https://target.com web"
  echo "  hack.sh 192.168.1.0/24 recon"
  exit 1
}

check_deps() {
  command -v claude &>/dev/null      || { echo "[!] claude nicht gefunden. npm install -g @anthropic-ai/claude-code"; exit 1; }
  [[ -n "${ANTHROPIC_API_KEY:-}" ]]  || { echo "[!] ANTHROPIC_API_KEY nicht gesetzt"; exit 1; }
  curl -s http://127.0.0.1:13145/health &>/dev/null || {
    echo "[*] HexStrike Server startet..."
    hexstrike-server >> /var/log/hexstrike.log 2>&1 &
    sleep 3
  }
}

# Ergebnisverzeichnis
setup_workspace() {
  local ts; ts=$(date +%Y%m%d_%H%M%S)
  WORKSPACE="/root/pentest-reports/${TARGET//\//_}_${ts}"
  mkdir -p "$WORKSPACE"
  echo "[*] fsociety Workspace: $WORKSPACE"
}

# ── SubAgent: Recon ────────────────────────────────────────────────────────────
run_recon_agent() {
  echo -e "${GREEN}[ELLIOT] Ich fange an, alles über dich zu wissen...${RESET}"
  claude --model claude-opus-4-6 \
    --system-prompt "$(cat /opt/kali-cloud/agents/recon-agent.md 2>/dev/null || cat ~/kali-cloud/agents/recon-agent.md)" \
    --print \
    "Führe vollständige Reconnaissance auf Ziel: ${TARGET} durch.
     Speichere JSON-Ergebnisse in ${WORKSPACE}/recon.json
     Nutze alle verfügbaren Tools parallel. Starte jetzt." \
    > "${WORKSPACE}/recon.log" 2>&1 &
  RECON_PID=$!
  echo "[*] Elliot PID: $RECON_PID"
}

# ── SubAgent: Web Pentest ───────────────────────────────────────────────────────
run_web_agent() {
  echo -e "${GREEN}[DARLENE] Ich breche ein. Kein Passwort hält mich auf.${RESET}"
  claude --model claude-opus-4-6 \
    --system-prompt "Du bist ein Web Application Pentest Spezialist.
     Arsenal: nikto, gobuster, sqlmap, whatweb, wafw00f, wfuzz.
     Nutze HexStrike MCP für automatisierte Scans.
     Nur auf autorisierten Zielen." \
    --print \
    "Führe vollständigen Web-Pentest auf ${TARGET} durch.
     Phase 1: whatweb + wafw00f + nikto (parallel)
     Phase 2: gobuster mit raft-large-directories.txt
     Phase 3: sqlmap auf alle GET/POST-Parameter
     Speichere Ergebnisse in ${WORKSPACE}/web.json" \
    > "${WORKSPACE}/web.log" 2>&1 &
  WEB_PID=$!
  echo "[*] Darlene PID: $WEB_PID"
}

# ── SubAgent: Enum ─────────────────────────────────────────────────────────────
run_enum_agent() {
  echo -e "${GREEN}[DARLENE] Enumeriere alle Services. Kein Stein bleibt auf dem anderen.${RESET}"
  # Wartet auf recon.json
  ( while [[ ! -f "${WORKSPACE}/recon.json" ]]; do sleep 5; done
    claude --model claude-opus-4-6 \
      --system-prompt "$(cat /opt/kali-cloud/agents/enum-agent.md 2>/dev/null || cat ~/kali-cloud/agents/enum-agent.md)" \
      --print \
      "Recon-Ergebnisse: $(cat ${WORKSPACE}/recon.json 2>/dev/null || echo 'noch ausstehend')
       Ziel: ${TARGET}
       Enumeriere alle Services tiefgehend. Speichere in ${WORKSPACE}/enum.json" \
      > "${WORKSPACE}/enum.log" 2>&1
  ) &
  ENUM_PID=$!
  echo "[*] Darlene (Enum) PID: $ENUM_PID"
}

# ── SubAgent: Exploit ──────────────────────────────────────────────────────────
run_exploit_agent() {
  echo -e "${GREEN}[MR. ROBOT] Es ist Zeit. Wir tun, was getan werden muss.${RESET}"
  ( while [[ ! -f "${WORKSPACE}/enum.json" ]]; do sleep 5; done
    claude --model claude-opus-4-6 \
      --system-prompt "$(cat /opt/kali-cloud/agents/exploit-agent.md 2>/dev/null || cat ~/kali-cloud/agents/exploit-agent.md)" \
      --print \
      "Enum-Ergebnisse: $(cat ${WORKSPACE}/enum.json 2>/dev/null || echo 'noch ausstehend')
       Ziel: ${TARGET}
       Exploite die kritischsten Schwachstellen. Speichere in ${WORKSPACE}/exploit.json" \
      > "${WORKSPACE}/exploit.log" 2>&1
  ) &
  EXPLOIT_PID=$!
  echo "[*] Mr. Robot PID: $EXPLOIT_PID"
}

# ── SubAgent: Report ───────────────────────────────────────────────────────────
run_report_agent() {
  echo -e "${GREEN}[WHITEROSE] Zeit ist kostbar. Ich dokumentiere präzise.${RESET}"
  ( # Warte auf alle anderen Agents
    for f in recon.json enum.json; do
      while [[ ! -f "${WORKSPACE}/${f}" ]]; do sleep 10; done
    done
    claude --model claude-opus-4-6 \
      --system-prompt "$(cat /opt/kali-cloud/agents/report-agent.md 2>/dev/null || cat ~/kali-cloud/agents/report-agent.md)" \
      --print \
      "Erstelle professionellen Pentest-Report für Ziel: ${TARGET}
       Recon:   $(cat ${WORKSPACE}/recon.json   2>/dev/null | head -100)
       Enum:    $(cat ${WORKSPACE}/enum.json    2>/dev/null | head -100)
       Exploit: $(cat ${WORKSPACE}/exploit.json 2>/dev/null | head -100)
       Web:     $(cat ${WORKSPACE}/web.json     2>/dev/null | head -100)
       Speichere Report als ${WORKSPACE}/report.md" \
      > "${WORKSPACE}/report.log" 2>&1
    echo -e "${GREEN}[+] Report fertig: ${WORKSPACE}/report.md${RESET}"
  ) &
  REPORT_PID=$!
  echo "[*] Whiterose PID: $REPORT_PID"
}

# ── Fortschritts-Monitor ───────────────────────────────────────────────────────
monitor_agents() {
  echo ""
  echo -e "${CYAN}[fsociety] Cluster aktiv. \"Hello, Friend.\" Status-Check alle 30s...${RESET}"
  echo -e "${CYAN}[*] Logs: ${WORKSPACE}/${RESET}"
  echo ""

  while true; do
    sleep 30
    echo -n "[$(date +%H:%M:%S)] Aktive Operatives: "
    ACTIVE=0
    for pid_var in RECON_PID WEB_PID ENUM_PID EXPLOIT_PID REPORT_PID; do
      pid="${!pid_var:-0}"
      if kill -0 "$pid" 2>/dev/null; then
        echo -n "${pid_var%_PID}($pid) "
        ((ACTIVE++))
      fi
    done
    echo ""
    [[ $ACTIVE -eq 0 ]] && break
  done

  echo ""
  echo -e "${GREEN}${BOLD}[fsociety] Stage complete. Evil Corp hat verloren.${RESET}"
  echo -e "${GREEN}[+] Ergebnisse: ${WORKSPACE}/${RESET}"
  [[ -f "${WORKSPACE}/report.md" ]] && \
    echo -e "${GREEN}[WHITEROSE] Report: ${WORKSPACE}/report.md${RESET}"
}

# ── Hauptprogramm ──────────────────────────────────────────────────────────────
main() {
  banner
  [[ -z "$TARGET" ]] && usage
  check_deps
  setup_workspace

  echo -e "${BOLD}Ziel:${RESET}   $TARGET"
  echo -e "${BOLD}Modus:${RESET}  $MODE"
  echo -e "${BOLD}Model:${RESET}  claude-opus-4-6 (Elliot)"
  echo -e "${BOLD}MCP:${RESET}    hexstrike-ai (Port 13145)"
  echo ""

  case "$MODE" in
    full)
      run_recon_agent
      run_web_agent
      run_enum_agent
      run_exploit_agent
      run_report_agent
      monitor_agents
      ;;
    recon)   run_recon_agent;   wait ;;
    web)     run_web_agent;     wait ;;
    ad)
      claude --model claude-opus-4-6 \
        --system-prompt "$(cat /opt/kali-cloud/agents/ad-agent.md 2>/dev/null || cat ~/kali-cloud/agents/ad-agent.md)" \
        "Vollständiger Active Directory Angriff auf: ${TARGET}. Workspace: ${WORKSPACE}"
      ;;
    ctf)
      claude --model claude-opus-4-6 \
        --system-prompt "Du bist ein CTF-Spezialist. Tools: pwntools, gdb+pwndbg, radare2, binwalk, steghide, exiftool." \
        "Löse die CTF-Challenge: ${TARGET}. Workspace: ${WORKSPACE}"
      ;;
    report)
      run_report_agent
      wait
      ;;
    *)  usage ;;
  esac
}

main "$@"
