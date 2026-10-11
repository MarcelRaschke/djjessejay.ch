"""Einmalige, idempotente Label-Anlage nach cy8er-Schema (Voraussetzung fuer G2).

Der Triage-Lauf selbst bleibt lesend. Dieses Skript ist der einzige Schreibvorgang
im gesamten Paket und laeuft nur manuell: Workflow triage-bootstrap oder lokal mit
PAT (gh auth token). Existierende Labels bleiben unberuehrt (HTTP 422 -> vorhanden).

Ausfuehrung:
    python bootstrap_labels.py            # alle Repos aus config.yaml
    python bootstrap_labels.py --repos MarcelRaschke/djjessejay.ch
"""
from __future__ import annotations

import argparse

from common import GitHubClient, load_config

LABELS: list[dict[str, str]] = [
    # Priority
    {"name": "priority:critical", "color": "ff1f4b", "description": "Kritisch — sofort bearbeiten"},
    {"name": "priority:high", "color": "ff8c1a", "description": "Hohe Prioritaet"},
    {"name": "priority:medium", "color": "ffd60a", "description": "Mittlere Prioritaet"},
    {"name": "priority:low", "color": "26c6da", "description": "Niedrige Prioritaet"},
    # Status
    {"name": "status:ready", "color": "00e676", "description": "Arbeitsbereit"},
    {"name": "status:in-progress", "color": "2979ff", "description": "In Bearbeitung"},
    {"name": "status:in-review", "color": "b388ff", "description": "Im Review"},
    {"name": "status:blocked", "color": "ff5252", "description": "Blockiert"},
    # Domänen
    {"name": "cymatics", "color": "00e5ff", "description": "Cymatics"},
    {"name": "dmx", "color": "ff00e5", "description": "DMX"},
    {"name": "ui", "color": "00ffa3", "description": "UI"},
    {"name": "api", "color": "7c4dff", "description": "API"},
    {"name": "audio", "color": "ff9100", "description": "Audio"},
    {"name": "webgl", "color": "ff4081", "description": "WebGL"},
    {"name": "dependencies", "color": "8bc34a", "description": "Abhaengigkeiten"},
]


def ensure_labels(client: GitHubClient, full_name: str) -> dict[str, int]:
    created, existing, failed = 0, 0, 0
    for label in LABELS:
        status, body = client.post(
            f"/repos/{full_name}/labels",
            {"name": label["name"], "color": label["color"], "description": label["description"]},
        )
        if status == 201:
            created += 1
        elif status == 422:
            existing += 1
        else:
            failed += 1
            print(f"[bootstrap] {full_name}: {label['name']} fehlgeschlagen ({status}): {body}")
    return {"created": created, "existing": existing, "failed": failed}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Cy8er-Labels idempotent anlegen (G2-Voraussetzung)")
    parser.add_argument("--config", default=None)
    parser.add_argument("--repos", nargs="*", default=None, help="Optional: Repos ueberschreiben")
    args = parser.parse_args(argv)

    cfg = load_config(args.config)
    repos: list[str] = args.repos or list(cfg["repos"])
    client = GitHubClient()

    exit_code = 0
    for full_name in repos:
        result = ensure_labels(client, full_name)
        print(
            f"[bootstrap] {full_name}: {result['created']} angelegt, "
            f"{result['existing']} bereits vorhanden, {result['failed']} fehlgeschlagen"
        )
        if result["failed"]:
            exit_code = 3
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
