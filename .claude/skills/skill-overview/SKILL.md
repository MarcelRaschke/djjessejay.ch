---
name: skill-overview
description: Übersicht aller installierten Skills mit Qualitäts-Score — listet root- und projektspezifische Skills, bewertet sie kurz nach der autoloop-Rubrik und priorisiert Verbesserungen. Trigger: "skill-overview", "welche skills gibt es", "skills auflisten", "skill status", "skills anzeigen", "was kann ich alles aufrufen".
allowed-tools: Read, Bash(ls /root/.claude/skills/), Bash(ls /home/user/djjessejay.ch/.claude/skills/)
---

# Skill Overview: Alle Skills anzeigen und bewerten

---

## Schritt 1: Skills einlesen

```bash
ls /root/.claude/skills/
ls /home/user/djjessejay.ch/.claude/skills/ 2>/dev/null
```

Lese dann jede SKILL.md ein (nur Frontmatter + erste 30 Zeilen reichen für Schnellbewertung):

Für jeden Skill: `/root/.claude/skills/[name]/SKILL.md`

---

## Schritt 2: Schnell-Bewertung (autoloop-Rubrik, vereinfacht)

Prüfe für jeden Skill diese 5 K.O.-Kriterien (je 20 Punkte):

| # | Kriterium | Schnell-Check |
|---|-----------|---------------|
| 1 | `allowed-tools` | Frontmatter-Zeile vorhanden? |
| 2 | Deutsche Trigger | mind. 2 deutsche Wörter in `description`? |
| 3 | Konkreter Inhalt | Mehr als 10 Zeilen Body? Kein reiner Stub? |
| 4 | Bash-Befehle oder Schritte | Mind. 1 ausführbarer Befehl oder nummerierte Schritte? |
| 5 | Follow-up Angebot | "Soll ich..." oder ähnliches am Ende? |

Score: Summe der erfüllten Kriterien × 20 = 0–100

---

## Schritt 3: Ausgabe

```
## Skill-Übersicht: djjessejay.ch

### Root Skills (/root/.claude/skills/) — N Skills

| Skill | Score | Status | Trigger-Beispiel |
|-------|-------|--------|-----------------|
| auto-deploy | 100/100 | ✅ Fertig | /auto-deploy |
| autoloop | 100/100 | ✅ Fertig | /autoloop [skill-name] |
| code-review | 100/100 | ✅ Fertig | /code-review |
| debug | 100/100 | ✅ Fertig | /debug [fehler] |
| deep-research | 60/100 | ⚠️ Verbesserbar | /deep-research |
| event-manager | 100/100 | ✅ Fertig | /event-manager |
| ... | ... | ... | ... |

### Projekt-Overrides (/home/user/djjessejay.ch/.claude/skills/) — N Skills
[Liste der Projekt-Skills]

---
**Total:** N Skills  ✅ X fertig  ⚠️ Y verbesserbar  ❌ Z unvollständig

### Verbesserungsprioritäten (absteigend)
1. [skill mit niedrigstem Score] — fehlt: [was fehlt]
2. ...

### Nächste Schritte
- `/autoloop [skill-name]` — einen Skill verbessern
- `/skillcreator [name]` — neuen Skill erstellen
- Alle fertigen Skills: `/[skill-name]` direkt aufrufen
```

---

## Schritt 4: Interaktive Weiterführung

Am Ende fragen:

```
Soll ich:
a) Einen Skill direkt verbessern? (/autoloop [name])
b) Einen neuen Skill erstellen? (/skillcreator [name])
c) Einen bestimmten Skill aufrufen?
```
