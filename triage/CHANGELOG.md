# Changelog iVDJ Triage-Loop

## 0.1.0 — 2026-10-11

- Initialer Loop: collect.py, grade.py, report.py, common.py, config.yaml.
- Grader G1-G5 deterministisch, ohne LLM, nur lesend.
- Unit-Tests: Stale-Grenze, Label-Pflicht, Schema, Budget-Cap, Draft-Skip, Run-Prioritaet, Repo-Error fail-closed.
- Workflows: triage-loop (Phase 2: nur manuell), triage-ci (pytest).
- Trace-Artefakt mit 90 Tagen Retention als Datenbasis fuer den spaeteren Lern-Loop.
