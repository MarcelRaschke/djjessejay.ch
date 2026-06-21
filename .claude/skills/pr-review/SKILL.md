---
name: pr-review
description: Pull-Request-Review für djjessejay.ch mit Live-Kontext (Dynamic Context Injection). Nutzen wenn der User "PR reviewen", "Pull Request prüfen", "was ändert dieser PR", "review PR" oder eine PR-Nummer nennt.
context: fork
agent: Explore
allowed-tools: Bash(git *), Bash(gh *)
---

# PR Review: djjessejay.ch

## Live-Kontext (automatisch geladen)

- **Aktueller Branch:** !`git -C /home/user/djjessejay.ch branch --show-current`
- **Letzte Commits:** !`git -C /home/user/djjessejay.ch log --oneline -10`
- **Geänderte Dateien (staged + unstaged):** !`git -C /home/user/djjessejay.ch status --short`
- **Diff:** !`git -C /home/user/djjessejay.ch diff HEAD --stat`

## Aufgabe

$ARGUMENTS

Falls eine PR-Nummer angegeben wurde, lade den PR mit:
```bash
gh pr view $ARGUMENTS --repo MarcelRaschke/djjessejay.ch
gh pr diff $ARGUMENTS --repo MarcelRaschke/djjessejay.ch
```

## Review-Checkliste

Analysiere die Änderungen nach diesen Kriterien:

### Sicherheit
- [ ] Kein `innerHTML` mit unbereinigten User-Inputs
- [ ] Keine API-Keys oder Secrets im Diff
- [ ] CSP-kompatibel (keine neue `eval()` oder inline Event-Handler)
- [ ] SQL-Dateien: Keine injektionsgefährdeten Werte

### Code-Qualität
- [ ] Konsistenter Stil mit bestehendem Code
- [ ] Keine unnötigen Duplikate
- [ ] Tailwind-Klassen korrekt verwendet (kein Custom-CSS was durch Tailwind abgedeckt wäre)
- [ ] Deutsche Kommentare und Texte (Konsistenz mit dem Projekt)

### Funktionalität
- [ ] HTML valide strukturiert (korrekte Tags, ARIA-Attribute)
- [ ] JavaScript-Änderungen: Keine console.log vergessen
- [ ] Übersetzungen vollständig (DE + EN in `translations`-Objekt)
- [ ] SQL-Änderungen: Schema-Konsistenz prüfen

### Performance
- [ ] Keine neuen großen Assets ohne Komprimierung
- [ ] Keine neuen externen Script/Style-Abhängigkeiten ohne Grund

---

## Ausgabe-Format

```
## PR Review: [Titel/Branch]

**Gesamtbewertung:** ✅ Bereit zum Mergen / ⚠️ Kleinere Anmerkungen / ❌ Probleme gefunden

### Kritische Probleme
- [ ] [Problem] in `datei:zeile`

### Anmerkungen
- [Anmerkung]

### Gut gemacht
- [Was positiv auffällt]

### Empfehlung
[Merge / Nach Anpassungen mergen / Nicht mergen + Begründung]
```
