# Kali Linux Cloud Instanz

Automatisiertes Setup einer Kali Linux Cloud-Instanz mit:
- **OpenClaw** – Open-source Klon des Klassikers Captain Claw
- **Telegram Desktop** – Messenger-Client
- **HexStrike AI** – MCP-Server für AI-gestützte Pentesting-Automatisierung (150+ Sicherheitstools)

## Schnellstart

### Option 1 – Direkt auf einem Cloud-Server (VPS/VM)

```bash
# Auf einem frischen Kali Linux System:
sudo bash setup.sh
```

### Option 2 – Docker

```bash
# Image bauen
docker build -t kali-cloud .

# Interaktiver Container
docker run -it --rm kali-cloud bash

# Mit GUI (X11-Weiterleitung)
xhost +local:docker
docker run -it --rm \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  kali-cloud bash
```

### Option 3 – Docker Compose (empfohlen)

```bash
docker compose up -d

# In den Container wechseln
docker compose exec kali bash

# noVNC Web-Interface öffnen (Remote-Desktop)
# http://localhost:8080
```

## Anwendungen starten

```bash
# OpenClaw
openclaw

# Telegram Desktop
telegram-desktop

# HexStrike AI MCP-Server starten
hexstrike

# HexStrike AI direkt (mit Argumenten)
hexstrike --port 8888 --debug
```

## HexStrike AI – MCP-Konfiguration

Die MCP-Konfiguration liegt unter `/root/.config/hexstrike/mcp.json`.
Sie kann in Claude Desktop oder anderen MCP-kompatiblen Clients eingebunden werden:

```json
{
  "mcpServers": {
    "hexstrike-ai": {
      "command": "/opt/hexstrike-ai/hexstrike-env/bin/python3",
      "args": ["/opt/hexstrike-ai/hexstrike_mcp.py"],
      "env": { "PYTHONPATH": "/opt/hexstrike-ai" }
    }
  }
}
```

> **Hinweis:** HexStrike AI ist ausschließlich für **autorisierte Sicherheitstests** bestimmt.
> Nur auf Systemen verwenden, für die eine ausdrückliche Genehmigung vorliegt.

## Konfiguration

| Variable           | Standard  | Beschreibung                  |
|--------------------|-----------|-------------------------------|
| `TELEGRAM_VERSION` | `5.3.2`   | Telegram Desktop Version      |
| `DISPLAY`          | `:1`      | X11 Display für GUI-Apps      |

## Voraussetzungen

- Kali Linux (Rolling) oder kompatibler Debian-Ableger
- Docker ≥ 24 + Docker Compose ≥ 2 (für Container-Option)
- Mindestens 2 GB RAM, 10 GB Speicher
