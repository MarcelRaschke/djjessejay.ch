---
name: lead-magnet-creator
description: Booking-Lead-Magnets für DJ Jesse Jay erstellen — Promo-Mix-Beschreibungen, Pressekit-Texte, EPK (Electronic Press Kit), Booking-Seite optimieren, Kontaktformular-Texte verbessern. Trigger: "lead magnet", "epk erstellen", "pressekit schreiben", "booking seite verbessern", "promo text", "dj profil schreiben".
argument-hint: <typ: epk | promo-mix | booking-text | bio-kurz | bio-lang>
allowed-tools: Read, Edit, Bash(grep -n "about\|bio\|booking\|contact" /home/user/djjessejay.ch/index.html), Bash(grep -n "biography\|biografie" /home/user/djjessejay.ch/index.html)
---

# Lead Magnet Creator: Booking-Unterlagen erstellen

**Typ:** $ARGUMENTS

---

## Verfügbare Lead-Magnet-Typen

| Typ | Länge | Verwendung |
|-----|-------|------------|
| `bio-kurz` | 50 Wörter | Social Media, Flyer |
| `bio-lang` | 200 Wörter | EPK, Pressemitteilungen |
| `epk` | Vollständig | Booking-Anfragen, Veranstalter |
| `promo-mix` | Mix-Beschreibung | SoundCloud, Mixcloud |
| `booking-text` | Buchungsseite | djjessejay.ch optimieren |

---

## Aktuelle Bio einlesen

```bash
grep -A 30 "biography\|biografie\|about" /home/user/djjessejay.ch/index.html | head -40
```

---

## Vorlage: bio-kurz (50 Wörter)

```
DJ Jesse Jay — seit 1997 treibende Kraft der Zürcher Elektronik-Szene.
Progressive House, Deep House, Techno. Moderator der Radiosendung
"The Blue Dimension" auf Radio LoRa 97.5 FM. Buchungsanfragen: djjessejay.ch
```

---

## Vorlage: bio-lang (200 Wörter)

```
DJ Jesse Jay gehört seit 1997 zu den beständigsten Figuren der Schweizer
Electronic-Music-Szene. In Zürich verwurzelt, prägt er mit seinem sound-
ästhetischen Gespür für Progressive House, Deep House und Techno das
lokale Nightlife nachhaltig.

Sein musikalisches Handwerk verfeinerte Jesse Jay über Jahrzehnte auf
Zürichs wichtigsten Club-Floors sowie auf regionalen Festivals. Sein
Ansatz verbindet atmosphärische Tiefe mit treibender Energie — Sets
die eine Reise darstellen, nicht nur eine Aneinanderreihung von Tracks.

Seit [Jahr] moderiert und curatiert er die Sendung "The Blue Dimension"
auf Radio LoRa 97.5 FM Zürich — ein monatliches Deep-Dive-Format für
Kenner elektronischer Musik.

Booking: djjessejay.ch | Radio LoRa 97.5 FM Zürich
```

---

## Vorlage: EPK (Electronic Press Kit)

```
# DJ Jesse Jay — Electronic Press Kit

## Steckbrief
Name: DJ Jesse Jay
Standort: Zürich, Schweiz
Aktiv seit: 1997
Genres: Progressive House • Deep House • Techno
Radio: "The Blue Dimension" — Radio LoRa 97.5 FM Zürich

## Biografie
[bio-lang Text]

## Was ich biete
- Sets von 1–6 Stunden
- Eigenes Pioneer CDJ/DJM-Setup auf Wunsch
- Erfahrung: Clubs, Festivals, Private Events, Open Air
- Musikprogramm: Floor-tauglich bis Sunrise-Atmosphäre

## Referenzen
[Vergangene Venues/Events]

## Technischer Rider
[tech-rider Link oder Text]

## Kontakt
djjessejay.ch | [Email]
```

---

## Schritt: In Website übernehmen

Falls Bio-Text verbessert werden soll → direkte Änderung in `index.html` vorschlagen.

```bash
grep -n "bio\|biography\|biografie\|about" /home/user/djjessejay.ch/index.html | head -10
```

Soll ich den Text direkt in die Website übernehmen?
