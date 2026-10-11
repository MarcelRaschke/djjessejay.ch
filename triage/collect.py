"""Triage-Loop Schritt 1: Collect (nur lesend).

Sammelt Workflow-Runs, Pull Requests und Issues aller konfigurierten Repos im
Zeitfenster und schreibt collect.json. Kein Schreibzugriff, keine Mutationen.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from common import GitHubClient, TriageError, load_config, since_iso

FAILURE_CONCLUSIONS = ("failure", "timed_out", "startup_failure", "cancelled")


def collect_repo(client: GitHubClient, full_name: str, cfg: dict[str, Any], since: str) -> dict[str, Any]:
    """Liest einen Repo-Zustand im Fenster. Fehler werden als error-Eintrag fail-closed abgelegt."""
    caps = cfg["caps"]
    data: dict[str, Any] = {"default_branch": "main", "failed_runs": [], "prs": [], "issues": []}
    try:
        meta = client.get_one(f"/repos/{full_name}")
        if not meta:
            raise TriageError("Repo nicht gefunden oder fuer Token nicht sichtbar")
        data["default_branch"] = meta.get("default_branch") or "main"

        runs = client.get_all(
            f"/repos/{full_name}/actions/runs",
            {"created": f">={since}", "per_page": 100},
            max_pages=3,
        )
        skipped = 0
        for run in runs:
            status = run.get("status")
            conclusion = run.get("conclusion")
            if status != "completed":
                skipped += 1
                continue
            if conclusion in FAILURE_CONCLUSIONS or (
                conclusion is None and cfg["grading"].get("treat_missing_conclusion_as_failure")
            ):
                data["failed_runs"].append(
                    {
                        "id": run.get("id"),
                        "name": run.get("name"),
                        "head_branch": run.get("head_branch"),
                        "conclusion": conclusion,
                        "status": status,
                        "event": run.get("event"),
                        "html_url": run.get("html_url"),
                        "created_at": run.get("created_at"),
                        "updated_at": run.get("updated_at"),
                    }
                )
        data["skipped_in_progress"] = skipped
        cap = int(caps.get("max_failed_runs_per_repo", 20))
        if len(data["failed_runs"]) > cap:
            data["failed_runs_overflow"] = len(data["failed_runs"]) - cap
            data["failed_runs"] = data["failed_runs"][:cap]

        for pr in client.get_all(f"/repos/{full_name}/pulls", {"state": "open", "per_page": 100}):
            labels_entry = client.get_one(f"/repos/{full_name}/issues/{pr.get('number')}")
            label_names = []
            if labels_entry:
                for label in labels_entry.get("labels", []):
                    name = label.get("name") if isinstance(label, dict) else label
                    if name:
                        label_names.append(name)
            data["prs"].append(
                {
                    "number": pr.get("number"),
                    "title": pr.get("title"),
                    "html_url": pr.get("html_url"),
                    "updated_at": pr.get("updated_at"),
                    "draft": bool(pr.get("draft")),
                    "requested_reviewers": [
                        u.get("login") for u in pr.get("requested_reviewers", []) if isinstance(u, dict)
                    ],
                    "labels": label_names,
                }
            )

        for issue in client.get_all(f"/repos/{full_name}/issues", {"state": "open", "per_page": 100}):
            if "pull_request" in issue:
                continue
            label_names = []
            for label in issue.get("labels", []):
                name = label.get("name") if isinstance(label, dict) else label
                if name:
                    label_names.append(name)
            data["issues"].append(
                {
                    "number": issue.get("number"),
                    "title": issue.get("title"),
                    "html_url": issue.get("html_url"),
                    "created_at": issue.get("created_at"),
                    "updated_at": issue.get("updated_at"),
                    "labels": label_names,
                }
            )
    except TriageError as exc:
        data["error"] = str(exc)
    return data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Triage-Loop: Collect (nur lesend)")
    parser.add_argument("--config", default=None, help="Pfad zu triage/config.yaml")
    parser.add_argument("--out", default="collect.json", help="Ausgabedatei")
    args = parser.parse_args(argv)

    cfg = load_config(args.config)
    client = GitHubClient()
    since = since_iso(int(cfg["window_days"]))
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    repos: dict[str, Any] = {}
    for full_name in cfg["repos"]:
        repos[full_name] = collect_repo(client, full_name, cfg, since)

    payload = {"generated_at": now, "window_since": since, "repos": repos}
    Path(args.out).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    for name, data in repos.items():
        state = data.get("error") or (
            f"{len(data['failed_runs'])} Run-Failures, {len(data['prs'])} PRs, {len(data['issues'])} Issues"
        )
        print(f"[collect] {name}: {state}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
