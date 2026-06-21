---
name: issue-manager
description: GitHub Issues für djjessejay.ch anzeigen, analysieren und fixen — listet offene Issues, zeigt Details, implementiert Fixes und schliesst Issues. Trigger: "issue anzeigen", "issue fixen", "offene issues", "github issue", "bug beheben", "issue #[nummer]", "was sind die offenen issues".
argument-hint: [issue-nummer | list | new]
allowed-tools: Bash(gh issue list), Bash(gh issue view), Bash(gh issue create), Bash(gh issue close), Bash(gh issue comment), Read, Edit, Bash(git add), Bash(git commit), Bash(git push)
---

# Issue Manager: GitHub Issues verwalten

**Aktion:** $ARGUMENTS

---

## Schritt 1: Aktion bestimmen

| Argument | Aktion |
|----------|--------|
| *(leer)* | Alle offenen Issues auflisten |
| `list` | Alle offenen Issues auflisten |
| `#123` oder `123` | Issue #123 anzeigen + analysieren |
| `new` | Neues Issue erstellen |

---

## Schritt 2a: Issues auflisten (kein Argument)

```bash
gh issue list --repo MarcelRaschke/djjessejay.ch --state open --limit 20
```

Ausgabe-Format:
```
## Offene Issues (N total)

| # | Titel | Labels | Erstellt |
|---|-------|--------|----------|
| #42 | Bug: ... | bug | vor 2 Tagen |
| #41 | Feature: ... | enhancement | vor 1 Woche |

Soll ich eines davon analysieren und fixen? Nummer eingeben: _
```

---

## Schritt 2b: Issue analysieren (Nummer angegeben)

```bash
gh issue view [nummer] --repo MarcelRaschke/djjessejay.ch
```

Dann:
1. Issue-Beschreibung lesen
2. Relevante Dateien in `/home/user/djjessejay.ch/` suchen:
   ```bash
   grep -r "[Schlüsselwort aus Issue]" /home/user/djjessejay.ch/ --include="*.html" --include="*.js" --include="*.css" -l
   ```
3. Betroffenen Code lesen
4. Lösung vorschlagen

Ausgabe-Format:
```
## Issue #[N]: [Titel]

**Labels:** [labels]  **Erstellt:** [datum]
**Beschreibung:** [zusammenfassung]

### Analyse
Betroffene Datei(en): [pfade]
Ursache: [erklärung]

### Vorgeschlagener Fix
[Code-Diff oder Beschreibung]

Priorität: 🔴 Kritisch / 🟡 Wichtig / 🟢 Optional

Soll ich den Fix implementieren?
```

---

## Schritt 3: Fix implementieren

Nach Bestätigung:
1. Änderungen vornehmen (Edit-Tool)
2. Commit erstellen:
   ```bash
   git -C /home/user/djjessejay.ch add [geänderte-dateien]
   git -C /home/user/djjessejay.ch commit -m "fix: [issue-titel] (closes #[nummer])"
   ```
3. Push auf aktuellen Branch:
   ```bash
   git -C /home/user/djjessejay.ch push origin HEAD
   ```
4. Issue kommentieren:
   ```bash
   gh issue comment [nummer] --repo MarcelRaschke/djjessejay.ch --body "Fix implementiert in Commit [hash]. Bitte testen."
   ```

---

## Schritt 4: Issue schliessen (optional)

Nach erfolgreichem Fix und Review:
```bash
gh issue close [nummer] --repo MarcelRaschke/djjessejay.ch --comment "Behoben in [commit-hash]."
```

---

## Schritt 2c: Neues Issue erstellen (`new`)

Frage nach:
- Titel (kurz, präzise)
- Beschreibung (was passiert, was erwartet wird, Schritte zur Reproduktion)
- Label: `bug` | `enhancement` | `documentation` | `question`

```bash
gh issue create --repo MarcelRaschke/djjessejay.ch --title "[titel]" --body "[beschreibung]" --label "[label]"
```

Soll ich weitere Issues anzeigen oder den nächsten fixen?
