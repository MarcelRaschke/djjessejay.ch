# iVDJ Triage-Loop

Produktionsreifer Loop fuer die GitHub-Triage (jessejay-ch + MarcelRaschke). Der Loop ist deterministisch, nur lesend und konfigurationsgetrieben: Trigger, Grader, Stop-Regeln, Caps und Routing stehen in `config.yaml`, nicht im Prompt.

Die vollstaendige Loopspezifikation (Zustandsmaschine, Phasen, Abnahmekriterien) liegt im Spec-Dokument zum Canvas github-triage-loop.

## Architektur

```text
Trigger (workflow_dispatch, spaeter Cron + workflow_run)
  -> collect.py   liest Workflow-Runs, PRs, Issues im Zeitfenster (nur lesend)
  -> grade.py     G1-G5: CI-Status, Label-Abdeckung, Stale, Schema, Budget
  -> report.py    Step Summary + stdout + Slack-Routing (critical -> @here)
  -> trace.json   Artefakt, 90 Tage Retention, Datenbasis fuer den Lern-Loop
```

## Module

| Datei | Aufgabe |
|---|---|
| `config.yaml` | Repos, Labels, Grader-Regeln, Caps, Slack-Routing |
| `common.py` | Konfigurationsloader, Zeitfenster, nur lesender GitHub-Client (stdlib) |
| `collect.py` | Schritt 1: Sammeln im Fenster, fail-closed bei Repo-Fehlern |
| `grade.py` | Schritt 2: Grader G1-G5, Exit 0/2/3 |
| `report.py` | Schritt 3: Markdown-Report, Step Summary, Slack |
| `tests/test_grade.py` | Unit-Tests: Stale-Grenze 29/30/31, Label-Pflicht, Schema, Caps, Draft-Skip |

## Grader (vor Autonomie geschaltet)

- G1 CI-Status: maschinelle `conclusion`; fehlende Conclusion bei abgeschlossenem Run gilt als Failure (fail-closed).
- G2 Label-Abdeckung: Issues und PRs brauchen ein Priority- und ein Status-Label aus dem cy8er-Schema; unlabelled Items werden verworfen und als Nacharbeit gemeldet, nie geraten.
- G3 Stale: maschinell am `updated_at`-Feld gegen `stale_days` (30).
- G4 Schema: jedes Item braucht repo, kind, number, html_url, reason, action, priority.
- G5 Budget: `max_items` (50), `timeout_minutes` (10); Ueberhang nur als Zaehler.

## Betrieb

```bash
# Lokal (Termux oder Workstation), nur lesend:
export GITHUB_TOKEN=ghp_...
cd triage
pip install pyyaml pytest
python -m pytest tests -q
python collect.py --out collect.json
python grade.py --collect collect.json --report report.json --trace trace.json
python report.py --report report.json --trace trace.json

# CI: Workflow triage-loop manuell ausloesen (Actions-Tab -> triage-loop -> Run workflow)
```

Exit-Codes des Graders: 0 = Report erzeugt, 2 = Budget-Cap, 3 = Strukturfehler.

## Secrets (Repo-Settings)

- `IVDJ_TRIAGE_TOKEN`: PAT mit `repo` (lesend), `actions:read`, `issues:read`, `pull-requests:read` fuer beide Ziel-Repos inklusive jessejay-ch. Ohne dieses Secret liest der Loop nur das eigene Repo.
- `SLACK_WEBHOOK_GITHUB`: Webhook nach #github.
- `SLACK_WEBHOOK_CRITICAL`: Webhook nach #critical (Critical-Items mit @here).

## Runbook

- Repo-Error-Item im Report: Token-Berechtigung oder App-Installation pruefen (G1 fail-closed), nicht ignorieren.
- Alles verworfen, Discards wegen `Priority-Label fehlt`: cy8er-Labels im Ziel-Repo anlegen (einmalig, manuell), dann erneut laufen lassen.
- Slack leer trotz Aktivitaet: Webhook-Secrets pruefen; Report bleibt in Step Summary und Trace-Artefakt nachlesbar.
- Budget-Exit 2: Fenster oder Repos pruefen, Ursache aus trace.json lesen; Caps nur nach Ursachenanalyse anpassen.

## Phasen

- Phase 1 (aktiv): Grader zuerst, einmaliger manueller Lauf, Lueckeliste abarbeiten.
- Phase 2: Zwei Wochen supervisiert, ein Lauf pro Woche manuell; Abnahme nach zwei aufeinanderfolgenden Laeufen ohne G4-Verwuerfe und ohne fehlende CI-Failures im Fenster.
- Phase 3: Cron-Kommentar in `triage-loop.yml` aktivieren, T2-Trigger (workflow_run) ergaenzen. djjessejay.ch (jessejay-ch) erst nach Bereinigung der konkurrierenden Pages-Deployer in den Event-Trigger aufnehmen.
- Phase 4: Monatlicher Lern-Loop ueber die Trace-Artefakte; Regelanderungen nur als PR mit Review.

## Entscheidungen

- Kein LLM im Loop in Phase 1-2: Grader sind reine Funktionen, dadurch deterministisch und testbar. Ein Modell faellt erst in Phase 3 als zusammenfassende Instanz hinter die Verifier.
- stdlib statt SDK: keine Drittanbieter-Abhaengigkeit ausser PyYAML fuer die Konfiguration; minimale Angriffsflaeche.
- Heimat ist MarcelRaschke/djjessejay.ch, weil MarcelRaschke/iVDJ als Repo noch nicht existiert und die GitHub-App kein Repository anlegen darf. Sobald iVDJ existiert, zieht das Verzeichnis als Ganzes um (reines Verschieben, keine Code-Aenderung).
