---
name: video-repurpose
description: DJ Jesse Jay Videos und Radio-Shows für verschiedene Plattformen aufbereiten — langer Mix zu YouTube, Clips zu Instagram Reels/TikTok, Audio zu Podcast, Radio-Show zu SoundCloud. Erstellt Plattform-spezifische Texte und Posting-Plan. Trigger: "video repurposen", "mix veröffentlichen", "content aufbereiten", "reels erstellen", "tiktok clip", "radio show uploaden", "mix zu podcast".
argument-hint: <quelle: youtube-mix | radio-show | live-set | interview> [plattformen]
allowed-tools: Read, Bash(date +%Y-%m-%d), Bash(ls /home/user/djjessejay.ch/img/)
---

# Video Repurpose: Content für alle Plattformen

**Quelle:** $ARGUMENTS

---

## Schritt 1: Quell-Content identifizieren

| Quelle | Original-Format | Länge |
|--------|----------------|-------|
| `youtube-mix` | Full DJ Mix | 1–6h |
| `radio-show` | The Blue Dimension | 2h |
| `live-set` | Gig-Recording | 1–4h |
| `interview` | Radio/Podcast-Interview | 15–60min |

---

## Repurpose-Matrix

| Zielplattform | Format | Länge | Aus |
|---------------|--------|-------|-----|
| YouTube | Full Mix Video | Original | YouTube-Mix |
| SoundCloud | Audio-Mix | Original | Alle |
| Instagram Reels | Energie-Clip | 15–30s | Bester Moment |
| TikTok | Trending-Clip | 30–60s | Hook-Moment |
| Instagram Stories | "Now Playing" | 15s | Track-Ankündigung |
| Podcast / RSS | Episode | 30–60min | Radio-Show (geschnitten) |
| YouTube Shorts | Highlight | 60s | Bester Breakdown |

---

## Schritt 2: Texte für jede Plattform generieren

### YouTube (Full Mix)

```
TITEL: [Mix-Name] | DJ Jesse Jay | Progressive House / Deep House / Techno | [Dauer]

BESCHREIBUNG:
→ /youtube-description für vollständige Beschreibung
```

### Instagram Reel / TikTok Caption

```
🎵 [Momentbeschreibung — 5 Wörter max]

[1 Zeile Hook: "Wenn der Drop nach Mitternacht kommt..."]

🎧 Full Mix: djjessejay.ch / SoundCloud
📅 Nächstes Live-Set: [Datum + Venue]

#djjessejay #progressivehouse #deephouse #techno #zürich #electronicmusic #dj #djset #housemusic
```

### SoundCloud Post

```
TITEL: [Mix-Name] [Monat Jahr] | Progressive House / Deep House / Techno

BESCHREIBUNG:
[2-3 Sätze über den Mix: Stimmung, Highlights, entstanden wo]

► Tracklist:
01. [Artist] — [Track] [Label]
02. [Artist] — [Track] [Label]
...

📩 Booking: djjessejay.ch/contact
📻 Radio LoRa 97.5 FM Zürich — The Blue Dimension
```

---

## Schritt 3: Posting-Plan erstellen

```
## Repurpose-Plan: [Mix/Show-Name]

📅 Veröffentlichungsreihenfolge:

Tag 0: YouTube Full Mix + SoundCloud Upload
Tag 1: Instagram Reel (Energie-Clip)
Tag 2: TikTok (Trending-Moment)
Tag 3: Instagram Stories (Tracklist-Teaser)
Tag 7: YouTube Shorts (Highlight)
Tag 14: Newsletter-Erwähnung

TEXTE BEREIT FÜR:
✅ YouTube Titel + Beschreibung
✅ Instagram Caption
✅ TikTok Caption
✅ SoundCloud Beschreibung
□ Podcast-Episode-Beschreibung (falls nötig)
```

Soll ich die YouTube-Beschreibung jetzt erstellen? (`/youtube-description`)
