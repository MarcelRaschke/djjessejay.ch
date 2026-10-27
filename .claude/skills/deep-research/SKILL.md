---
name: deep-research
description: Tiefe, schreibgeschützte Codebase-Recherche für djjessejay.ch in isoliertem Kontext. Nutzen bei: recherchiere, analysiere den Code, wie funktioniert, finde alle Stellen, untersuche, prüfe wo, belege.
argument-hint: <Fragestellung>
context: fork
agent: Explore
effort: high
allowed-tools: Read, Grep, Glob, Bash(ls:*), Bash(git log:*), Bash(git grep:*)
---

# Deep Research für djjessejay.ch

**Fragestellung:** $ARGUMENTS

Die Recherche ist rein lesend. Es werden keine Dateien geändert.

## Phase 0: Autorität prüfen

Betrifft die Frage Künstleridentität, Biografie, Metadaten, Presse oder KI-Ausgaben, dann zuerst in dieser Reihenfolge lesen (laut CLAUDE.md):

1. DJ_JESSE_JAY_CANONICAL_PROFILE.md
2. artist-profile.json
3. website/provenance.json
4. ARCHIVE_CITATION_APPENDIX.md
5. AI_SYSTEM_PROMPT.md

Generierte Inhalte sind nie ein Beleg.

## Phase 1: Überblick

Das Repo hat diese Struktur:

- Hauptseite: index.html, scripts.js, jessejay.css, index-legacy.html
- Backend und Routen: server.js, routes/, src/, db/
- Cloudflare-Worker: workers/, infra/cloudflare/
- Dokumentation: docs/, DNS_CONFIG.md, ORIGIN-PROTECTION-DEPLOYMENT.md, CLAUDE.md
- Tests: test/, tests/
- CI: .github/workflows/

Vor jeder Suche mit `ls` prüfen, ob ein Pfad existiert. Nicht annehmen, dass eine Datei vorhanden ist.

## Phase 2: Gezielt suchen

Grep und Glob verwenden. Nur die Dateien lesen, die für die Antwort nötig sind. Große Dateien über offset und limit lesen.

## Phase 3: Analyse

Die Antwort vollständig beantworten, mit:

- direkten Zitaten als `datei:zeile`
- Zusammenhängen zwischen Dateien
- Auffälligkeiten, die relevant sein könnten

Aussagen über den Live-Zustand, etwa Antwortcodes, DNS oder gesetzte Secrets, lassen sich aus dem Code nicht ableiten. Der Bericht muss das ausdrücklich als offen kennzeichnen.

## Phase 4: Bericht

```
## Ergebnis: [Kurzantwort]

### Gefundene Stellen
- `datei:zeile`: [Erklärung]

### Analyse
[Erklärung mit Zusammenhängen]

### Offen
- [was nicht belegt werden konnte, und warum]

### Empfehlungen (falls relevant)
- [Empfehlung]
```

Präzise schreiben. Lieber weniger, aber belegt. Am Ende anbieten: "Soll ich einen Befund in einen Fix oder einen PR überführen?"
