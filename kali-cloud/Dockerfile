# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  ULTIMATE HACKER IMAGE – djjessejay.ch                                     ║
# ║  Stack: Kali Linux · HexStrike AI · Claude Code (Opus 4.6) · OpenClaw     ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
# docker build -t ultimate-hacker .
# docker run -it --rm -e ANTHROPIC_API_KEY=sk-ant-... ultimate-hacker

FROM kalilinux/kali-rolling:latest

LABEL maintainer="djjessejay.ch"
LABEL description="fsociety: Kali + HexStrike AI + Claude Opus 4.6 – Hello, Friend."

ENV DEBIAN_FRONTEND=noninteractive

# ── Basis-Pakete ───────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl wget git unzip ca-certificates gnupg \
    build-essential cmake pkg-config \
    libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev libsdl2-ttf-dev \
    libphysfs-dev \
    openssh-server \
    ufw \
    xvfb x11vnc fluxbox \
    python3 python3-pip python3-venv \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# ── Kali Security Tools ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    nmap masscan \
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
    hping3 \
    arp-scan \
    netdiscover \
    ldap-utils \
    binwalk \
    foremost \
    exiftool \
    steghide \
    radare2 \
    rlwrap \
    socat \
    jq \
    python3-impacket \
    python3-pwntools \
    ruby ruby-dev \
    2>/dev/null; \
    rm -rf /var/lib/apt/lists/* ; \
    true

# ── OpenClaw ───────────────────────────────────────────────────────────────────
RUN set -eux; \
    if apt-cache show openclaw 2>/dev/null | grep -q Package; then \
        apt-get install -y openclaw; \
    else \
        git clone --depth 1 https://github.com/OpenClaw/OpenClaw.git /tmp/OpenClaw && \
        cmake -S /tmp/OpenClaw -B /tmp/openclaw-build -DCMAKE_BUILD_TYPE=Release && \
        cmake --build /tmp/openclaw-build -j"$(nproc)" && \
        cmake --install /tmp/openclaw-build && \
        rm -rf /tmp/OpenClaw /tmp/openclaw-build; \
    fi

# ── Telegram Desktop ───────────────────────────────────────────────────────────
ARG TELEGRAM_VERSION=5.3.2
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 libgtk-3-0 libxcb-xfixes0 libxcb-icccm4 libxcb-keysyms1 \
        libxcb-randr0 libxcb-render-util0 libxcb-shape0 libxcb-xkb1 \
        libxkbcommon-x11-0 libdbus-1-3 libasound2 \
    && rm -rf /var/lib/apt/lists/* \
    && wget -q -O /tmp/tsetup.tar.xz \
        "https://updates.tdesktop.com/tlinux/tsetup.${TELEGRAM_VERSION}.tar.xz" \
    && mkdir -p /opt/telegram \
    && tar -xf /tmp/tsetup.tar.xz -C /opt/telegram --strip-components=1 \
    && rm -f /tmp/tsetup.tar.xz \
    && ln -sf /opt/telegram/Telegram /usr/local/bin/telegram-desktop

RUN mkdir -p /usr/share/applications && \
    printf '[Desktop Entry]\nVersion=1.0\nName=Telegram Desktop\nExec=/usr/local/bin/telegram-desktop\nIcon=/opt/telegram/Telegram\nTerminal=false\nType=Application\nCategories=Network;InstantMessaging;\n' \
    > /usr/share/applications/telegram-desktop.desktop

# ── HexStrike AI ──────────────────────────────────────────────────────────────
RUN git clone --depth 1 https://github.com/0x4m4/hexstrike-ai.git /opt/hexstrike-ai \
    && python3 -m venv /opt/hexstrike-ai/hexstrike-env \
    && /opt/hexstrike-ai/hexstrike-env/bin/pip install --quiet --upgrade pip \
    && /opt/hexstrike-ai/hexstrike-env/bin/pip install --quiet -r /opt/hexstrike-ai/requirements.txt

# HexStrike MCP-Client Wrapper
RUN printf '#!/usr/bin/env bash\nsource /opt/hexstrike-ai/hexstrike-env/bin/activate\nexec python3 /opt/hexstrike-ai/hexstrike_mcp.py --server http://127.0.0.1:13145 "$@"\n' \
    > /usr/local/bin/hexstrike && chmod +x /usr/local/bin/hexstrike

# HexStrike Server Wrapper
RUN printf '#!/usr/bin/env bash\nsource /opt/hexstrike-ai/hexstrike-env/bin/activate\nexec python3 /opt/hexstrike-ai/hexstrike_server.py --port 13145 "$@"\n' \
    > /usr/local/bin/hexstrike-server && chmod +x /usr/local/bin/hexstrike-server

# HexStrike MCP-Config
RUN mkdir -p /root/.config/hexstrike && \
    printf '{\n  "mcpServers": {\n    "hexstrike-ai": {\n      "command": "/opt/hexstrike-ai/hexstrike-env/bin/python3",\n      "args": ["/opt/hexstrike-ai/hexstrike_mcp.py", "--server", "http://127.0.0.1:13145"],\n      "env": { "PYTHONPATH": "/opt/hexstrike-ai" }\n    }\n  }\n}\n' \
    > /root/.config/hexstrike/mcp.json

# ── Node.js + Claude Code CLI ─────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g @anthropic-ai/claude-code

# ── Claude Code Konfiguration (Opus 4.6 + HexStrike MCP + SubAgent Power) ────
RUN mkdir -p /root/.claude/agents /root/pentest-reports && \
    printf '{\n  "model": "claude-opus-4-6",\n  "mcpServers": {\n    "hexstrike-ai": {\n      "command": "/opt/hexstrike-ai/hexstrike-env/bin/python3",\n      "args": ["/opt/hexstrike-ai/hexstrike_mcp.py", "--server", "http://127.0.0.1:13145"],\n      "env": { "PYTHONPATH": "/opt/hexstrike-ai" }\n    }\n  },\n  "permissions": {\n    "allow": ["Bash(*)", "Read(*)", "Write(*)", "Edit(*)", "Glob(*)", "Grep(*)", "WebFetch(*)", "WebSearch(*)", "Agent(*)", "mcp__hexstrike-ai__*"],\n    "deny": []\n  },\n  "dangerouslySkipPermissions": true\n}\n' \
    > /root/.claude/settings.json

# SubAgent-Rollen
COPY kali-cloud/agents/ /root/.claude/agents/
COPY kali-cloud/agents/ /opt/kali-cloud/agents/

# hack.sh Orchestrator
COPY kali-cloud/hack.sh /usr/local/bin/hack
RUN chmod +x /usr/local/bin/hack

# CLAUDE.md: SubAgent-Orchestrator System-Kontext
COPY kali-cloud/CLAUDE.md /root/CLAUDE.md

# ── SSH ────────────────────────────────────────────────────────────────────────
RUN mkdir /var/run/sshd && \
    echo 'root:kali' | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

EXPOSE 22 13145

# ── Startskript ────────────────────────────────────────────────────────────────
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"]
