---
name: deep-research
description: Tiefe Codebase-Recherche in isoliertem Subagenten-Kontext für djjessejay.ch. Nutzen wenn der User etwas untersuchen, analysieren oder verstehen möchte ohne den Haupt-Kontext zu belasten. Trigger: "recherchiere", "analysiere den Code", "wie funktioniert", "finde alle Stellen", "untersuche".
context: fork
agent: Explore
effort: high
---

# Deep Research für djjessejay.ch

**Aufgabe:** $ARGUMENTS

## Recherche-Strategie

Führe eine gründliche Analyse durch. Arbeite systematisch:

### Phase 1: Überblick verschaffen

Verschaffe dir einen Überblick über die relevanten Dateien:

```
/home/user/djjessejay.ch/
├── index.html          # Hauptseite (776+ Zeilen) — HTML + inline JS + Translations
├── jessejay.css        # Custom CSS — Ergänzt Tailwind
├── scripts.js          # Externe JS-Hilfsfunktionen
├── biography.sql       # DJ-Biografie DB
├── events.sql          # Gig-Daten DB
├── guestbook.sql       # Gästebuch DB
├── links.sql           # Links DB
├── soundTable.sql      # Mixes DB
├── imageTable.sql      # Galerie DB
└── .github/workflows/  # GitHub Actions
```

### Phase 2: Gezielt suchen

Nutze Grep und Glob um relevante Stellen zu finden. Lies nur was nötig ist.

### Phase 3: Analyse

Beantworte die Frage vollständig mit:
- **Direkten Zitaten** (Dateiname:Zeile)
- **Zusammenhängen** zwischen verschiedenen Teilen
- **Auffälligkeiten** die relevant sein könnten

### Phase 4: Report

Strukturiere den Bericht klar:

```
## Ergebnis: [Kurzantwort]

### Gefundene Stellen
- `datei.html:42` — [Erklärung]

### Analyse
[Detaillierte Erklärung]

### Empfehlungen (falls relevant)
- [Empfehlung 1]
```

Sei präzise. Lieber weniger aber akkurat als viel und vage.
