---
name: security-audit
description: Security-Audit für djjessejay.ch — XSS, CSP, API-Key-Exposition, OWASP Top 10, Prompt-Injection, unsicheres innerHTML, Dependency-Vulnerabilities. Nutzen wenn der User "Security", "Sicherheit", "XSS", "Vulnerabilities", "sichere API", "CSP", "OWASP", "Prompt Injection", "Hacker", "Angriff" oder "Schwachstellen" sagt.
allowed-tools: Read, Grep, Glob, Bash(grep *), Bash(cat *), Bash(find *)
effort: high
---

# Security-Audit Skill für djjessejay.ch

Führt einen vollständigen Security-Review der Website durch, fokussiert auf clientseitige Schwachstellen, API-Sicherheit und Datenexposition.

## Prüfbereiche

### 1. XSS (Cross-Site Scripting) — KRITISCH

Suche nach unsicheren `innerHTML`-Zuweisungen mit dynamischen Inhalten:

```bash
grep -n "innerHTML\s*=" /home/user/djjessejay.ch/index.html | grep -v "spinner\|loading\|error\|Kopiert\|Copied\|static string"
```

Für jedes Ergebnis prüfen:
- Kommt der Wert von einer API-Antwort? → **KRITISCH**
- Kommt der Wert von einem User-Input? → **KRITISCH**
- Ist es ein hardcodierter HTML-String? → OK

**Sicheres Pattern (prüfen ob vorhanden):**
```javascript
// Gut: safeHTML() Funktion verwendet
function safeHTML(text) { ... }
bioContent.innerHTML = `<p>${safeHTML(aiResponse)}</p>`;

// Gut: textContent statt innerHTML
element.textContent = userInput;

// Schlecht: direktes innerHTML mit AI-Antwort
element.innerHTML = aiResponse;
```

Prüfe ob `safeHTML()` implementiert ist:
```bash
grep -n "safeHTML\|DOMPurify\|textContent" /home/user/djjessejay.ch/index.html | head -20
```

---

### 2. API-Key-Exposition — KRITISCH

```bash
grep -n "apiKey\|api_key\|x-api-key\|Authorization" /home/user/djjessejay.ch/index.html
```

Prüfen:
- [ ] `apiKey` ist leer (`""`) — Key wird extern gesetzt ✓
- [ ] Kein API-Key hardcodiert im Code
- [ ] Header `anthropic-dangerous-direct-browser-access: true` vorhanden → Dokumentiere als bewusste Entscheidung

**Wichtig:** Browser-seitige API-Calls sind für diese statische Site bewusst gewählt. Der Key wird via Hosting-Environment injiziert. Dokumentiere das als Designentscheidung, nicht als Fehler.

---

### 3. Content Security Policy (CSP)

```bash
grep -n "Content-Security-Policy\|content-security-policy" /home/user/djjessejay.ch/index.html
```

Falls keine CSP vorhanden:
- Empfehle CSP meta-Tag im `<head>`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  connect-src https://api.anthropic.com;
  img-src 'self' data:;
