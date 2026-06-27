---
name: debug
description: Debug-Workflow für djjessejay.ch — analysiert JavaScript-Fehler, CSS-Probleme, API-Fehler und Laufzeitprobleme. Sucht Ursache im Code, erklärt das Problem und implementiert den Fix. Trigger: "debug", "fehler beheben", "js error", "console error", "funktioniert nicht", "kaputt", "broken", "error tracen", "was ist falsch mit".
argument-hint: <fehlermeldung | dateiname | symptom>
allowed-tools: Read, Edit, Grep, Bash(grep -n), Bash(node --check)
effort: high
---

# Debug: Fehlersuche und -behebung

**Problem:** $ARGUMENTS

---

## Schritt 1: Fehlertyp klassifizieren

| Symptom | Typ | Vorgehen |
|---------|-----|----------|
| `TypeError`, `ReferenceError`, `SyntaxError` | JS-Laufzeitfehler | → Schritt 2a |
| Funktion reagiert nicht / Button kaputt | JS-Logikfehler | → Schritt 2b |
| Element sieht falsch aus / Layout kaputt | CSS-Problem | → Schritt 2c |
| `fetch failed`, `401`, `500`, API-Fehler | API/Netzwerk | → Schritt 2d |
| Übersetzung fehlt / Text falsch | i18n-Fehler | → Schritt 2e |

---

## Schritt 2a: JavaScript Laufzeitfehler

Fehlermeldung analysieren — typische Muster in djjessejay.ch:

```bash
grep -n "[schlüsselwort-aus-fehlermeldung]" /home/user/djjessejay.ch/index.html
grep -n "[schlüsselwort]" /home/user/djjessejay.ch/scripts.js
```

Häufige Ursachen:
- `null` oder `undefined` DOM-Element (querySelector gibt null zurück)
- Async/await ohne try-catch
- Event-Listener auf nicht-existierendem Element
- API-Response-Format geändert

Syntax-Check:
```bash
node --check /home/user/djjessejay.ch/scripts.js 2>&1 || echo "Syntax-Fehler gefunden"
```

---

## Schritt 2b: JavaScript Logikfehler

Suche nach der betroffenen Funktion:
```bash
grep -n "function [funktionsname]\|[funktionsname] = \|[funktionsname] =>" /home/user/djjessejay.ch/index.html
```

Prüfe Event-Listener-Verknüpfungen:
```bash
grep -n "addEventListener\|onclick\|id=\"[element-id]\"" /home/user/djjessejay.ch/index.html
```

---

## Schritt 2c: CSS / Layout-Probleme

Suche nach betroffener CSS-Klasse oder Selector:
```bash
grep -n "[klasse]\|[element]" /home/user/djjessejay.ch/jessejay.css
grep -n "class=\"[klasse]" /home/user/djjessejay.ch/index.html | head -20
```

Tailwind-spezifisch:
```bash
grep -n "[tailwind-klasse]" /home/user/djjessejay.ch/index.html | head -10
```

---

## Schritt 2d: API / Netzwerk-Fehler

Claude API-Calls in djjessejay.ch:
```bash
grep -n "fetch\|apiKey\|claude\|anthropic" /home/user/djjessejay.ch/index.html | grep -v "^.*//.*fetch"
```

Prüfe:
- `apiKey` korrekt gesetzt (Zeile ~431)
- Response-Verarbeitung (`response.ok`, JSON-Parsing)
- CORS-Header für externe Ressourcen

---

## Schritt 2e: i18n / Übersetzungsfehler

Fehlenden Übersetzungsschlüssel finden:
```bash
grep -n "data-translate=" /home/user/djjessejay.ch/index.html | grep "[schlüssel]"
grep -n '"[schlüssel]"' /home/user/djjessejay.ch/index.html
```

Alle 4 Sprachblöcke prüfen (de, en, fr, it):
```bash
grep -n "translations\s*=" /home/user/djjessejay.ch/index.html
```

---

## Schritt 3: Ursache erklären

```
## Debug-Ergebnis: [Problem-Zusammenfassung]

**Ursache:** [Klare Erklärung was schiefläuft und warum]
**Betroffene Datei:** /home/user/djjessejay.ch/[datei] Zeile [N]
**Fehlertyp:** [Typ]

### Root Cause
[Code-Snippet der problematischen Stelle]

### Fix
[Korrekter Code]

Schweregrad: 🔴 Kritisch (Site kaputt) / 🟡 Wichtig (Feature kaputt) / 🟢 Minor (Kosmetik)
```

---

## Schritt 4: Fix implementieren

Nach Bestätigung den Fix anwenden mit Edit-Tool.

Regression-Check nach Fix:
```bash
grep -n "[betroffene-funktion]\|[betroffenes-element]" /home/user/djjessejay.ch/index.html | head -20
node --check /home/user/djjessejay.ch/scripts.js 2>&1
```

Soll ich den Fix committen? (`git commit -m "fix: [beschreibung]"`)
