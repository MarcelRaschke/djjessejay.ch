---
name: youtube-post-production
description: Post-Production-Workflow für DJ Jesse Jay YouTube-Videos — Checkliste von Rohmaterial bis veröffentlichtes Video: Schnitt, Thumbnails, Beschreibung, Tags, Upload-Einstellungen, Veröffentlichungs-Timing. Trigger: "youtube post production", "video fertigstellen", "mix hochladen", "youtube workflow", "video veröffentlichen", "upload vorbereiten".
argument-hint: <mix-titel | "radio-show" | "live-set">
allowed-tools: Read, Bash(date +%Y-%m-%d), Bash(ls /home/user/djjessejay.ch/img/ 2>/dev/null)
---

# YouTube Post-Production: Von Rohmaterial bis Upload

**Projekt:** $ARGUMENTS

---

## Vollständige Post-Production-Checkliste

### Phase 1: Audio-Aufbereitung (30–60 min)

```
□ Rohmix exportieren (WAV, 320kbps MP3)
□ Lautstärke normalisieren (-14 LUFS für YouTube)
□ Stille am Anfang/Ende entfernen (mind. 2s Fade-in/out)
□ Knackser/Fehler prüfen und korrigieren
□ Optional: Auphonic für Auto-Mastering
□ MP3 für SoundCloud/Mixcloud exportieren (separate Datei)
```

### Phase 2: Video-Erstellung (1–3h)

**Option A: Static Image Video (einfach)**
```
□ Artwork/Thumbnail als Video-Hintergrund (1920×1080)
□ Optional: Waveform-Animation überlagern
□ Tool: Da Vinci Resolve (kostenlos) oder CapCut
□ Export: MP4, H.264, 1080p, 8–15 Mbps
```

**Option B: Video mit B-Roll (aufwendiger)**
```
□ B-Roll Material sichten (→ /remotion-broll für Shot-Liste)
□ Schnittplan erstellen
□ DJ-Footage + B-Roll kombinieren
□ Farb-Grading: Warm/Cool je nach Stimmung
□ Lower-Third für Artist/Track-Info
□ Export: MP4, H.264, 1080p
```

### Phase 3: YouTube-Setup (20 min)

```
□ Thumbnail erstellen (1280×720px, <2MB) → /thumbnail-ideas
□ Titel schreiben → /youtube-description
□ Beschreibung schreiben → /youtube-description
□ Tags hinzufügen (max 500 Zeichen)
□ Playlist zuweisen: "Mixes" / "Radio Shows" / "Live Sets"
□ Sprache: Deutsch oder Englisch setzen
□ Keine Monetarisierung (GEMA/SUISA-Tracks)
□ Altersfreigabe: Keine Einschränkung
```

### Phase 4: Upload & Veröffentlichung

```
□ Als "Privat" hochladen zunächst (während Processing)
□ Ende-Bildschirm hinzufügen (+5s am Ende)
  - "Mehr Mixes ansehen" → Playlist
  - "Kanal abonnieren"
□ Kapiteln (Chapters) hinzufügen falls Tracklist vorhanden
□ Auf "Öffentlich" setzen zum optimalen Zeitpunkt:
  - Beste Zeit: Donnerstag/Freitag 17:00–19:00 Uhr CEST
  - Alternative: Samstag 10:00 Uhr
```

### Phase 5: Post-Launch (1h nach Upload)

```
□ Link teilen: Instagram Post → /funnel-builder
□ Instagram Stories (Reel-Clip) → /video-repurpose
□ SoundCloud Upload (Audio)
□ Newsletter-Erwähnung planen → /newsletter-writer
□ In Website-News eintragen → /content-update
```

---

## Ausgabe-Zusammenfassung

```
## Post-Production Status: [Mix-Name]

Phase 1 Audio: □ Ausstehend
Phase 2 Video: □ Ausstehend
Phase 3 YouTube: □ Ausstehend
Phase 4 Upload: □ Ausstehend
Phase 5 Promotion: □ Ausstehend

Geschätzte Gesamtzeit: [X]h
Upload-Zieldatum: [Datum]
Optimaler Veröffentlichungstag: [Tag] um [Uhrzeit]
```

Soll ich die YouTube-Beschreibung jetzt erstellen? (`/youtube-description [mix-titel]`)
