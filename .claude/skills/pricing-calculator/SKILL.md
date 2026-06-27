---
name: pricing-calculator
description: DJ-Honorar berechnen und Angebote kalkulieren für DJ Jesse Jay — Preis basierend auf Dauer, Event-Typ, Equipment-Bedarf, Fahrtkosten. Erstellt transparente Angebots-Aufstellung. Trigger: "preis berechnen", "honorar kalkulieren", "was kostet ein booking", "angebot erstellen", "pricing", "booking kosten".
argument-hint: <event-typ> <dauer-stunden> [ort]
allowed-tools: Read, Bash(date +%Y-%m-%d)
---

# Pricing Calculator: DJ-Honorar kalkulieren

**Anfrage:** $ARGUMENTS

---

## Schritt 1: Event-Details erfassen

Falls nicht in `$ARGUMENTS` angegeben, fragen:

```
1. Event-Typ: Club / Festival / Private Party / Corporate / Hochzeit / Open Air
2. Spielzeit: [X] Stunden
3. Ort: [Stadt / Venue]
4. Distanz von Zürich: [km] (für Fahrtkosten)
5. Equipment vorhanden? Club-Setup (CDJ/DJM) vorhanden oder muss Jesse Jay eigenes mitbringen?
6. Wochentag: Werktag / Freitag / Samstag / Sonntag / Feiertag
```

---

## Schritt 2: Preisberechnung

### Basis-Honorar nach Event-Typ

| Event-Typ | Basis (2h) | +pro Stunde |
|-----------|-----------|-------------|
| Club (lokale) | CHF 300–500 | +CHF 100 |
| Club (überregional) | CHF 500–800 | +CHF 150 |
| Private Party | CHF 400–600 | +CHF 120 |
| Corporate Event | CHF 600–1000 | +CHF 200 |
| Hochzeit | CHF 800–1200 | +CHF 200 |
| Festival | CHF 500–1500 | individuell |

### Zuschläge

| Faktor | Aufschlag |
|--------|-----------|
| Freitag/Samstag/Feiertag | +20% |
| Eigenes Equipment mitbringen | +CHF 100–150 |
| Fahrt >50 km einfach | +CHF 0.70/km oder Zugticket 1. Kl. |
| Übernachtung nötig (>100 km) | +CHF 120–180 |
| Letzte-Minute (<2 Wochen) | +25% |

---

## Schritt 3: Angebot ausgeben

```
## Angebot: [Event-Name] — [Datum]

### Leistungen
- DJ-Set: [X] Stunden [Genre: Progressive House / Deep House / Techno]
- Equipment: [Club-Setup vorhanden / Jesse Jay bringt Pioneer CDJ+DJM mit]

### Kostenaufstellung
| Position | Betrag |
|----------|--------|
| Basis-Honorar ([X]h × [Satz]) | CHF [X] |
| Wochentag-Zuschlag [+20%] | CHF [X] |
| Equipment-Pauschale | CHF [X] |
| Fahrtkosten ([X] km × CHF 0.70) | CHF [X] |
| **TOTAL** | **CHF [X]** |

### Zahlungskonditionen
- 50% Anzahlung bei Vertragsunterzeichnung
- 50% am Veranstaltungstag (bar oder TWINT)

### Gültigkeit
Dieses Angebot ist gültig bis [Datum + 14 Tage].

---
DJ Jesse Jay | djjessejay.ch
```

Soll ich dieses Angebot als Email-Entwurf aufbereiten? (`/email-templates booking-anfrage`)
