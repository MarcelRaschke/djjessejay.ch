---
name: fireflies-import
description: Meeting-Notizen aus Fireflies.ai importieren und in djjessejay.ch-Datenbank übernehmen — Booking-Gespräche, Venue-Meetings, Pressegespräche strukturieren und als Events oder Kontakte speichern. Trigger: "fireflies importieren", "meeting notizen", "gesprächsnotizen übernehmen", "booking meeting notizen".
argument-hint: <meeting-zusammenfassung oder fireflies-export>
allowed-tools: Read, Edit, Bash(cat /home/user/djjessejay.ch/events.sql), Bash(grep -n "INSERT INTO" /home/user/djjessejay.ch/events.sql)
---

# Fireflies Import: Meeting-Notizen strukturieren

**Meeting-Input:** $ARGUMENTS

---

## Schritt 1: Meeting-Typ klassifizieren

| Typ | Merkmale | Aktion |
|-----|----------|--------|
| **Booking-Meeting** | Datum, Ort, Honorar, Spielzeit besprochen | → Events.sql ergänzen |
| **Venue-Kennenlernen** | Club/Location-Details, kein fixes Datum | → Notiz anlegen |
| **Pressegespräch** | Interview, Biografie, Fotos besprochen | → Content-Update |
| **Kooperation** | Radio, Podcast, Kollab-Anfrage | → Notiz + Follow-up |

---

## Schritt 2: Meeting-Daten extrahieren

Aus dem Meeting-Text folgende Infos extrahieren:

```
Datum des Meetings: ____
Gesprächspartner: ____
Kontakt (Email/Tel): ____
Besprochener Event: ____
Event-Datum: ____
Event-Ort: ____
Honorar: CHF ____
Spielzeit: ____ — ____ Uhr
Nächste Schritte: ____
Deadline Follow-up: ____
```

---

## Schritt 3: In Datenbank übernehmen

Aktuelles Event-Schema ansehen:
```bash
grep -A 20 "CREATE TABLE" /home/user/djjessejay.ch/events.sql | head -30
```

Falls Booking-Meeting → INSERT in events.sql vorschlagen:
```sql
INSERT INTO events (date, venue, city, description, status)
VALUES ('[datum]', '[venue]', '[stadt]', '[beschreibung]', 'tentative');
```

Falls kein Datum fest → Notiz als Kommentar in events.sql:
```sql
-- FOLLOW-UP [datum-heute]: [gesprächspartner] re [thema] — nächster Schritt: [aktion]
```

---

## Schritt 4: Zusammenfassung

```
## Meeting importiert

**Typ:** [typ]
**Gesprächspartner:** [name]
**Aktion:** [was wurde gemacht]
**Follow-up bis:** [datum]

Nächste Schritte:
1. [aktion 1]
2. [aktion 2]
```

Soll ich eine Bestätigungs-Email vorbereiten? (`/email-templates booking-anfrage`)
