#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  hack.sh – fsociety SubAgent Orchestrator (Mr. Robot)                      ║
# ║  "Hello, Friend." – Multi-Provider · HexStrike AI                         ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

TARGET="${1:-}"
MODE="${2:-full}"    # full | recon | web | ad | ctf | report

# ── Provider:Model-Specs ───────────────────────────────────────────────────────
# Format: PROVIDER:MODEL
# Providers: anthropic | mistral | hermes | ollama
# Override per-Agent via env: EXPLOIT_SPEC=mistral:codestral-latest hack.sh ...
_DEFAULT="anthropic:${ANTHROPIC_MODEL:-claude-opus-4-6}"

RECON_SPEC="${RECON_SPEC:-$_DEFAULT}"
ENUM_SPEC="${ENUM_SPEC:-$_DEFAULT}"
EXPLOIT_SPEC="${EXPLOIT_SPEC:-$_DEFAULT}"    # Tipp: mistral:codestral-latest
WEB_SPEC="${WEB_SPEC:-$_DEFAULT}"            # Tipp: mistral:codestral-latest
AD_SPEC="${AD_SPEC:-$_DEFAULT}"              # Tipp: hermes:NousResearch/Hermes-3-Llama-3.1-70B
CTF_SPEC="${CTF_SPEC:-$_DEFAULT}"            # Tipp: mistral:codestral-latest
REPORT_SPEC="${REPORT_SPEC:-$_DEFAULT}"

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
  fsociety · Zero-Day Legend · Multi-Provider · HexStrike AI
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
  echo -e "${CYAN}Provider-Specs (Env-Variablen):${RESET}"
  echo "  RECON_SPEC    ENUM_SPEC    EXPLOIT_SPEC    WEB_SPEC"
  echo "  AD_SPEC       CTF_SPEC     REPORT_SPEC"
  echo "  Format: PROVIDER:MODEL"
  echo "  Beispiel: EXPLOIT_SPEC=mistral:codestral-latest hack.sh 10.0.0.1 full"
  echo ""
  echo -e "${CYAN}Beispiele:${RESET}"
  echo "  hack.sh 10.10.10.1 full"
  echo "  hack.sh https://target.com web"
  echo "  hack.sh 192.168.1.0/24 recon"
  exit 1
}

# ── Provider-Dispatcher ────────────────────────────────────────────────────────
# Verwendung: run_agent SPEC SYS_PROMPT TASK
# SPEC Format: provider:model
run_agent() {
  local spec="$1"
  local sys_prompt="$2"
  local task="$3"
  local provider="${spec%%:*}"
  local model="${spec#*:}"

  case "$provider" in
    anthropic|claude)
      claude --model "$model" \
        --system-prompt "$sys_prompt" \
        --print \
        "$task"
      ;;
    mistral|codestral)
      [[ -n "${MISTRAL_API_KEY:-}" ]] || {
        echo "[!] MISTRAL_API_KEY nicht gesetzt für Provider: $provider" >&2; return 1
      }
      MISTRAL_MODEL="$model" python3 - "$sys_prompt" "$task" <<'PYEOF'
import os, sys, json
from urllib.request import Request, urlopen
sys_p, task = sys.argv[1], sys.argv[2]
req = Request(
    "https://api.mistral.ai/v1/chat/completions",
    data=json.dumps({
        "model": os.environ["MISTRAL_MODEL"],
        "messages": [
            {"role": "system", "content": sys_p},
            {"role": "user",   "content": task}
        ]
    }).encode(),
    headers={
        "Authorization": "Bearer " + os.environ["MISTRAL_API_KEY"],
        "Content-Type": "application/json"
    },
    method="POST"
)
resp = json.loads(urlopen(req).read())
print(resp["choices"][0]["message"]["content"])
PYEOF
      ;;
    hermes)
      hermes run \
        --model "$model" \
        --system "$sys_prompt" \
        "$task"
      ;;
    ollama)
      printf '%s\n\n%s' "$sys_prompt" "$task" | ollama run "$model"
      ;;
    *)
      echo "[!] Unbekannter Provider: $provider (anthropic | mistral | hermes | ollama)" >&2
      return 1
      ;;
  esac
}

