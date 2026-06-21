---
name: morning-briefing
description: Tägliches Morgen-Briefing für DJ Jesse Jay — anstehende Gigs und Deadlines, offene Booking-Anfragen, Social-Media-To-Dos, aktuelle Musik-News-Highlights. Kompakte Tagesübersicht in 2 Minuten. Trigger: "morning briefing", "tagesübersicht", "was steht heute an", "guten morgen briefing", "daily briefing", "was ist heute wichtig".
allowed-tools: Read, Bash(date +%Y-%m-%d), Bash(grep -A 5 "$(date +%Y)" /home/user/djjessejay.ch/events.sql), Bash(cat /home/user/djjessejay.ch/.claude/ideas.md)
---

# Morning Briefing: Tagesübersicht für DJ Jesse Jay

---

## Schritt 1: Datum und anstehende Events

```bash
date +"%A, %d. %B %Y"
```

Nächste Gigs aus der Datenbank:
```bash
grep -A 5 "$(date +%Y)" /home/user/djjessejay.ch/events.sql | head -30
```

Events in den nächsten 14 Tagen herausfiltern und priorisieren.

---

## Schritt 2: Offene Ideen und Follow-ups

Offene Ideen aus idea-catcher:
```bash
cat /home/user/djjessejay.ch/.claude/ideas.md 2>/dev/null | grep -A 3 "Status: 💡 Neu" | head -20
```

---

## Schritt 3: Briefing ausgeben

```
## ☀️ Morning Briefing — [Wochentag], [Datum]

### 📅 Diese Woche
| Datum | Was | Priorität |
|-------|-----|-----------|
| [datum] | [gig/deadline] | 🔴/🟡/🟢 |

### 🎵 Nächster Gig
**[Event-Name]** am [Datum] @ [Venue]
Vorbereitung: [X Tage] — Set-Konzept: [status]

### ✅ Heute zu erledigen
- [ ] [Aufgabe 1 — aus offenen Follow-ups]
- [ ] [Aufgabe 2]
- [ ] [Social Media Post für [Event]]

### 💡 Offene Ideen (Top 3)
1. [Idee aus idea-catcher]
2. ...

### 📻 Radio LoRa
Nächste Sendung: [Datum] — Thema: [falls geplant]

---
Guten Start! 🎧
```

---

## Optional: Wöchentliche Zusammenfassung

Falls Argument `woche` oder `week`: Alle 7 Tage zeigen statt nur heute.

Soll ich den Briefing-Output als tägliche Erinnerung einrichten? (`/schedule`)
