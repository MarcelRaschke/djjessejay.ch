---
name: make-connect
description: Make.com (ehemals Integromat) Automationen für DJ Jesse Jay einrichten — Booking-Anfragen automatisch weiterleiten, Gig-Kalender synchronisieren, Social-Media-Posts automatisieren, Website-Kontaktformular mit Email verbinden. Trigger: "make automation", "make.com", "automatisierung einrichten", "zapier", "booking automatisieren", "workflow automatisieren".
argument-hint: <automation-typ: booking-email | kalender-sync | social-post | kontaktformular>
allowed-tools: Read, Bash(grep -n "contact\|form\|email\|submit" /home/user/djjessejay.ch/index.html), Bash(grep -n "fetch\|POST\|api" /home/user/djjessejay.ch/index.html)
---

# Make Connect: Automationen für DJ Jesse Jay

**Automation:** $ARGUMENTS

---

## Verfügbare Automationen

| Typ | Was es tut | Komplexität |
|-----|-----------|------------|
| `booking-email` | Kontaktformular → Email + Kalender-Eintrag | ⭐⭐ |
| `kalender-sync` | Events.sql → Google Kalender / iCal | ⭐⭐⭐ |
| `social-post` | Neuer Event → Instagram/Facebook Auto-Post | ⭐⭐⭐ |
| `newsletter-trigger` | Neuer Gig → Newsletter-Segment | ⭐⭐⭐⭐ |

---

## Schritt 1: Kontaktformular analysieren

Prüfe aktuellen Formular-Handler in djjessejay.ch:
```bash
grep -n "submit\|formData\|fetch.*POST\|contact" /home/user/djjessejay.ch/index.html | head -20
```

---

## Automation: booking-email (Webhook → Email)

**Make.com Scenario:**
```
Trigger: Webhook (URL in Kontaktformular eintragen)
    ↓
Filter: Ist es eine Booking-Anfrage? (Feld "Typ" = "booking")
    ↓
Action 1: Email senden an jesse@djjessejay.ch
    Subject: "Neue Booking-Anfrage: {name} — {datum}"
    Body: Alle Formularfelder formatiert
    ↓
Action 2: Google Sheets Zeile hinzufügen (Anfragen-Log)
    ↓
Action 3: Auto-Reply an Anfragenden
    Body: /email-templates booking-anfrage Vorlage
```

**Webhook-URL Integration in index.html:**
```javascript
// Aktuellen Submit-Handler finden und Webhook hinzufügen:
const webhookUrl = 'https://hook.eu1.make.com/[dein-webhook-id]';
await fetch(webhookUrl, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(formData)
});
```

---

## Automation: social-post (Event → Instagram)

**Make.com Scenario:**
```
Trigger: Google Sheets - neue Zeile (oder manuell)
    ↓
Action 1: Text generieren mit Claude API
    Prompt: "Schreibe Instagram-Post für Event: {event-details}"
    ↓
Action 2: Instagram Graph API - Post erstellen (Business Account nötig)
    ↓
Action 3: Facebook Page - gleicher Post
```

---

## Schritt: Webhook in Website einbauen

Falls gewünscht, Webhook-Integration in Kontaktformular zeigen:
```bash
grep -n "addEventListener.*submit\|handleSubmit\|sendForm" /home/user/djjessejay.ch/index.html
```

Soll ich den Webhook-Code direkt in das Kontaktformular einbauen?
