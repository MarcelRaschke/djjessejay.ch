---
name: skillcreator
description: Erstellt eine neue SKILL.md von Grund auf — interaktiv oder mit Beschreibung. Fragt nach Skill-Name, Zweck, benötigten Tools und Auslösern. Generiert vollständige SKILL.md nach Qualitäts-Rubrik (100/100 ready). Trigger: "neuen skill erstellen", "skill anlegen", "skillcreator", "erstelle skill für", "neuen slash command".
argument-hint: <skill-name> [kurze Beschreibung]
allowed-tools: Read, Write, Bash(ls /root/.claude/skills/), Bash(mkdir -p /root/.claude/skills/), Bash(mkdir -p /home/user/djjessejay.ch/.claude/skills/)
---

# Skill Creator: Neuen Skill erstellen

**Ziel:** $ARGUMENTS

---

## Schritt 1: Informationen sammeln

Falls `$ARGUMENTS` leer oder nur ein Name ohne Beschreibung:

Stelle diese Fragen kompakt (alle auf einmal):

```
1. Skill-Name (Kleinbuchstaben, Bindestriche): ?
2. Was soll der Skill tun? (1-2 Sätze): ?
3. Welche Tools braucht er? (Read/Edit/Write/Bash/Grep/Glob): ?
4. Hat er Argumente? Falls ja, was erwartet er? (z.B. <issue-nr>): ?
5. Ist es eine schwere Aufgabe? (Audit/Review/Research → effort: high): ?
6. Für welches Verzeichnis? (root /root/.claude/ | projekt /home/user/djjessejay.ch/.claude/ | beide): ?
```

Falls `$ARGUMENTS` Name + Beschreibung enthält: Interpretiere und fahre direkt fort.

---

## Schritt 2: Skill klassifizieren

Bestimme den Skill-Typ anhand der Beschreibung:

| Typ | Merkmale | Template |
|-----|----------|----------|
| **Audit/Review** | Prüft/analysiert Code, Inhalt, Qualität | Checklisten-Template |
| **Manager/CRUD** | Erstellt/liest/löscht Daten (SQL, Dateien) | Workflow-Template |
| **Workflow** | Führt mehrstufige Aktion aus (Deploy, Git) | Schritt-für-Schritt-Template |
| **Research** | Recherche, Analyse, Verständnis | `context: fork` + Explore-Agent |
| **Meta** | Operiert auf anderen Skills/Configs | Inline + Read/Write |

---

## Schritt 3: SKILL.md generieren

Erstelle `/root/.claude/skills/[name]/SKILL.md` mit:

### Frontmatter (immer vollständig)
```yaml
---
name: [name]
description: [Hauptbeschreibung]. Trigger: "[name]", "[deutsches Verb] [objekt]", "[weitere Varianten]".
argument-hint: [falls Argumente nötig]
allowed-tools: [konkrete Tool-Liste]
effort: high   # nur wenn Audit/Review/Research
---
```

### Body-Struktur nach Typ

**Audit/Review:**
```markdown
# [Name]: [Was wird geprüft]

## Schritt 1: [Bereich] analysieren
[Konkrete grep/bash Befehle mit absolutem Pfad]

## Schritt 2: Bewertung
| Kriterium | Status | Priorität |
|-----------|--------|-----------|
| ... | ✅/⚠️/❌ | Kritisch/Wichtig/Optional |

## Ausgabe-Format
[Codeblock mit Report-Template]

Soll ich [konkrete nächste Aktion]?
```

**Manager/CRUD:**
```markdown
# [Name]: [Objekt] verwalten

Mögliche Aktionen: list | add | edit | delete | search

## list — Alle [Objekte] anzeigen
[SQL-Query oder Bash-Befehl mit absolutem Pfad]

## add — Neues [Objekt] hinzufügen
[Interaktive Schritte mit Validation]

## Soll ich [follow-up]?
```

**Workflow:**
```markdown
# [Name]: [Workflow-Titel]

## Schritt 1: [Vorbereitung]
[Konkreter Befehl]

## Schritt 2: [Hauptaktion]
[Konkreter Befehl]

## Schritt 3: Validierung
[Prüfbefehle]

## Fehlerbehandlung
| Problem | Lösung |
|---------|--------|

Fertig! [Was wurde erreicht]. Soll ich [nächster Schritt]?
```

---

## Schritt 4: Qualitäts-Check (autoloop-Rubrik)

Prüfe die erstellte SKILL.md sofort gegen alle 10 Kriterien:

```
✅ allowed-tools vorhanden
✅ argument-hint (falls nötig)
✅ effort (falls schwere Aufgabe)
✅ Deutsche Trigger-Keywords (mind. 3)
✅ Konkrete Bash-Befehle (mind. 2, absolut)
✅ Output-Template vorhanden
✅ Priorisierung (kritisch/wichtig/optional)
✅ Follow-up Angebot am Ende
✅ Absolute Dateipfade
✅ Kein Pseudocode
Score: 100/100
```

Falls Punkte fehlen: direkt nachbessern ohne Rückfrage.

---

## Schritt 5: Abschluss

```
## Neuer Skill erstellt: /[name]

📁 Gespeichert: /root/.claude/skills/[name]/SKILL.md
📁 Projektkopie: /home/user/djjessejay.ch/.claude/skills/[name]/SKILL.md (falls gewünscht)
⭐ Qualitäts-Score: 100/100

Verwendung: /[name] [argument]

Soll ich den Skill committen und pushen?
```
