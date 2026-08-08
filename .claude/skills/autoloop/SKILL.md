---
name: autoloop
description: Iterativer Skill-Entwicklungs-Loop — liest eine SKILL.md, bewertet sie nach 10 Qualitätskriterien und verbessert sie automatisch bis alle Kriterien erfüllt sind. Trigger: "autoloop [skill-name]", "verbessere den skill bis er fertig ist", "skill fertig machen", "skill iterieren", "polish skill", "skill vervollständigen".
argument-hint: <skill-name>
allowed-tools: Read, Edit, Write, Bash(ls /root/.claude/skills/), Bash(ls /home/user/djjessejay.ch/.claude/skills/)
effort: high
---

# Autoloop: Skill-Qualitäts-Iterator

**Ziel-Skill:** $ARGUMENTS

---

## Schritt 1: Skill einlesen

Lese den aktuellen Zustand der Ziel-SKILL.md:

Primärer Pfad: `/root/.claude/skills/$ARGUMENTS/SKILL.md`

Falls nicht gefunden: Prüfe `/home/user/djjessejay.ch/.claude/skills/$ARGUMENTS/SKILL.md`

Falls immer noch nicht gefunden:
```bash
ls /root/.claude/skills/
ls /home/user/djjessejay.ch/.claude/skills/ 2>/dev/null || echo "(kein Projektverzeichnis)"
```
→ Liste ausgeben und nachfragen welcher Skill gemeint ist.

---

## Schritt 2: Qualitätsbewertung

Bewerte den gelesenen Skill nach dieser **10-Punkte-Rubrik** (je 10 Punkte = max. 100):

| # | Kriterium | Prüfung | Status |
|---|-----------|---------|--------|
| 1 | `allowed-tools` im Frontmatter | Zeile `allowed-tools:` vorhanden | ✅/⚠️/❌ |
| 2 | `argument-hint` wenn Argumente nötig | Falls Skill `$ARGUMENTS` nutzt: `argument-hint:` vorhanden | ✅/⚠️/❌ |
| 3 | `effort` bei schwerer Aufgabe | Audit/Review/Research-Skills: `effort: high` | ✅/⚠️/❌ |
| 4 | Deutsche Trigger-Keywords | `description:` enthält mind. 3 deutsche Trigger-Wörter | ✅/⚠️/❌ |
| 5 | Konkrete Bash-Befehle | Mind. 2 Shell/Grep-Kommandos mit **absolutem Pfad** | ✅/⚠️/❌ |
| 6 | Output-Template | Codeblock mit Ausgabeformat (Tabelle, Checkliste, Bericht) | ✅/⚠️/❌ |
| 7 | Priorisierung | Mind. 2 Stufen: kritisch / wichtig / nice-to-have | ✅/⚠️/❌ |
| 8 | Follow-up Angebot | Endet mit "Soll ich..." oder konkretem nächsten Schritt | ✅/⚠️/❌ |
| 9 | Absolute Dateipfade | Alle Pfade mit `/home/user/djjessejay.ch/...` oder `/root/.claude/...` | ✅/⚠️/❌ |
| 10 | Kein Pseudocode | Keine Platzhalter wie `[Pfad]` oder `<variable>` ohne echte Werte | ✅/⚠️/❌ |

Ausgabe nach Bewertung:
```
## Bewertung: [skill-name]
Aktueller Score: X/100

✅ Erfüllt (X Punkte): [Liste]
⚠️ Teilweise (X Punkte): [Liste mit Begründung]
❌ Fehlt (X Punkte): [Liste mit Begründung]
```

---

## Schritt 3: Verbesserungsschleife

**Wiederhole bis Score = 100:**

1. Wähle das wichtigste fehlende Kriterium (❌ zuerst, dann ⚠️)
2. Verbessere die SKILL.md konkret:
   - Frontmatter-Felder: direkt ergänzen/korrigieren
   - Bash-Befehle: echte Pfade einfügen, ausführbare Kommandos schreiben
   - Output-Template: konkretes Beispiel aus dem djjessejay.ch-Kontext erstellen
   - Trigger-Keywords: deutsche Varianten der häufigsten Nutzerfragen ergänzen
   - Follow-up: passenden Abschluss für den Skill-Typ formulieren
3. Schreibe die Verbesserung mit dem Edit-Tool
4. Lies die aktualisierte Datei
5. Re-evaluiere nach der Rubrik
6. Gib Zwischenstatus aus: `Iteration N: Score X/100 (+Y Punkte)`

Stoppe bei Score = 100 oder nach max. 10 Iterationen.

---

## Schritt 4: Abschlussbericht

```
## Autoloop Abgeschlossen: [skill-name]
**Finaler Score:** 100/100 ✅  (oder: X/100 nach 10 Iterationen)

### Vorher → Nachher
| Kriterium | Vorher | Nachher |
|-----------|--------|---------|
| allowed-tools | ❌ | ✅ |
| ... | ... | ... |

### Durchgeführte Änderungen
1. [Änderung 1 mit Zeilen-Referenz]
2. [Änderung 2]

### Nächste Schritte
- Soll ich die Projektkopie unter `/home/user/djjessejay.ch/.claude/skills/[skill-name]/SKILL.md` aktualisieren?
- Soll ich die Änderungen committen (`git commit + push`)?
- Soll ich einen weiteren Skill verbessern? Verfügbare ★★★☆☆ Skills: [Liste]
```
