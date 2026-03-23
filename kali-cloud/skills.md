# Skills – Ultimate Hacker Setup

Alle verfügbaren Fähigkeiten und Tools im Stack:
**Claude Opus 4.6 · HexStrike AI · Kali Linux · Claude Code · OpenClaw**

---

## AI / Automation
| Skill | Tool | Befehl |
|-------|------|--------|
| KI-gestütztes Pentesting | Claude Code (Opus 4.6) | `claude` |
| 150+ Tools via MCP | HexStrike AI | `hexstrike` |
| AI Exploit-Suggester | HexStrike AI API | `curl http://127.0.0.1:13145/exploit_suggest` |
| Automatisierter Full-Scan | HexStrike AI | `curl http://127.0.0.1:13145/scan` |

---

## Reconnaissance & OSINT
| Skill | Tool | Befehl |
|-------|------|--------|
| Port-Scanning | nmap | `nmap -sV -sC -p- <target>` |
| Schnell-Scan | masscan | `masscan -p1-65535 <target> --rate=10000` |
| Subdomain-Enum | dnsrecon | `dnsrecon -d <domain>` |
| E-Mail/Name OSINT | theharvester | `theharvester -d <domain> -b all` |
| Web-Tech-Erkennung | whatweb | `whatweb <url>` |
| WAF-Erkennung | wafw00f | `wafw00f <url>` |
| Netzwerk-Discovery | netdiscover | `netdiscover -r 192.168.1.0/24` |
| ARP-Scan | arp-scan | `arp-scan --localnet` |

---

## Web Application Pentesting
| Skill | Tool | Befehl |
|-------|------|--------|
| Directory Brute-Force | gobuster | `gobuster dir -u <url> -w /usr/share/seclists/...` |
| Verzeichnis-Scan | dirb | `dirb <url>` |
| Web-Schwachstellen-Scan | nikto | `nikto -h <url>` |
| SQL Injection | sqlmap | `sqlmap -u "<url>" --dbs --batch` |
| Proxy / Intercept | burpsuite | `burpsuite` |
| HTTP-Fuzzing | wfuzz | `wfuzz -c -z file,wordlist.txt <url>/FUZZ` |

---

## Credential Attacks
| Skill | Tool | Befehl |
|-------|------|--------|
| Brute-Force (Netz) | hydra | `hydra -l admin -P rockyou.txt <ip> ssh` |
| Brute-Force (alt.) | medusa | `medusa -h <ip> -u root -P pass.txt -M ssh` |
| Passwort-Cracking | john | `john --wordlist=rockyou.txt hash.txt` |
| GPU-Cracking | hashcat | `hashcat -m 1000 hash.txt rockyou.txt` |

---

## Network Exploitation
| Skill | Tool | Befehl |
|-------|------|--------|
| Exploitation Framework | metasploit | `msfconsole` |
| Exploit-Datenbank | exploitdb | `searchsploit <keyword>` |
| SMB-Enum | smbclient | `smbclient -L //<ip>` |
| NetBIOS-Enum | enum4linux | `enum4linux -a <ip>` |
| SNMP-Scan | onesixtyone | `onesixtyone -c community.txt <ip>` |
| LDAP-Abfragen | ldap-utils | `ldapsearch -H ldap://<ip>` |
| Paket-Sniffing | tcpdump | `tcpdump -i eth0 -w capture.pcap` |
| Traffic-Analyse | tshark | `tshark -r capture.pcap` |

---

## Active Directory
| Skill | Tool | Befehl |
|-------|------|--------|
| AD-Enumeration | bloodhound | `bloodhound-python -d <domain> -u user -p pass` |
| SMB/WMI/RDP | crackmapexec | `crackmapexec smb <range> -u user -p pass` |
| WinRM-Shell | evil-winrm | `evil-winrm -i <ip> -u Administrator -p pass` |
| NTLM-Relay | responder | `responder -I eth0 -rdwv` |
| Kerberoasting | impacket | `impacket-GetUserSPNs domain/user:pass -request` |
| Pass-the-Hash | impacket | `impacket-psexec domain/user@<ip> -hashes :NTHASH` |
| Secretsdump | impacket | `impacket-secretsdump domain/user:pass@<ip>` |

---

## Wireless
| Skill | Tool | Befehl |
|-------|------|--------|
| WPA2 Handshake | aircrack-ng | `aircrack-ng -w rockyou.txt capture.cap` |
| Monitor Mode | airmon-ng | `airmon-ng start wlan0` |
| Packet Capture | airodump-ng | `airodump-ng wlan0mon` |
| Deauth Attack | aireplay-ng | `aireplay-ng -0 10 -a <BSSID> wlan0mon` |

---

## Post-Exploitation
| Skill | Tool | Befehl |
|-------|------|--------|
| Pivoting | proxychains4 | `proxychains4 nmap <internal-ip>` |
| Anonymisierung | tor | `service tor start` |
| Port-Forwarding | socat | `socat TCP-LISTEN:4444 TCP:<ip>:4444` |
| Reverse Shell | netcat | `nc -lvnp 4444` |
| Interaktive Shell | rlwrap | `rlwrap nc -lvnp 4444` |

---

## Binary Exploitation / CTF
| Skill | Tool | Befehl |
|-------|------|--------|
| Buffer Overflow | pwntools | `python3 -c "from pwn import *; ..."` |
| Debuggen | gdb + pwndbg | `gdb ./binary` |
| Reverse Engineering | radare2 | `r2 -A ./binary` |
| Statische Analyse | ghidra | `ghidra` |
| Packer-Analyse | binwalk | `binwalk -e firmware.bin` |
| Datei-Extraktion | foremost | `foremost -i disk.img` |

---

## Steganography & Forensics
| Skill | Tool | Befehl |
|-------|------|--------|
| Stegano-Extraktion | steghide | `steghide extract -sf image.jpg` |
| Metadaten | exiftool | `exiftool file.jpg` |
| Stegano-Brute | stegseek | `stegseek image.jpg rockyou.txt` |

---

## Wordlists & Datenbanken
| Ressource | Pfad |
|-----------|------|
| RockYou | `/usr/share/wordlists/rockyou.txt` |
| SecLists | `/usr/share/seclists/` |
| Dirb Wordlists | `/usr/share/dirb/wordlists/` |
| Exploit-DB | `/usr/share/exploitdb/` |

---

## Schnellstart

```bash
# Claude Code mit Opus 4.6 + HexStrike MCP starten
export ANTHROPIC_API_KEY=sk-ant-...
claude

# HexStrike AI Server-Status
curl http://127.0.0.1:13145/health

# Docker-Setup starten
docker compose up -d
docker compose exec kali claude
```
