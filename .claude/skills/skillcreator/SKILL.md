---
name: skillcreator
description: Erstellt eine neue SKILL.md von Grund auf — interaktiv oder aus einer Kurzbeschreibung. Klärt Name, Zweck, Tools, Argumente und Auslöser, wählt das passende Template, schreibt den Skill ins Projekt oder nach ~/.claude und validiert ihn mechanisch mit scripts/validate-skills.mjs statt sich selbst zu benoten. Trigger: "neuen skill erstellen", "skill anlegen", "skillcreator", "erstelle skill für", "neuen slash command", "skill generieren", "skill generator".
argument-hint: "<skill-name> [kurze Beschreibung]"
allowed-tools: Read, Write, Glob, Grep, Bash(git rev-parse *), Bash(ls *), Bash(node scripts/validate-skills.mjs *), Bash(git status *), Bash(git diff *), Bash(git switch -c skill/*), Bash(git add .claude/skills/*)
---

# Skill Creator: Neuen Skill erstellen

Ziel: $ARGUMENTS

Kontext beim Start:

- Repo-Root: !`git rev-parse --show-toplevel`
- Vorhandene Projekt-Skills: !`ls .claude/skills`
- Validator: !`ls scripts/validate-skills.mjs`

Alle Pfade unten sind relativ zum Repo-Root. Nie ein maschinenspezifisches Home-Verzeichnis in einen Skill schreiben; den Root bei Bedarf per Injektion mit `git rev-parse --show-toplevel` holen.

---

## Schritt 1: Anforderungen klären

Wenn `$ARGUMENTS` Name und Beschreibung enthält, interpretieren und direkt weitermachen. Sonst alle offenen Punkte in einer Runde fragen (mit AskUserQuestion, falls verfügbar):

```text
1. Skill-Name (kebab-case, a-z 0-9 -, max. 64 Zeichen)
2. Was soll der Skill tun? (1–2 Sätze, inkl. Ergebnis)
3. Wann soll er auslösen? (3+ deutsche Formulierungen, wie Nutzer fragen)
4. Argumente? (z. B. <issue-nr>, <pfad>, keine)
5. Nebenwirkungen? (schreibt Dateien, sendet, deployt, löscht)
6. Ziel: Projekt (.claude/skills/) | Nutzer (~/.claude/skills/) | beide
```

Harte Prüfungen vor dem Schreiben:

```bash
ls .claude/skills | grep -x "<name>" && echo "Name bereits vergeben"
grep -ril "<hauptbegriff>" .claude/skills/*/SKILL.md
```

Ist der Name vergeben oder deckt ein vorhandener Skill den Zweck schon ab: nicht duplizieren, sondern den vorhandenen Skill nennen und fragen, ob er erweitert werden soll (dann autoloop).

---

## Schritt 2: Typ bestimmen und Frontmatter festlegen

| Typ | Merkmale | Frontmatter-Zusätze | Template |
|-----|----------|---------------------|----------|
| Audit/Review | prüft Code, Inhalt, Qualität | `effort: high` | Checkliste |
| Research | liest viel, schreibt nichts | `context: fork`, `agent: Explore` | Bericht |
| Manager/CRUD | liest/schreibt Daten oder Dateien | — | Aktionen |
| Workflow | mehrstufig mit Nebenwirkung (Deploy, Mail, Git) | `disable-model-invocation: true` | Schritte |
| Meta | arbeitet auf Skills/Configs | — | Inline |

Regeln für das Frontmatter:

- Schlüssel immer mit Bindestrich (`allowed-tools`, `argument-hint`). Unterstrich-Varianten ignoriert Claude Code still. Ausnahme: `when_to_use`.
- `description`: max. 1024 Zeichen, keine `<` oder `>`, endet mit `Trigger: "…", "…", "…"` (mind. 3).
- `effort` nur mit `low | medium | high | xhigh | max`.
- `context: fork` plus Write/Edit braucht `background: false`, sonst landen Änderungen ausserhalb der /rewind-Checkpoints.
- `allowed-tools` so eng wie möglich. Muster mit Wildcard schreiben (`Bash(git log *)`); ein exaktes Muster wie `Bash(mkdir -p /pfad/)` erlaubt nur genau diesen Befehl. Kein `rm`, `sudo`, `curl`, `git push` ohne Rückfrage freigeben.
- Kein `mkdir` nötig: Das Write-Tool legt Ordner selbst an.

---

## Schritt 3: SKILL.md schreiben

Ziel-Datei:

- Projekt: `.claude/skills/<name>/SKILL.md`
- Nutzer: `~/.claude/skills/<name>/SKILL.md`

Frontmatter-Gerüst:

```yaml
---
name: <name>
description: <Was der Skill liefert, 1–2 Sätze>. Trigger: "<name>", "<verb> <objekt>", "<umgangssprachliche Variante>".
argument-hint: "<arg>"          # nur wenn $ARGUMENTS oder $0 genutzt wird
allowed-tools: Read, Grep, Glob # konkret, so eng wie möglich
effort: high                    # nur Audit/Review
---
```

Body nach Typ. Jeder Body braucht mindestens zwei echte, ausführbare Befehle (Bash-Block oder eine Kontext-Injektion: Ausrufezeichen direkt vor einem Befehl in Backticks), ein Ausgabe-Template in einem Codeblock, eine Priorisierung und am Ende ein konkretes Folgeangebot.

Audit/Review:

````markdown
# <Titel>: <Was geprüft wird>

## Schritt 1: Befund erheben
```bash
grep -rn "innerHTML" js/ --include=*.js
node --check server.js
```

## Schritt 2: Bewerten
| Befund | Datei:Zeile | Priorität |
|--------|-------------|-----------|
| … | … | Kritisch / Wichtig / Optional |

## Ausgabe-Format
```text
## <Titel> – Ergebnis
Kritisch: n | Wichtig: n | Optional: n
1. [Kritisch] <Befund> — <Datei:Zeile> — <Fix>
```

Soll ich die kritischen Punkte direkt beheben?
````

Workflow:

````markdown
# <Titel>: <Ablauf>

## Schritt 1: Vorbedingungen prüfen
```bash
git status --short
npm test
```

## Schritt 2: Ausführen (nach Bestätigung)
## Schritt 3: Verifizieren
## Fehlerbehandlung
| Problem | Priorität | Lösung |
|---------|-----------|--------|

Fertig: <Ergebnis>. Soll ich <nächster Schritt>?
````

Manager/CRUD: Aktionen `list | add | edit | delete | search` je mit eigenem Abschnitt, echtem Befehl und Validierung; `delete` immer mit Rückfrage.

---

## Schritt 4: Mechanisch validieren

Nie einen Score selbst schätzen. Immer den Validator laufen lassen:

```bash
node scripts/validate-skills.mjs .claude/skills/<name>
node scripts/validate-skills.mjs .claude/skills/<name> --json
```

Für einen Nutzer-Skill den Pfad `~/.claude/skills/<name>` übergeben.

Abbruchkriterien und Priorität:

| Ergebnis | Priorität | Vorgehen |
|----------|-----------|----------|
| FEHLER (Exit-Code 1) | Kritisch | Sofort beheben, erneut validieren |
| WARNUNG | Wichtig | Beheben, ausser es gibt einen Grund (im Abschluss nennen) |
| RUBRIK fehlt … | Optional | Bis Score ≥ 90 nachbessern, max. 3 Runden |

Der Score ist eine Heuristik der autoloop-Rubrik, kein Qualitätsbeweis. Inhaltlich prüft ihn erst ein Probelauf.

---

## Schritt 5: Probelauf und Übergabe

1. Einen realistischen Aufruf durchspielen (`/<name> <beispiel-argument>`) und prüfen, ob die Befehle im Repo tatsächlich laufen.
2. Änderungen zeigen:

```bash
git status --short .claude/skills/<name>
git diff --stat
```

3. Nur auf Wunsch versionieren, auf eigenem Branch (CLAUDE.md: reviewbare Branches/PRs):

```bash
git switch -c skill/<name>
git add .claude/skills/<name>/SKILL.md
```

Commit mit DCO-Sign-off (`git commit -s`) und Push macht der Nutzer oder bestätigt sie ausdrücklich; der Bot öffnet danach einen Draft-PR.

---

## Ausgabe-Format

```text
## Neuer Skill: /<name>

Datei:      .claude/skills/<name>/SKILL.md
Typ:        <Audit | Research | Manager | Workflow | Meta>
Validator:  0 Fehler, <n> Warnungen, Score <s>/100 (heuristisch)
Offen:      <Warnungen mit Begründung oder "keine">

Aufruf:     /<name> <argument>
```

Soll ich den Skill auf einem Branch `skill/<name>` vormerken, mit autoloop weiter schärfen oder gleich einen Probelauf starten?
