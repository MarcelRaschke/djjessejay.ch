---
name: script-writer
description: Skripte für DJ Jesse Jay schreiben — Radio-Show-Moderation für "The Blue Dimension" auf Radio LoRa 97.5 FM, Intro/Outro-Texte, Ankündigungstexte, Interview-Fragen vorbereiten. Trigger: "skript schreiben", "radio moderation", "show skript", "intro text", "the blue dimension skript", "radio lora moderation", "ankündigungstext".
argument-hint: <typ: radio-intro | radio-outro | ankuendigung | interview | voller-show-ablauf>
allowed-tools: Read, Bash(date +%Y-%m-%d), Bash(grep -A 5 "$(date +%Y)" /home/user/djjessejay.ch/events.sql | head -10)
---

# Script Writer: Radio & Moderation Skripte

**Typ:** $ARGUMENTS

---

## Skript-Typen

| Typ | Länge | Verwendung |
|-----|-------|------------|
| `radio-intro` | 30–60s | Show-Einstieg auf Radio LoRa |
| `radio-outro` | 20–40s | Show-Abschluss, nächste Sendung ankündigen |
| `ankuendigung` | 10–20s | Zwischen Tracks, neuen Block ankündigen |
| `interview` | 5–10 Fragen | Gast-DJ oder Künstler im Studio |
| `voller-show-ablauf` | Vollständig | Komplett strukturierte 2h-Sendung |

---

## Vorlage: Radio-Intro (The Blue Dimension)

```
[MUSIK LÄUFT — FADE IN VOICE]

"Willkommen zurück in der Blue Dimension —
ich bin Jesse Jay, und das hier ist eure monatliche Reise
durch Progressive House, Deep House und Techno.

[Optional: Thema dieser Sendung]
Heute Nacht nehmen wir euch mit auf [Thema/Konzept].

Schnallt euch an — es geht los."

[MUSIK HOCHZIEHEN]
```

---

## Vorlage: Radio-Outro

```
[MUSIK FADEN]

"Das war die Blue Dimension für diesen Monat.
Danke dass ihr dabei wart — ihr seid das Beste.

Wer mehr von mir hören will: djjessejay.ch —
dort findet ihr meine Mixes, Gig-Dates und alles Weitere.

Die nächste Sendung: [Datum] um [Uhrzeit] hier auf Radio LoRa 97.5 FM Zürich.
Bis dann — stay deep."

[JINGLE / SIGN-OFF]
```

---

## Vorlage: Voller Show-Ablauf (2h)

```
THE BLUE DIMENSION — [Datum]
THEMA: [Thema der Sendung]

00:00 INTRO
  - Begrüssung (30s)
  - Thema ankündigen
  - Erste Musik: [Track 1, Artist]

00:05 BLOCK 1 — [Untertitel] (45 min)
  - [Track 1] → [Track 2] → ...
  - [Moderation nach 20 min, 1–2 Sätze]
  - [Track N]

00:50 MIDSHOW BREAK (2 min)
  - Sendung re-ankündigen: "Ihr hört die Blue Dimension..."
  - Upcoming Events: [Nächster Gig]
  - "Weiter geht's mit..."

00:52 BLOCK 2 — [Untertitel] (60 min)
  - [Tracks...]
  - [Moderation nach 30 min]

01:52 OUTRO (8 min)
  - Letzter Track (atmosphärisch)
  - Abschluss-Moderation (30s)
  - Outro-Jingle

02:00 ENDE
```

---

## Vorlage: Interview-Fragen (Gast-DJ)

```
PRE-INTERVIEW (warm-up):
1. "Wie lange bist du schon DJ?"
2. "Wie bist du zur elektronischen Musik gekommen?"

HAUPTFRAGEN:
3. "Was macht deinen Sound aus — was unterscheidet dich von anderen?"
4. "Welcher Track ist gerade dein Lieblings-Opener?"
5. "Was ist dein verrücktestes Gig-Erlebnis?"
6. "Wohin entwickelt sich Electronic Music gerade?"

ABSCHLUSS:
7. "Was kommt als nächstes für dich?"
8. "Wo können unsere Hörer mehr von dir finden?"
```

Soll ich den Skript-Text direkt für einen spezifischen Sendetermin anpassen?
