#!/usr/bin/env python3
"""
HexStrike AI – MCP stdio Server
fsociety · djjessejay.ch

Bridges Claude Code (MCP client) → HexStrike HTTP Server (Port 13145).

Usage:
  python3 hexstrike_mcp.py --server http://127.0.0.1:13145

Claude Code settings.json:
  "hexstrike-ai": {
    "command": "python3",
    "args": ["/opt/hexstrike-ai/hexstrike_mcp.py", "--server", "http://127.0.0.1:13145"]
  }
"""

import argparse
import asyncio
import json
import sys

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

# ─── globals ─────────────────────────────────────────────────────────────────

SERVER_URL = "http://127.0.0.1:13145"
HTTP_TIMEOUT = 320

server = Server("hexstrike-ai")


# ─── tool definitions ────────────────────────────────────────────────────────

TOOLS = [
    types.Tool(
        name="port_scan",
        description=(
            "Port-Scanning mit nmap. Erkennt offene Ports, Services und Versionen. "
            "Nutze für initiale Recon auf autorisierten Zielen."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "target": {"type": "string", "description": "IP-Adresse oder Hostname"},
                "ports": {"type": "string", "description": "Port-Range z.B. '1-1000' oder '80,443,8080'", "default": "1-1000"},
                "flags": {"type": "string", "description": "Zusätzliche nmap-Flags z.B. '-A -T4'", "default": "-sV -sC"},
            },
            "required": ["target"],
        },
    ),
    types.Tool(
        name="web_scan",
        description=(
            "Web-Application-Scan mit nikto und gobuster. "
            "Erkennt bekannte Schwachstellen, versteckte Verzeichnisse und interessante Dateien."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "Ziel-URL z.B. 'http://target.com'"},
                "wordlist": {"type": "string", "description": "Wordlist-Pfad für gobuster", "default": "/usr/share/seclists/Discovery/Web-Content/common.txt"},
                "run_nikto": {"type": "boolean", "description": "nikto-Scan ausführen", "default": True},
                "run_gobuster": {"type": "boolean", "description": "gobuster dir-Scan ausführen", "default": True},
            },
            "required": ["url"],
        },
    ),
    types.Tool(
        name="vuln_scan",
        description=(
            "Schwachstellen-Scan mit nmap --script vuln. "
            "Prüft auf bekannte CVEs und Fehlkonfigurationen."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "target": {"type": "string", "description": "IP-Adresse oder Hostname"},
                "ports": {"type": "string", "description": "Port-Range (leer = alle Ports)", "default": ""},
            },
            "required": ["target"],
        },
    ),
    types.Tool(
        name="exploit_suggest",
        description=(
            "Exploit-Suche in der ExploitDB via searchsploit. "
            "Gibt passende Exploits für Service-Namen, CVEs oder Versionsnummern zurück."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "keyword": {"type": "string", "description": "Suchbegriff z.B. 'apache 2.4.49' oder 'CVE-2021-41773'"},
            },
            "required": ["keyword"],
        },
    ),
    types.Tool(
        name="subdomain_enum",
        description=(
            "Subdomain-Enumeration mit dnsrecon und theHarvester. "
            "Findet Subdomains und DNS-Einträge einer Domain."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "domain": {"type": "string", "description": "Ziel-Domain z.B. 'example.com'"},
            },
            "required": ["domain"],
        },
    ),
    types.Tool(
        name="osint_gather",
        description=(
            "OSINT-Sammlung mit theHarvester. "
            "Sammelt E-Mail-Adressen, Hostnamen, IPs und Mitarbeiternamen."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "domain": {"type": "string", "description": "Ziel-Domain"},
                "sources": {"type": "string", "description": "Quellen z.B. 'all', 'google,bing,linkedin'", "default": "all"},
            },
            "required": ["domain"],
        },
    ),
    types.Tool(
        name="ad_enum",
        description=(
            "Active Directory Enumeration mit crackmapexec und enum4linux. "
            "Erkennt Benutzer, Gruppen, Shares und Domain-Informationen."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "target": {"type": "string", "description": "DC-IP oder Hostname"},
                "username": {"type": "string", "description": "Benutzername (optional)"},
                "password": {"type": "string", "description": "Passwort (optional)"},
                "domain": {"type": "string", "description": "Domain-Name (optional)"},
            },
            "required": ["target"],
        },
    ),
    types.Tool(
        name="kerberoast",
        description=(
            "Kerberoasting-Angriff mit impacket-GetUserSPNs. "
            "Extrahiert Service-Tickets für Offline-Cracking. Nur auf autorisierten Zielen."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "domain": {"type": "string", "description": "Domain z.B. 'corp.local'"},
                "username": {"type": "string", "description": "Domänen-Benutzer"},
                "password": {"type": "string", "description": "Passwort"},
                "dc_ip": {"type": "string", "description": "Domain Controller IP (optional)"},
            },
            "required": ["domain", "username", "password"],
        },
    ),
    types.Tool(
        name="payload_gen",
        description=(
            "Payload-Generierung mit msfvenom für autorisierte Pentests. "
            "Erstellt Reverse-Shell-Payloads in verschiedenen Formaten."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "payload": {"type": "string", "description": "MSF-Payload z.B. 'linux/x64/shell_reverse_tcp'", "default": "linux/x64/shell_reverse_tcp"},
                "lhost": {"type": "string", "description": "Listener-IP"},
                "lport": {"type": "integer", "description": "Listener-Port", "default": 4444},
                "fmt": {"type": "string", "description": "Output-Format z.B. 'elf', 'exe', 'raw', 'py'", "default": "elf"},
            },
            "required": ["lhost"],
        },
    ),
    types.Tool(
        name="shell_upgrade",
        description=(
            "Gibt Shell-Upgrade-Techniken zurück. "
            "Wandelt einfache Reverse-Shells in vollständig interaktive TTYs um."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "method": {
                    "type": "string",
                    "description": "'all' für alle Methoden oder eine spezifische: 'python3', 'python2', 'script', 'socat', 'stty', 'rlwrap'",
                    "default": "all",
                },
            },
        },
    ),
]


# ─── handlers ────────────────────────────────────────────────────────────────

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.post(f"{SERVER_URL}/{name}", json=arguments)
            resp.raise_for_status()
            result = resp.json()
    except httpx.ConnectError:
        result = {
            "error": (
                f"Kann HexStrike Server nicht erreichen: {SERVER_URL}\n"
                "Starte ihn mit: hexstrike-server &\n"
                "oder: python3 hexstrike_server.py --port 13145 &"
            )
        }
    except httpx.TimeoutException:
        result = {"error": f"HTTP-Timeout nach {HTTP_TIMEOUT}s – Tool läuft noch im Hintergrund"}
    except httpx.HTTPStatusError as exc:
        result = {"error": f"HTTP {exc.response.status_code}: {exc.response.text}"}
    except Exception as exc:
        result = {"error": str(exc)}

    return [types.TextContent(type="text", text=json.dumps(result, indent=2, ensure_ascii=False))]


# ─── main ────────────────────────────────────────────────────────────────────

async def _run():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


def main():
    global SERVER_URL
    parser = argparse.ArgumentParser(description="HexStrike AI MCP Client")
    parser.add_argument("--server", default="http://127.0.0.1:13145", help="HexStrike server URL")
    args, _ = parser.parse_known_args()
    SERVER_URL = args.server.rstrip("/")

    try:
        asyncio.run(_run())
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    main()
