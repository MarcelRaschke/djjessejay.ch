---
name: thumbnail-ideas
description: Thumbnail- und Artwork-Ideen für DJ Jesse Jay generieren — YouTube-Thumbnails für Mixes, Event-Flyer-Konzepte, Social-Media-Grafiken, Profilbild-Ideen. Mit konkreten Midjourney/DALL-E Prompts. Trigger: "thumbnail idee", "artwork erstellen", "cover art", "flyer idee", "youtube thumbnail", "social media grafik", "cover design".
argument-hint: <typ: youtube-thumbnail | event-flyer | social-cover | mix-artwork | profilbild>
allowed-tools: Read, Bash(ls /home/user/djjessejay.ch/img/ 2>/dev/null | head -20)
---

# Thumbnail Ideas: Artwork & Grafik-Konzepte

**Typ:** $ARGUMENTS

---

## Schritt 1: Vorhandene Bilder prüfen

```bash
ls /home/user/djjessejay.ch/img/ 2>/dev/null | head -20
```

---

## Thumbnail-Typen und Konzepte

### YouTube-Thumbnail (1280×720px)

**Konzept 1: "Der Profi am Pult"**
```
Layout: Jesse Jay 2/3 links, Schrift rechts
Elemente:
- Jesse Jay an Pioneer CDJ, Seitenansicht
- Dunkler Hintergrund mit subtilen Lichtstrahlen (cyan/blau)
- Grosser Text: [MIX-TITEL] in Bold, Weiss
- Kleiner Text: "DJ Jesse Jay" darunter
- Dauer-Badge: "[X]h" in Ecke oben rechts

Midjourney Prompt:
/imagine professional DJ at Pioneer CDJ decks, side profile, dark club atmosphere, cyan blue laser lights, cinematic lighting, ultra realistic, 8k --ar 16:9 --style raw
```

**Konzept 2: "Atmosphärisch/Abstract"**
```
Layout: Vollflächig, Text-Overlay
Elemente:
- Abstrakte Waveform/Sound-Visualisierung
- Farbe: Türkis-Blau auf Schwarz (Brand-Farben von djjessejay.ch)
- Text: Mix-Titel als Hauptelement
- Untertitel: Genre + Dauer

Midjourney Prompt:
/imagine abstract sound wave visualization, deep blue cyan gradient on black background, minimal design, music DJ, electronic --ar 16:9 --style raw
```

---

### Event-Flyer (1080×1080px oder A5)

**Minimal-Design-Konzept:**
```
Elemente:
- Event-Name gross (Top 1/3)
- DJ Jesse Jay Name (Mitte)
- Datum + Venue (unteres Drittel)
- Hintergrund: Dunkles Foto vom Venue oder abstrakt
- Farben: Cyan (#00BCD4) + Weiss auf Schwarz

Canva Template-Empfehlung:
"Club Flyer" Template → anpassen mit obigen Inhalten
```

---

### Mix-Artwork (1:1, 3000×3000px)

**Für SoundCloud/Mixcloud:**
```
Konzept: "The Blue Dimension Series"
- Wiederkehrendes Design für alle Episoden
- Nummerierung: "Episode [N]" prominent
- Datum: Monat Jahr
- Farben: Blau-Spektrum Gradient

Midjourney Prompt:
/imagine blue cosmic dimension, space nebula, deep blue purple, minimalist DJ mix cover artwork, square format --ar 1:1 --style raw
```

---

## DALL-E Prompts (kostenlos via Claude)

```
YouTube Thumbnail Basis:
"Professional DJ photo, Pioneer CDJ-3000 turntables, dramatic side lighting,
dark club atmosphere, blue and cyan lights, photorealistic, 16:9 format"

Abstract Background:
"Minimalist sound wave design, deep blue and cyan colors on black,
clean modern layout, music producer aesthetic, digital art"
```

---

## Ausgabe

```
## Thumbnail-Konzepte für: [Typ/Event]

### Empfohlenes Konzept: [Name]
**Masse:** [Breite × Höhe]
**Style:** [Beschreibung]
**Farben:** [Hex-Codes]
**Midjourney Prompt:** [Prompt]
**Werkzeug:** Canva / Midjourney / DALL-E

### Alternative Konzepte:
1. [Name]: [kurze Beschreibung]
2. [Name]: [kurze Beschreibung]
```

Soll ich den Midjourney/DALL-E Prompt direkt optimieren oder ein Canva-Layout beschreiben?
