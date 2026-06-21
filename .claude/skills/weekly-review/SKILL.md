---
name: weekly-review
description: Wöchentlicher Review für DJ Jesse Jay — vergangene Gigs reflektieren, Website-Aktivität prüfen, anstehende Aufgaben priorisieren, Fortschritt zu Zielen messen. Struktuierte Wochenrückschau in 10 Minuten. Trigger: "weekly review", "wochenrückblick", "woche zusammenfassen", "was lief diese woche", "freitags review", "wochenplanung".
allowed-tools: Read, Bash(date +%Y-%m-%d), Bash(git -C /home/user/djjessejay.ch log --oneline --since="1 week ago"), Bash(grep -A 5 "$(date +%Y)" /home/user/djjessejay.ch/events.sql | head -20), Bash(cat /home/user/djjessejay.ch/.claude/ideas.md 2>/dev/null | grep -c "Status: 💡 Neu")
---

# Weekly Review: Wochenrückblick DJ Jesse Jay

---

## Schritt 1: Daten sammeln

Aktuelle Woche:
```bash
date +"%V. KW %Y — %d. %B"
```

Code-Änderungen diese Woche:
```bash
git -C /home/user/djjessejay.ch log --oneline --since="1 week ago" 2>/dev/null | head -10
```

Anstehende Events:
```bash
grep -A 5 "$(date +%Y)" /home/user/djjessejay.ch/events.sql | head -20
```

Offene Ideen:
```bash
cat /home/user/djjessejay.ch/.claude/ideas.md 2>/dev/null | grep -c "Status: 💡 Neu"
```

---

## Schritt 2: Review-Struktur

```
## Weekly Review — KW [N], [Datum]

### 🎵 GIGS & AUFTRITTE
Vergangene Woche gespielt: [Ja/Nein — wo, wie war's]
Nächste Woche: [Gig/kein Gig]

### 💻 WEBSITE & CONTENT
Code-Änderungen: [Anzahl Commits — was wurde gemacht]
Neuer Content: [Bilder/News/Events hinzugefügt?]
Gästebuch neue Einträge: [Anzahl]

### 🎧 MUSIK & PRODUKTION
Neue Tracks entdeckt: [Ja/Nein — welche]
Mix in Arbeit: [Status]
Radio-Show: [Nächste Sendung — Datum + Thema]

### 📱 SOCIAL MEDIA & MARKETING
Posts diese Woche: [Anzahl]
Was hat gut funktioniert: [Beobachtung]
Was ausbessern: [Idee]

### 💡 IDEEN & PROJEKTE
Neue Ideen diese Woche: [Anzahl]
Ideen in Umsetzung: [welche]
Blockierter Punkt: [falls vorhanden]

---

### ✅ NÄCHSTE WOCHE — TOP 3 PRIORITÄTEN
1. 🔴 [Wichtigste Aufgabe]
2. 🟡 [Zweite Priorität]
3. 🟢 [Nice-to-have]

### 💭 REFLEXION
Was lief gut: [1-2 Sätze]
Was verbessern: [1 Satz]
Energie-Level: ⭐⭐⭐☆☆ [1-5]

---
*Review erstellt: [Datum]*
```

---

## Schritt 3: Review speichern (optional)

Falls gewünscht, Review als Datei speichern:
`/home/user/djjessejay.ch/.claude/weekly-reviews/KW[N]-[Jahr].md`

Soll ich den Review als Datei speichern oder gleich die nächste Woche planen?
