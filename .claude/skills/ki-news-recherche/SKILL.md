---
name: ki-news-recherche
description: KI-gestützte Musik-News-Recherche für DJ Jesse Jay — aktuelle Trends in Electronic Music, Schweizer Club-Szene, Radio LoRa News, neue Releases im Progressive/Deep House/Techno-Bereich recherchieren und zusammenfassen. Trigger: "musik news", "electronic music news", "was ist neu", "zürich szene news", "neue releases recherchieren", "ki news recherche".
argument-hint: <thema | genre | zeitraum>
allowed-tools: Read, Bash(date +%Y-%m-%d)
---

# KI-News-Recherche: Elektronische Musik & Zürich-Szene

**Thema:** $ARGUMENTS

---

## Schritt 1: Recherche-Fokus setzen

| Bereich | Was gesucht wird |
|---------|-----------------|
| 🎵 **Neue Releases** | Neue Tracks/Alben in Progressive House, Deep House, Techno |
| 📻 **Radio LoRa** | Neuigkeiten, Programm-Änderungen, andere Shows |
| 🏙️ **Zürich Club-Szene** | Neue Clubs, Events, Venue-Neuigkeiten |
| 🎧 **DJ-Szene CH** | Schweizer DJs, Labels, Kooperationen |
| 🤖 **KI in Musik** | KI-Tools für DJs, generative Musik-Trends |
| 📅 **Upcoming Events** | Events in Zürich für Progressive/House/Techno-Fans |

---

## Schritt 2: Recherche durchführen

Basierend auf `$ARGUMENTS` oder Standard (alles Relevante) folgende Quellen abfragen:

**Für neue Releases:**
- Beatport Top 100 Progressive House / Deep House / Techno
- RA (Resident Advisor) neue Releases
- SoundCloud Trending in relevanten Genres

**Für Zürich-Szene:**
- Zukunft, Hive, Supermarket, Dachstock Bern Events
- Radio LoRa Programm (lora.ch)
- Zürich Moves, Openair-Kalender

**Für KI-Musik-Trends:**
- Suno, Udio, AIVA, Boomy Entwicklungen
- Serato/Rekordbox KI-Features
- Stem-Separation Tools (Stems, RipX)

---

## Schritt 3: Ausgabe-Format

```
## News-Recherche: [Thema] — [Datum]

### 🔥 Top-Findings

1. **[Titel]** — [Quelle]
   [2-3 Sätze Zusammenfassung]
   Relevant für Jesse Jay: [Warum wichtig]

2. **[Titel]** — [Quelle]
   [Zusammenfassung]

### 🎵 Neue Releases (diese Woche)
- [Artist] — [Track/Album] ([Label])
- ...

### 📅 Upcoming Events Zürich
| Datum | Event | Venue |
|-------|-------|-------|
| [datum] | [event] | [venue] |

### 💡 Action Items
- [ ] [Track in Set einbauen]
- [ ] [Event besuchen / networken]
- [ ] [Kontakt aufnehmen mit...]
```

---

## Schritt 4: Ideen speichern

Falls interessante Ideen dabei: `/idea-catcher [idee]` direkt vorschlagen.

Soll ich einen der Findings für Social Media aufbereiten? (`/funnel-builder`)