">
```

**Hinweis:** `'unsafe-inline'` ist nötig da Tailwind CDN und inline Scripts verwendet werden. Langfristig: Tailwind build-prozess empfehlen.

---

### 4. Sensitive Daten in Kommentaren / Logs

```bash
grep -n "console.log\|console.error\|TODO\|FIXME\|password\|secret\|token" /home/user/djjessejay.ch/index.html
grep -n "console.log\|console.error" /home/user/djjessejay.ch/scripts.js
```

Prüfe:
- Keine sensiblen Daten in console.log ausgegeben
- Keine API-Keys oder Passwörter in Kommentaren

---

### 5. Input-Validierung & Injection

```bash
grep -n "innerHTML\|outerHTML\|document.write\|eval(" /home/user/djjessejay.ch/index.html
grep -n "innerHTML\|outerHTML\|eval(" /home/user/djjessejay.ch/scripts.js
```

Prüfe Formular-Inputs:
```bash
grep -n "getElementById\('message\|getElementById\('name\|getElementById\('email" /home/user/djjessejay.ch/index.html | head -20
```

- Email-Validierung: HTML5 `type="email"` vorhanden?
- Message-Inhalt: Wird er escaped bevor er irgendwo eingefügt wird?

---

### 6. Externe Ressourcen & Supply Chain

```bash
grep -n "https://" /home/user/djjessejay.ch/index.html | grep -E "script|link rel=\"stylesheet\"|<script" | head -20
```

Prüfe für jede externe Ressource:
- [ ] Vertrauenswürdige Domain?
- [ ] SRI (Subresource Integrity) Hash vorhanden? → `integrity="sha384-..."`
- [ ] Tailwind CDN: Kein SRI — Empfehle lokalen Build für Production

**Empfehlung SRI für Google Fonts:**
```html
<!-- Fonts ohne SRI sind OK — Fonts ändern sich selten -->
<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">
```

---

### 7. reCAPTCHA & Formularsicherheit

```bash
grep -n "recaptcha\|captcha\|form.*submit\|fetch.*contact\|mailto" /home/user/djjessejay.ch/index.html | head -15
```

Prüfe Kontaktformular:
- [ ] CSRF-Schutz (für statische Sites nicht kritisch wenn kein Backend)
- [ ] reCAPTCHA implementiert?
- [ ] Server-seitige Validierung (falls Backend vorhanden)

---

### 8. GitHub Actions Security

```bash
ls /home/user/djjessejay.ch/.github/workflows/
grep -rn "secrets\.\|GITHUB_TOKEN\|permissions:" /home/user/djjessejay.ch/.github/workflows/ 2>/dev/null | head -20
```

Prüfe:
- [ ] Keine hardcodierten Secrets in Workflow-Dateien
- [ ] `permissions:` minimal gesetzt (principle of least privilege)
- [ ] Pinned Actions (commit SHA statt `@v4`)

---

## Audit-Report Format

Erstelle einen strukturierten Bericht:

```
## Security-Audit djjessejay.ch — [DATUM]

### KRITISCHE Befunde (sofort beheben)
- [Befund] — [Datei:Zeile] — [Empfehlung]

### HOHE Priorität
- [Befund] — [Datei:Zeile] — [Empfehlung]

### MITTLERE Priorität
- [Befund] — [Empfehlung]

### INFORMATIONEN (Design-Entscheidungen)
- [Befund] — [Begründung warum OK]

