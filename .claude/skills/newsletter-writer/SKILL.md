---
name: newsletter-writer
description: Fan-Newsletter für DJ Jesse Jay schreiben — monatliche Updates über Gigs, Radio-Shows, neue Mixes, Musik-Empfehlungen. Verschiedene Formate: kurz (Email), lang (Substack), Social-Media-Variante. Trigger: "newsletter schreiben", "newsletter erstellen", "fan update", "email newsletter", "monatsupdate", "substack post".
argument-hint: <typ: monatlich | gig-ankuendigung | mix-release | radio-show>
allowed-tools: Read, Bash(grep -A 5 "$(date +%Y)" /home/user/djjessejay.ch/events.sql), Bash(cat /home/user/djjessejay.ch/.claude/ideas.md 2>/dev/null)
---

# Newsletter Writer: Fan-Updates für DJ Jesse Jay

**Typ:** $ARGUMENTS

---

## Newsletter-Typen

| Typ | Frequenz | Länge | Kanal |
|-----|----------|-------|-------|
| `monatlich` | 1× pro Monat | 300 Wörter | Email/Substack |
| `gig-ankuendigung` | Bei Bedarf | 150 Wörter | Email/Social |
| `mix-release` | Bei Mix-Upload | 100 Wörter | Email/Social |
| `radio-show` | Vor jeder Sendung | 100 Wörter | Email/Social |

---

## Schritt 1: Content sammeln

Anstehende Events laden:
```bash
grep -A 5 "$(date +%Y)" /home/user/djjessejay.ch/events.sql | head -20
```

---

## Vorlage: Monatlicher Newsletter

```
Betreff: [Monat] Update von DJ Jesse Jay 🎵

Hey [Vorname / "Hey ihr"],

hier sind meine Highlights aus [Monat] und was als nächstes kommt:

---

🎤 RÜCKBLICK

[1-2 Sätze über vergangenen Monat: Gigs, besondere Momente]

---

📅 UPCOMING GIGS

[Datum] — [Event] @ [Venue], [Stadt]
[kurze Beschreibung, 1 Satz]

[Weitere Gigs...]

---

📻 THE BLUE DIMENSION

Nächste Sendung: [Datum] auf Radio LoRa 97.5 FM Zürich
Thema: [falls geplant]
Stream: lora.ch

---

🎧 MUSIK-TIPP DES MONATS

[Track-Empfehlung] von [Artist]
[1 Satz warum dieser Track gerade begeistert]

---

Bis bald auf dem Dancefloor,
Jesse Jay
djjessejay.ch

Abmelden: [unsubscribe-link]
```

---

## Vorlage: Mix-Release Ankündigung

```
Betreff: Neuer Mix online: [Mix-Titel] 🎶

Hallo zusammen,

mein neuer Mix "[Mix-Titel]" ist jetzt online!

[1-2 Sätze über den Mix: Stimmung, Highlights, besondere Tracks]

🎵 Jetzt hören: [SoundCloud/Mixcloud Link]
Tracklist: [Link]

Genres: [Progressive House / Deep House / Techno]
Länge: [XX] Minuten

Feedback gerne über djjessejay.ch/contact

Jesse Jay
```

---

## Schritt 2: Newsletter personalisieren

Newsletter-Inhalt aus aktuellen Events und ideas.md generieren.

Soll ich den Newsletter direkt als Email-Entwurf formatieren oder für Substack/Mailchimp aufbereiten?
