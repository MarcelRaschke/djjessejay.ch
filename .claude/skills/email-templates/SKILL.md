---
name: email-templates
description: E-Mail-Vorlagen für DJ Jesse Jay — Booking-Anfragen beantworten, Gig-Bestätigungen, Tech-Rider versenden, Pressekit anfordern, Absagen formulieren. Trigger: "email schreiben", "booking anfrage beantworten", "gig bestätigen", "tech rider email", "absage formulieren", "mail vorlage".
argument-hint: <typ: booking-anfrage | gig-bestaetigung | absage | tech-rider | pressekit | followup>
allowed-tools: Read, Bash(cat /home/user/djjessejay.ch/events.sql), Bash(grep -n "contact\|email\|booking" /home/user/djjessejay.ch/index.html)
---

# Email Templates: DJ Jesse Jay

**Typ:** $ARGUMENTS

---

## Verfügbare Vorlagen

| Typ | Wann nutzen |
|-----|-------------|
| `booking-anfrage` | Eingehende Buchungsanfrage beantworten |
| `gig-bestaetigung` | Gebuchten Auftritt offiziell bestätigen |
| `absage` | Anfrage höflich ablehnen |
| `tech-rider` | Technische Anforderungen zusenden |
| `pressekit` | Pressekit und Biografie zusenden |
| `followup` | Nachfassen nach Anfrage ohne Antwort |

---

## Vorlage: booking-anfrage (Angebot zurücksenden)

```
Betreff: Re: DJ-Booking Anfrage — [Veranstaltungsname] am [Datum]

Guten Tag [Name],

vielen Dank für Ihre Anfrage. Ich freue mich über Ihr Interesse!

Für Ihren Event "[Veranstaltungsname]" am [Datum] in [Ort] stehe ich grundsätzlich
gerne zur Verfügung.

Mein Honorar für [Dauer]-stündige Sets beträgt CHF [Betrag] inkl. eigenes Equipment.

Was ich mitbringe:
- Pioneer CDJ-2000 + DJM-900 (falls kein Club-Equipment vorhanden)
- Musikprogramm: Progressive House, Deep House, Techno (1997 — heute)
- Radiosendung "The Blue Dimension" auf Radio LoRa 97.5 FM Zürich als Referenz

Für eine definitive Buchung benötige ich:
□ Genaue Adresse / Anfahrt
□ Gewünschte Spielzeit (von/bis)
□ Technische Ausstattung vor Ort

Ich freue mich auf Ihre Rückmeldung!

Mit freundlichen Grüssen
DJ Jesse Jay
djjessejay.ch | Radio LoRa 97.5 FM Zürich
```

---

## Vorlage: gig-bestaetigung

```
Betreff: Buchungsbestätigung — [Veranstaltungsname] am [Datum]

Guten Tag [Name],

hiermit bestätige ich verbindlich meine Teilnahme als DJ für:

📅 Datum: [Datum]
🕐 Spielzeit: [von] — [bis] Uhr
📍 Ort: [Adresse]
💶 Honorar: CHF [Betrag] (Zahlung: [bar/Überweisung])

Anbei mein Tech-Rider mit den technischen Anforderungen.

Ich freue mich auf den Abend!

DJ Jesse Jay
```

---

## Vorlage: absage

```
Betreff: Re: Booking-Anfrage [Datum]

Guten Tag [Name],

vielen Dank für Ihre Anfrage und Ihr Interesse an DJ Jesse Jay.

Leider bin ich am [Datum] bereits anderweitig gebucht / stehe aus
persönlichen Gründen nicht zur Verfügung.

Für zukünftige Events freue ich mich jederzeit über eine neue Anfrage.

Mit freundlichen Grüssen
DJ Jesse Jay
djjessejay.ch
```

---

## Vorlage: tech-rider

```
Betreff: Tech-Rider — DJ Jesse Jay

Technische Anforderungen DJ Jesse Jay:

MINIMUM-SETUP:
□ 2× Pioneer CDJ-2000NXS2 (oder CDJ-3000)
□ 1× Pioneer DJM-900NXS2 (oder DJM-V10)
□ Monitore auf Stage (mind. 2× Wedge-Monitor)
□ XLR-Verbindung zum PA-System

ALTERNATIV (falls kein Club-Equipment):
□ Ich bringe eigenes Pioneer CDJ/DJM Setup mit (Aufpreis: CHF 100)

SONSTIGES:
□ Backstage-Bereich / Garderobeabe
□ 1× Getränke-Flatrate (nichtalkoholisch)
□ GEMA/SUISA liegt beim Veranstalter

Bei Fragen: djjessejay.ch/contact
```

---

## Vorlage: pressekit

```
Betreff: Pressekit DJ Jesse Jay

[Name],

anbei mein aktuelles Pressekit:

KURZBIOGRAFIE:
DJ Jesse Jay ist seit 1997 in der Zürcher Club- und Radiolandschaft aktiv.
Sein Sound bewegt sich zwischen Progressive House, Deep House und Techno.
Seit [Jahr] hostet er die monatliche Sendung "The Blue Dimension" auf
Radio LoRa 97.5 FM Zürich.

WEBSITE: https://djjessejay.ch
SOUNDCLOUD/MIXES: [Link]
FOTO: [Link oder Anhang]

Bei weiteren Fragen stehe ich gerne zur Verfügung.

DJ Jesse Jay
```

---

Falls `$ARGUMENTS` einen konkreten Typ enthält: Vorlage direkt ausgeben und nach Event-Daten fragen um sie zu personalisieren.

Soll ich eine dieser Vorlagen für einen konkreten Anlass ausfüllen?