# ── Dependency-Check (provider-bewusst) ────────────────────────────────────────
check_deps() {
  local all_specs=(
    "$RECON_SPEC" "$ENUM_SPEC" "$EXPLOIT_SPEC"
    "$WEB_SPEC" "$AD_SPEC" "$CTF_SPEC" "$REPORT_SPEC"
  )
  local seen_providers=":"

  for spec in "${all_specs[@]}"; do
    local p="${spec%%:*}"
    # Jeden Provider nur einmal prüfen
    [[ "$seen_providers" == *":${p}:"* ]] && continue
    seen_providers="${seen_providers}${p}:"

    case "$p" in
      anthropic|claude)
        command -v claude &>/dev/null || {
          echo "[!] claude nicht gefunden. npm install -g @anthropic-ai/claude-code"; exit 1
        }
        [[ -n "${ANTHROPIC_API_KEY:-}" ]] || {
          echo "[!] ANTHROPIC_API_KEY nicht gesetzt"; exit 1
        }
        ;;
      mistral|codestral)
        [[ -n "${MISTRAL_API_KEY:-}" ]] || {
          echo "[!] MISTRAL_API_KEY nicht gesetzt (benötigt für Provider: $p)"; exit 1
        }
        command -v python3 &>/dev/null || { echo "[!] python3 nicht gefunden"; exit 1; }
        ;;
      hermes)
        command -v hermes &>/dev/null || {
          echo "[!] hermes nicht gefunden."
          echo "    Installiere (an Commit gepinnt): curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/449706cb5219257e2028ace22e7870cbb2bf3760/scripts/install.sh | bash"
          exit 1
        }
        ;;
      ollama)
        command -v ollama &>/dev/null || {
          echo "[!] ollama nicht gefunden."
          echo "    Installiere: curl -fsSL https://ollama.ai/install.sh | sh"
          exit 1
        }
        ;;
    esac
  done

  # HexStrike MCP
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
  run_agent "$RECON_SPEC" \
    "$(cat /opt/kali-cloud/agents/recon-agent.md 2>/dev/null || cat ~/kali-cloud/agents/recon-agent.md)" \
    "Führe vollständige Reconnaissance auf Ziel: ${TARGET} durch.
     Speichere JSON-Ergebnisse in ${WORKSPACE}/recon.json
     Nutze alle verfügbaren Tools parallel. Starte jetzt." \
    > "${WORKSPACE}/recon.log" 2>&1 &
  RECON_PID=$!
  echo "[*] Elliot (${RECON_SPEC}) PID: $RECON_PID"
}

# ── SubAgent: Web Pentest ───────────────────────────────────────────────────────
run_web_agent() {
  echo -e "${GREEN}[DARLENE] Ich breche ein. Kein Passwort hält mich auf.${RESET}"
  run_agent "$WEB_SPEC" \
    "Du bist ein Web Application Pentest Spezialist.
     Arsenal: nikto, gobuster, sqlmap, whatweb, wafw00f, wfuzz.
     Nutze HexStrike MCP für automatisierte Scans.
     Nur auf autorisierten Zielen." \
    "Führe vollständigen Web-Pentest auf ${TARGET} durch.
     Phase 1: whatweb + wafw00f + nikto (parallel)
     Phase 2: gobuster mit raft-large-directories.txt
     Phase 3: sqlmap auf alle GET/POST-Parameter
     Speichere Ergebnisse in ${WORKSPACE}/web.json" \
    > "${WORKSPACE}/web.log" 2>&1 &
  WEB_PID=$!
  echo "[*] Darlene (${WEB_SPEC}) PID: $WEB_PID"
}

# ── SubAgent: Enum ─────────────────────────────────────────────────────────────
run_enum_agent() {
  echo -e "${GREEN}[DARLENE] Enumeriere alle Services. Kein Stein bleibt auf dem anderen.${RESET}"
  ( WAIT=0; until [[ -f "${WORKSPACE}/recon.json" ]] || (( WAIT >= 300 )); do sleep 5; (( WAIT += 5 )) || true; done
    [[ -f "${WORKSPACE}/recon.json" ]] || echo "[!] Timeout: recon.json – starte Enum mit verfügbaren Daten"
    run_agent "$ENUM_SPEC" \
      "$(cat /opt/kali-cloud/agents/enum-agent.md 2>/dev/null || cat ~/kali-cloud/agents/enum-agent.md)" \
      "Recon-Ergebnisse: $(cat "${WORKSPACE}/recon.json" 2>/dev/null || echo 'noch ausstehend')
       Ziel: ${TARGET}
       Enumeriere alle Services tiefgehend. Speichere in ${WORKSPACE}/enum.json" \
      > "${WORKSPACE}/enum.log" 2>&1
  ) &
  ENUM_PID=$!
  echo "[*] Darlene/Enum (${ENUM_SPEC}) PID: $ENUM_PID"
}

