# Kali Linux Cloud Image – OpenClaw, Telegram & HexStrike AI
# docker build -t kali-cloud .
# docker run -it --rm kali-cloud

FROM kalilinux/kali-rolling:latest

LABEL maintainer="djjessejay.ch"
LABEL description="Kali Linux Cloud Instanz mit OpenClaw, Telegram und HexStrike AI"

# Nicht-interaktiver Modus
ENV DEBIAN_FRONTEND=noninteractive

# ── Basis-Pakete ──────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl wget git unzip ca-certificates gnupg \
    build-essential cmake \
    libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev libsdl2-ttf-dev \
    libphysfs-dev \
    openssh-server \
    ufw \
    xvfb x11vnc fluxbox \
    && rm -rf /var/lib/apt/lists/*

# ── OpenClaw ──────────────────────────────────────────────────────────────────
RUN set -eux; \
    # Versuche APT zuerst
    if apt-cache show openclaw 2>/dev/null | grep -q Package; then \
        apt-get install -y openclaw; \
    else \
        git clone --depth 1 https://github.com/OpenClaw/OpenClaw.git /tmp/OpenClaw && \
        cmake -S /tmp/OpenClaw -B /tmp/openclaw-build -DCMAKE_BUILD_TYPE=Release && \
        cmake --build /tmp/openclaw-build -j"$(nproc)" && \
        cmake --install /tmp/openclaw-build && \
        rm -rf /tmp/OpenClaw /tmp/openclaw-build; \
    fi

# ── Telegram Desktop ──────────────────────────────────────────────────────────
ARG TELEGRAM_VERSION=5.3.2
RUN set -eux; \
    apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 libgtk-3-0 libxcb-xfixes0 libxcb-icccm4 libxcb-keysyms1 \
        libxcb-randr0 libxcb-render-util0 libxcb-shape0 libxcb-xkb1 \
        libxkbcommon-x11-0 libdbus-1-3 libasound2 \
    && rm -rf /var/lib/apt/lists/*; \
    wget -q -O /tmp/tsetup.tar.xz \
        "https://updates.tdesktop.com/tlinux/tsetup.${TELEGRAM_VERSION}.tar.xz"; \
    mkdir -p /opt/telegram; \
    tar -xf /tmp/tsetup.tar.xz -C /opt/telegram --strip-components=1; \
    rm -f /tmp/tsetup.tar.xz; \
    ln -sf /opt/telegram/Telegram /usr/local/bin/telegram-desktop

# Desktop-Eintrag
RUN mkdir -p /usr/share/applications && \
    printf '[Desktop Entry]\nVersion=1.0\nName=Telegram Desktop\nExec=/usr/local/bin/telegram-desktop\nIcon=/opt/telegram/Telegram\nTerminal=false\nType=Application\nCategories=Network;InstantMessaging;\n' \
    > /usr/share/applications/telegram-desktop.desktop

# ── HexStrike AI ─────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip python3-venv chromium \
    && rm -rf /var/lib/apt/lists/* \
    && git clone --depth 1 https://github.com/0x4m4/hexstrike-ai.git /opt/hexstrike-ai \
    && python3 -m venv /opt/hexstrike-ai/hexstrike-env \
    && /opt/hexstrike-ai/hexstrike-env/bin/pip install --quiet --upgrade pip \
    && /opt/hexstrike-ai/hexstrike-env/bin/pip install --quiet -r /opt/hexstrike-ai/requirements.txt

RUN printf '#!/usr/bin/env bash\nsource /opt/hexstrike-ai/hexstrike-env/bin/activate\nexec python3 /opt/hexstrike-ai/hexstrike_mcp.py --server http://127.0.0.1:13145 "$@"\n' \
    > /usr/local/bin/hexstrike && chmod +x /usr/local/bin/hexstrike

RUN mkdir -p /root/.config/hexstrike && \
    printf '{\n  "mcpServers": {\n    "hexstrike-ai": {\n      "command": "/opt/hexstrike-ai/hexstrike-env/bin/python3",\n      "args": ["/opt/hexstrike-ai/hexstrike_mcp.py", "--server", "http://127.0.0.1:13145"],\n      "env": { "PYTHONPATH": "/opt/hexstrike-ai" }\n    }\n  }\n}\n' \
    > /root/.config/hexstrike/mcp.json

# ── SSH ───────────────────────────────────────────────────────────────────────
RUN mkdir /var/run/sshd && \
    echo 'root:kali' | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

EXPOSE 22

# ── Startskript ───────────────────────────────────────────────────────────────
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"]
