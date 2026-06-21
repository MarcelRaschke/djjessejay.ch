---
name: sevdesk-connect
description: sevdesk-Buchhaltung für DJ Jesse Jay — Rechnungen für Gigs erstellen, Einnahmen tracken, Ausgaben-Kategorien für Equipment und Fahrtkosten, Jahresübersicht für Steuer. Trigger: "rechnung erstellen", "sevdesk", "buchhaltung", "invoice", "einnahmen tracken", "steuer vorbereiten", "gig abrechnen".
argument-hint: <aktion: rechnung | ausgabe | jahresuebersicht | export>
allowed-tools: Read, Bash(date +%Y-%m-%d), Bash(grep -A 5 "$(date +%Y)" /home/user/djjessejay.ch/events.sql | head -20)
---

# sevdesk Connect: Buchhaltung für DJ Jesse Jay

**Aktion:** $ARGUMENTS

---

## Aktionen

| Aktion | Was es tut |
|--------|-----------|
| `rechnung` | Neue Gig-Rechnung erstellen |
| `ausgabe` | Equipment/Fahrtkosten erfassen |
| `jahresuebersicht` | Einnahmen/Ausgaben nach Jahr |
| `export` | Daten für Steuerberater exportieren |

---

## Vorlage: Gig-Rechnung

Vergangene Gigs aus Datenbank laden:
```bash
grep -B 2 -A 8 "$(date +%Y)" /home/user/djjessejay.ch/events.sql | head -30
```

Rechnungs-Template:

```
RECHNUNG Nr. [YYYY-NR]
Datum: [Datum]

VON:
DJ Jesse Jay
[Adresse Zürich]
MWST-Nr: [falls vorhanden]

AN:
[Veranstalter-Name]
[Adresse]

LEISTUNG:
DJ-Auftritt "[Event-Name]"
Datum: [Event-Datum]
Ort: [Venue], [Stadt]
Spielzeit: [von] — [bis] Uhr ([X] Stunden)

BETRAG:
Honorar [X]h × CHF [Stundensatz]: CHF ____
Equipment-Pauschale:              CHF ____
Fahrtkosten ([X] km):             CHF ____
                                  ─────────
TOTAL (inkl. MWST [X]%):         CHF ____

Zahlungsfrist: 30 Tage
IBAN: CH__ ____ ____ ____ ____ _
```

---

## Ausgaben-Kategorien

| Kategorie | Beispiele |
|-----------|----------|
| Equipment | CDJ, DJM, Kopfhörer, USB-Sticks |
| Fahrtkosten | Zug, Auto, Benzin, Parkgebühren |
| Software | Rekordbox-Lizenz, Serato, Streaming |
| Marketing | Foto-Shooting, Flyer, Website-Hosting |
| Weiterbildung | DJ-Kurse, Musik-Abos (Beatport, etc.) |
| Kommunikation | Telefon-Anteil Geschäftlich |

---

## Jahresübersicht

```
## Jahresübersicht [Jahr]

### Einnahmen
| Datum | Auftraggeber | Betrag |
|-------|-------------|--------|
| [datum] | [venue] | CHF [X] |

**Total Einnahmen: CHF ____**

### Ausgaben
| Datum | Kategorie | Beschreibung | Betrag |
|-------|-----------|-------------|--------|
| [datum] | Equipment | [was] | CHF [X] |

**Total Ausgaben: CHF ____**

### Ergebnis
Gewinn/Verlust: CHF ____
MWST-Schuld (ca.): CHF ____
```

Soll ich eine konkrete Rechnung für einen Gig aus events.sql erstellen?
