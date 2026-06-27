---
name: funnel-builder
description: Event- und Booking-Promotion-Funnel für DJ Jesse Jay erstellen — Landing-Page-Texte, Social-Media-Posts, Email-Sequenzen für Gig-Promotion, Radioshows und neue Mixes. Trigger: "funnel erstellen", "event promoten", "promotion plan", "gig bewerben", "marketing funnel", "mix veröffentlichen promoten".
argument-hint: <event-name | mix-titel | "radio-show">
allowed-tools: Read, Bash(cat /home/user/djjessejay.ch/events.sql), Bash(grep -n "news\|event\|gig" /home/user/djjessejay.ch/index.html)
---

# Funnel Builder: Promotion-Plan erstellen

**Ziel:** $ARGUMENTS

---

## Schritt 1: Promotion-Objekt identifizieren

| Typ | Beispiel | Funnel-Länge |
|-----|----------|-------------|
| **Gig/Event** | Club-Auftritt, Festival | 2 Wochen vorher |
| **Neuer Mix** | SoundCloud/Mixcloud Upload | 1 Woche |
| **Radio-Show** | The Blue Dimension auf LoRa | 3 Tage vorher |
| **Booking-Kampagne** | Sommer-Gigs akquirieren | 4 Wochen |

---

## Schritt 2: Funnel-Plan generieren

### Für Gig/Event (Beispiel: 14 Tage):

**Tag -14: Ankündigung**
```
Instagram/Facebook Post:
"🎵 SAVE THE DATE — [Event-Name]
📅 [Datum] | 📍 [Venue], Zürich
Progressive House • Deep House • Techno
Doors: [Zeit] | Set: [Zeit]
🎟️ [Ticket-Link oder Free Entry]
#djjessejay #zürich #electronicmusic #housemusic"
```

**Tag -7: Reminder + Teaser**
```
Story/Post mit Mix-Preview:
"Eine Woche noch! Hier ein kleiner Vorgeschmack 🎧
[Kurzes Audio-Clip oder Tracklist-Teaser]
→ djjessejay.ch für mehr Infos"
```

**Tag -3: Countdown**
```
"3 Tage noch bis [Event-Name] 🔥
Was euch erwartet: [1-2 Sätze über den Set]
Wer kommt? Kommentiert unten 👇"
```

**Tag 0: Live-Tag**
```
"HEUTE NACHT 🎉 [Event-Name]
Ab [Zeit] Uhr | [Venue]
Kommt vorbei! 🎶 #liveset #zürich"
```

**Tag +1: Nachbereitung**
```
"Was für eine Nacht! Danke [Venue] und allen die dabei waren 🙏
[Foto vom Set]
Nächster Auftritt: [nächstes Event]"
```

---

## Schritt 3: Website-Update

Prüfe ob Event in events.sql steht:
```bash
grep -i "[event-name]" /home/user/djjessejay.ch/events.sql
```

Falls nicht: `/event-manager add` vorschlagen.

---

## Schritt 4: Ausgabe-Paket

```
## Promotion-Paket: [Event/Mix-Name]

📅 Zeitplan: [X] Posts über [Y] Tage
📱 Kanäle: Instagram, Facebook, djjessejay.ch
✍️ Texte: [Anzahl] Posts vorbereitet

[Alle Post-Texte aufgelistet]

Soll ich die Texte anpassen oder weitere Kanäle (Newsletter, Radio) hinzufügen?
```