### Bestandener Check
- [X] safeHTML() implementiert
- [X] API-Key nicht hardcodiert
- ...
```

---

### 9. Prompt Injection — KRITISCH (bei KI-Integration)

**Was ist Prompt Injection?**
Angreifer schleusen über User-Inputs manipulierte Anweisungen in einen LLM-Prompt ein, um das Verhalten der KI zu übernehmen (z.B. System-Prompt leaken, Inhaltsfilter umgehen, falsche Daten ausgeben).

**Typen:**
- **Direct Injection:** User-Input geht ungefiltert in den Prompt
- **Indirect Injection:** Externe Daten (Websites, Dateien, API-Antworten) werden in Prompts eingebettet
- **Jailbreak-Vektoren:** `"Ignore previous instructions"`, `"Act as DAN"`, Role-Play-Tricks

#### Scan-Befehle

```bash
# 1. Direkte User-Input-Einbettung in Prompts finden
grep -n "prompt\|messages\|content" /home/user/djjessejay.ch/index.html | grep -i "input\|value\|innerText\|textContent" | head -20
```

```bash
# 2. Systemanweisungen die User-Input direkt einbetten
grep -n "role.*user\|role.*system" /home/user/djjessejay.ch/index.html | head -20
```

```bash
# 3. Fehlende Sanitisierung vor Prompt-Aufbau prüfen
grep -n "fetch.*anthropic\|messages.*push\|content.*+" /home/user/djjessejay.ch/index.html | head -30
```

```bash
# 4. System-Prompt im Frontend exponiert?
grep -n "system.*prompt\|SYSTEM\|instructions.*=" /home/user/djjessejay.ch/index.html | grep -v "//\s*[A-Z]" | head -20
```

#### Prüfliste Prompt Injection

| Check | Risiko | Schutzmaßnahme |
|-------|--------|----------------|
| User-Input direkt im `content`-Feld | 🔴 KRITISCH | Input-Länge begrenzen + Escape-Funktion |
| System-Prompt im Frontend sichtbar | 🔴 KRITISCH | System-Prompt nur serverseitig |
| Kein Input-Length-Limit | 🟡 HOCH | Max. 500–1000 Zeichen enforced |
| Keine Blocklist für Injection-Patterns | 🟡 HOCH | Pattern-Filter implementieren |
| Antworten ungefiltert in DOM eingefügt | 🟡 HOCH | `safeHTML()` auch auf AI-Antworten |
| Kein Rate-Limiting | 🟢 MITTEL | Max. X Anfragen/Minute pro Session |

#### Sichere vs. unsichere Muster

```javascript
// ❌ UNSICHER: User-Input direkt in Prompt
const messages = [{ role: "user", content: userInput }];

// ✅ SICHER: Input validieren + begrenzen
function sanitizePromptInput(input) {
  if (typeof input !== 'string') return '';
  // Länge begrenzen
  const trimmed = input.slice(0, 1000);
  // Bekannte Injection-Patterns blockieren
  const injectionPatterns = [
    /ignore\s+(previous|all|above)\s+instructions/i,
    /you\s+are\s+now\s+(DAN|an?\s+AI|a\s+language)/i,
    /\[SYSTEM\]|\[INST\]|<\|system\|>/i,
    /forget\s+(everything|all)\s+(you|your)/i,
    /act\s+as\s+(if|though)/i,
  ];
  for (const pattern of injectionPatterns) {
    if (pattern.test(trimmed)) {
      return '[Input enthält unzulässige Anweisungen]';
    }
  }
  return trimmed;
}

const safeInput = sanitizePromptInput(userInput);
const messages = [{ role: "user", content: safeInput }];
```

```javascript
// ✅ System-Prompt schützen — NIE im Frontend exponieren
// Falsch: const systemPrompt = "Du bist Jesse's Booking-Assistent..."
// Richtig: System-Prompt nur in Environment-Variable oder Server-Side

// ✅ AI-Antworten vor DOM-Einbindung sanitisieren
function safeAIResponse(response) {
  // Schädliche HTML/Script-Tags aus AI-Antwort entfernen
  return response
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}
```

#### Befunde dokumentieren

```
## Prompt Injection Audit

### KRITISCH
- [ ] User-Input wird ungefiltert in API-Calls eingebettet → sanitizePromptInput() implementieren
- [ ] System-Prompt im Frontend sichtbar → in Backend auslagern

### HOCH
- [ ] Kein Input-Length-Limit → max. 1000 Zeichen enforced
- [ ] Keine Injection-Pattern-Blocklist → 5 häufigste Patterns blockieren

### BESTANDEN
- [x] safeHTML() für DOM-Ausgabe vorhanden
- [x] API-Key nicht im Klartext
```

---

## Abschluss

Nach dem Audit:
1. Priorisiere Fixes nach Schweregrad (Prompt Injection + XSS zuerst)
2. Biete an jeden Befund direkt zu beheben
3. Für kritische Fixes: gleich implementieren und mit `/auto-deploy` deployen

Soll ich:
- a) Den vollständigen Audit jetzt durchführen?
- b) Nur den Prompt-Injection-Check ausführen?
- c) Einen gefundenen Befund direkt fixen?
