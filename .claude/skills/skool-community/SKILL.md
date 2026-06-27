---
name: skool-community
description: Fan- und Community-Management für DJ Jesse Jay — Kommentare beantworten, Community-Updates schreiben, Fan-Interaktion auf Social Media fördern, Gästebuch moderieren, Community-Events planen. Trigger: "community", "fans", "social media antworten", "kommentare beantworten", "community post", "fan engagement".
argument-hint: <aktion: post | antwort | event | gaestebuch>
allowed-tools: Read, Bash(cat /home/user/djjessejay.ch/guestbook.sql 2>/dev/null | tail -20), Bash(grep -c "INSERT INTO" /home/user/djjessejay.ch/guestbook.sql 2>/dev/null)
---

# Skool Community: Fan & Community Management

**Aktion:** $ARGUMENTS

---

## Community-Bereiche

| Bereich | Tool | Frequenz |
|---------|------|---------|
| Website Gästebuch | guestbook.sql | Bei Bedarf |
| Instagram Kommentare | Manuell / Make.com | Täglich |
| Facebook | Manuell | Wöchentlich |
| SoundCloud Kommentare | Manuell | Bei neuen Mixes |
| Newsletter-Replies | Email | Bei Bedarf |

---

## Schritt 1: Gästebuch-Status prüfen

```bash
grep -c "INSERT INTO" /home/user/djjessejay.ch/guestbook.sql 2>/dev/null
```

```bash
tail -30 /home/user/djjessejay.ch/guestbook.sql
```

---

## Community-Post-Vorlagen

### Dankespost nach einem Gig

```
Danke, [Venue]! 🙏

Was für eine Nacht — ihr habt alles gegeben und ich hab's gespürt.
[1-2 Sätze über den spezifischen Abend / besonderer Moment]

Nächster Stop: [nächstes Event am Datum]

Tracklist auf Anfrage oder → djjessejay.ch
#djjessejay #zürich #[venue] #electronicmusic #housemusic #techno
```

### Community-Frage (Engagement-Post)

```
Kleine Frage an euch 🎧

[Frage die Fans involviert, z.B.:]
"Welcher Track hat euch zuletzt komplett aus den Socken gehauen?"
"Club oder Open Air — was ist euer Vibe?"
"Welches Zürich-Venue vermisst ihr am meisten?"

Kommentiert unten 👇

#djjessejay #zürich #electronicmusic #community
```

### Antwort-Vorlagen für Kommentare

```
Positiv/Dankeschön:
"Danke dir! Freut mich riesig zu hören 🙌"

Tracklist-Anfrage:
"Tracklist folgt! Hier oder auf djjessejay.ch 🎵"

Booking-Anfrage in Kommentaren:
"Schreib mir direkt über djjessejay.ch/contact —
dann können wir das Details besprechen 🎧"

Technische Frage (Equipment):
"Geile Frage — ich nutze [Equipment].
DM mich wenn du mehr wissen willst!"
```

---

## Community-Event-Ideen

| Idee | Format | Aufwand |
|------|--------|---------|
| Q&A Session | Instagram Live | ⭐⭐ |
| Behind-the-Scenes Story | Instagram Stories | ⭐ |
| Tracklist der Woche | Post + Stories | ⭐ |
| Fan-Mix Challenge | Community-Contest | ⭐⭐⭐ |
| Exklusiver Mix für Newsletter-Abos | Email | ⭐⭐ |

Soll ich Gästebuch-Einträge moderieren? (`/guestbook-manager`)