# ── SubAgent: Exploit ──────────────────────────────────────────────────────────
run_exploit_agent() {
  echo -e "${GREEN}[MR. ROBOT] Es ist Zeit. Wir tun, was getan werden muss.${RESET}"
  ( WAIT=0; until [[ -f "${WORKSPACE}/enum.json" ]] || (( WAIT >= 300 )); do sleep 5; (( WAIT += 5 )) || true; done
    [[ -f "${WORKSPACE}/enum.json" ]] || echo "[!] Timeout: enum.json – starte Exploit mit verfügbaren Daten"
    run_agent "$EXPLOIT_SPEC" \
      "$(cat /opt/kali-cloud/agents/exploit-agent.md 2>/dev/null || cat ~/kali-cloud/agents/exploit-agent.md)" \
      "Enum-Ergebnisse: $(cat "${WORKSPACE}/enum.json" 2>/dev/null || echo 'noch ausstehend')
       Ziel: ${TARGET}
       Exploite die kritischsten Schwachstellen. Speichere in ${WORKSPACE}/exploit.json" \
      > "${WORKSPACE}/exploit.log" 2>&1
  ) &
  EXPLOIT_PID=$!
  echo "[*] Mr. Robot (${EXPLOIT_SPEC}) PID: $EXPLOIT_PID"
}

# ── SubAgent: Report ───────────────────────────────────────────────────────────
run_report_agent() {
  echo -e "${GREEN}[WHITEROSE] Zeit ist kostbar. Ich dokumentiere präzise.${RESET}"
  ( for f in recon.json enum.json; do
      while [[ ! -f "${WORKSPACE}/${f}" ]]; do sleep 10; done
    done
    run_agent "$REPORT_SPEC" \
      "$(cat /opt/kali-cloud/agents/report-agent.md 2>/dev/null || cat ~/kali-cloud/agents/report-agent.md)" \
      "Erstelle professionellen Pentest-Report für Ziel: ${TARGET}
       Recon:   $(cat "${WORKSPACE}/recon.json"   2>/dev/null | head -100)
       Enum:    $(cat "${WORKSPACE}/enum.json"    2>/dev/null | head -100)
       Exploit: $(cat "${WORKSPACE}/exploit.json" 2>/dev/null | head -100)
       Web:     $(cat "${WORKSPACE}/web.json"     2>/dev/null | head -100)
       Speichere Report als ${WORKSPACE}/report.md" \
      > "${WORKSPACE}/report.log" 2>&1
    echo -e "${GREEN}[+] Report fertig: ${WORKSPACE}/report.md${RESET}"
  ) &
  REPORT_PID=$!
  echo "[*] Whiterose (${REPORT_SPEC}) PID: $REPORT_PID"
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
        (( ++ACTIVE ))
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

  # Eindeutige Provider:Model-Specs anzeigen
  local _unique_specs
  _unique_specs=$(printf '%s\n' \
    "recon:$RECON_SPEC" "web:$WEB_SPEC" "enum:$ENUM_SPEC" \
    "exploit:$EXPLOIT_SPEC" "ad:$AD_SPEC" "ctf:$CTF_SPEC" "report:$REPORT_SPEC" \
    | sort -t: -k2,3 -u | awk -F: '{printf "  %-8s → %s:%s\n",$1,$2,$3}')

  echo -e "${BOLD}Ziel:${RESET}      $TARGET"
  echo -e "${BOLD}Modus:${RESET}     $MODE"
  echo -e "${BOLD}Operatives:${RESET}"
  echo "$_unique_specs"
  echo -e "${BOLD}MCP:${RESET}       hexstrike-ai (Port 13145)"
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
      run_agent "$AD_SPEC" \
        "$(cat /opt/kali-cloud/agents/ad-agent.md 2>/dev/null || cat ~/kali-cloud/agents/ad-agent.md)" \
        "Vollständiger Active Directory Angriff auf: ${TARGET}. Workspace: ${WORKSPACE}"
      ;;
    ctf)
      run_agent "$CTF_SPEC" \
        "Du bist ein CTF-Spezialist. Tools: pwntools, gdb+pwndbg, radare2, binwalk, steghide, exiftool." \
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
