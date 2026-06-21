---
name: ctf-writeup
description: Strukturierte CTF-Writeups generieren — Challenge-Details, Lösungsweg, Code-Snippets und Learnings in professionellem Format. Unterstützt alle gängigen Kategorien (Network, Web, Crypto, Forensics, Pwn, Reverse). Trigger: "ctf writeup", "writeup schreiben", "challenge dokumentieren", "ctf lösung dokumentieren", "writeup erstellen", "flag dokumentieren".
argument-hint: <challenge-name> <category>
allowed-tools: Read, Write, Bash
---

# CTF Writeup Generator

**Challenge:** $ARGUMENTS

---

## Schritt 1: Challenge-Infos erfassen

Falls nicht in `$ARGUMENTS` enthalten, folgende Infos sammeln:

```
Challenge-Name: ____
CTF-Name & Jahr: ____
Kategorie: Network / Web / Crypto / Forensics / Pwn / Reverse / OSINT / Misc
Schwierigkeit: Easy / Medium / Hard
Punkte: ____
Flag: ____
Lösungsweg (kurz): ____
```

---

## Schritt 2: Kategorie-spezifisches Template wählen

| Kategorie | Haupt-Tools | Typischer Lösungsweg |
|-----------|-------------|----------------------|
| Network / Forensics | Wireshark, tcpdump, tshark | PCAP analysieren → Protokolle filtern → Daten extrahieren |
| Web | Burp Suite, curl, browser devtools | Requests analysieren → Injection/Auth-Bypass → Flag |
| Crypto | Python, CyberChef, openssl | Algorithmus identifizieren → Schwäche finden → Entschlüsseln |
| Pwn | gdb, pwntools, objdump | Binary analysieren → Exploit entwickeln → Shell/Flag |
| Reverse | Ghidra, IDA, ltrace | Disassembly → Logik verstehen → Passwort/Flag extrahieren |
| OSINT | Browser, Shodan, Google | Spuren verfolgen → Quelle finden → Flag |
| Forensics | strings, binwalk, exiftool | Datei untersuchen → Steganographie/Metadaten → Flag |

---

## Schritt 2b: Priorität der Writeup-Elemente

| Priorität | Element | Warum |
|-----------|---------|-------|
| 🔴 Kritisch | Flag korrekt dokumentiert | Kern des Writeups — ohne Flag kein Writeup |
| 🔴 Kritisch | Lösungsweg Schritt für Schritt | Reproduzierbarkeit für andere CTF-Spieler |
| 🟡 Wichtig | Code-Snippets mit echtem Output | Verständlichkeit und Vertrauenswürdigkeit |
| 🟡 Wichtig | Tool-Übersicht mit Verwendungszweck | Nachvollziehbarkeit des Toolchains |
| 🟢 Optional | Screenshots / Bilder | Visuelle Klarheit, besonders für Web-Challenges |
| 🟢 Optional | Tiefgehende Hintergründe / CVE-Links | Lernwert über die Challenge hinaus |

---

## Schritt 3: Writeup generieren

Ausgabe-Format:

```markdown
# [Challenge-Name] — [CTF-Name] [Jahr] Writeup

**Kategorie:** [Kategorie]
**Schwierigkeit:** [Easy/Medium/Hard]
**Punkte:** [X]
**Flag:** `[flag{...}]`

---

## Challenge-Beschreibung

[Challenge-Text aus der Aufgabenstellung, 2-4 Sätze]

---

## Erster Überblick

[Was wurde als erstes gemacht? Welche Dateien/Infos standen zur Verfügung?]

```bash
# Erste Analyse
file [datei]
strings [datei] | head -20
```

---

## Lösungsweg

### Schritt 1: [Erster Schritt]

[Erklärung was gemacht wurde und warum]

```bash
# Befehl mit Erklärung
[befehl]
# Output:
[output]
```

### Schritt 2: [Zweiter Schritt]

[Erklärung]

```python
# Python-Skript falls nötig
[code]
```

### Schritt 3: Flag rekonstruieren

[Wie wurde die Flag zusammengesetzt]

```
[Zwischen-Ergebnisse] → [Flag]
```

---

## Flag

```
[flag{...}]
```

---

## Key Takeaways

1. **[Konzept 1]:** [Was gelernt wurde]
2. **[Konzept 2]:** [Was gelernt wurde]
3. **[Tool/Technik]:** [Warum nützlich]

---

## Tools

| Tool | Verwendung |
|------|-----------|
| [Tool 1] | [Wofür] |
| [Tool 2] | [Wofür] |

---

*Writeup von [Autor] — [Datum]*
```

---

## Schritt 4: Datei speichern

Writeup als Markdown-Datei speichern. Speicherpfad-Schema:
`/root/ctf-writeups/<ctf-slug>/<challenge-slug>.md`

Beispiel für "Network Intercept — EotW CTF 2025":
`/root/ctf-writeups/eotw-ctf-2025/network-intercept.md`

```bash
# Verzeichnis anlegen (CTF-Name aus $ARGUMENTS ableiten)
CTF_SLUG=$(echo "$ARGUMENTS" | awk '{print $NF}' | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
mkdir -p /root/ctf-writeups/$CTF_SLUG
```

```bash
# Aktuelles Datum für Datei-Header
date +%Y-%m-%d
```

---

## Schritt 5: Qualitäts-Check

```
✅ Challenge-Name und CTF klar benannt
✅ Flag korrekt formatiert
✅ Alle Schritte mit Befehlen dokumentiert
✅ Code-Snippets mit Syntax-Highlighting
✅ Tool-Übersicht vorhanden
✅ Takeaways / Learnings enthalten
```

---

Soll ich das Writeup direkt als `.md`-Datei speichern? (`Write`)
