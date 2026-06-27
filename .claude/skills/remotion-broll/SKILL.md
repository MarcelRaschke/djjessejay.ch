---
name: remotion-broll
description: B-Roll-Konzepte und Shot-Lists für DJ Jesse Jay Videos erstellen — Set-Videos, Radio-Show-Clips, Behind-the-Scenes, Event-Rückblicke. Beschreibt welche Shots gebraucht werden und wie sie umzusetzen sind. Trigger: "b-roll", "video shots", "shot list", "video konzept", "dj video drehen", "behind the scenes video".
argument-hint: <video-typ: set-video | radio-show-clip | bts | event-rueckblick | promo>
allowed-tools: Read, Bash(cat /home/user/djjessejay.ch/events.sql | grep -A 3 "$(date +%Y)" | head -10)
---

# Remotion B-Roll: Shot-List für DJ Videos

**Video-Typ:** $ARGUMENTS

---

## B-Roll-Pakete nach Video-Typ

### Set-Video / Live-Recording

**Muss-Shots (kritisch):**
| Shot | Beschreibung | Dauer | Kameratyp |
|------|-------------|-------|-----------|
| Wide-Shot | DJ hinter dem Pult, Crowd sichtbar | 10–15s | Stativ |
| CDJ Close-up | Hände auf den Jogwheels | 5–8s | Handheld |
| Waveform | CDJ-Display mit laufendem Track | 3–5s | Makro |
| DJ-Gesicht | Jesse Jay konzentriert, im Moment | 5–8s | Nah |
| Crowd-Reaktion | Tanzende Leute, Arme in der Luft | 10s | Weitwinkel |

**Nice-to-Have:**
| Shot | Beschreibung |
|------|-------------|
| Mixer Close-up | Finger am EQ/Filter | 5s |
| Vinyl/USB-Stick | Quellmedium eingesteckt | 3s |
| Booth von hinten | Set-Perspektive als Crowd | 8s |
| Lichtshow | Lasers, Nebelmaschine | 5–10s |

---

### Radio-Show Clip (The Blue Dimension / Radio LoRa)

**Shot-List:**
1. Jesse Jay am Mikrofon im Radio-Studio (Weitwinkel)
2. Kopfhörer Close-up — Monitor-Mix hören
3. Mixer-Bedienung im Studio
4. Laptop/Playlist-Screen
5. "ON AIR"-Schild beleuchtet
6. Blick durch Studiofenster

---

### Behind the Scenes (BTS)

**Shot-List:**
1. Ankunft / Setup aufbauen (Pioneer Geräte aus der Tasche)
2. Cue-Points setzen, Playlist vorbereiten
3. Soundcheck / Monitoring einstellen
4. Jesse Jay backstage / Warm-Up
5. Kurzes Interview: "Was spielst du heute Nacht?"
6. Abbau nach dem Set

---

## Ausgabe-Format

```
## Shot-List: [Video-Typ] — [Event/Datum]

TOTAL-SHOTS: [N]
EMPFOHLENE AUFNAHME-DAUER: [X] Minuten Rohmaterial
EQUIPMENT: Smartphone mit Stabilizer / DSLR empfohlen

### Priorität 1 — Must-Shots (nicht verpassen)
1. [Shot-Name]: [Beschreibung] | [Dauer] | [Kamera-Hinweis]

### Priorität 2 — Nice-to-Have
...

### Schnittreihenfolge (Vorschlag)
1. Intro: [Shot]
2. Aufbau: [Shot]
...
```

Soll ich daraus ein YouTube-Beschreibung erstellen? (`/youtube-description`)
