"""Triage-Loop Schritt 2: Grader G1-G5.

Deterministische Pruefung der gesammelten Items. Kein LLM, kein Schreibzugriff.
Exit-Codes: 0 = Report erzeugt, 2 = Budget-Cap,
3 = Strukturfehler.

G1 CI-Status      : maschinelle conclusion, fehlende
conclusion gilt als failure (fail-closed)
G2 Label-Abdeckung : Priority- und Status-Label Pflicht bei
Issues und PRs, sonst Nacharbeit statt Rateschluss
G3 Stale-Regel     : maschinell am updated_at-Feld gegen stale_days
G4 Schema          : jedes Item braucht repo, kind, number,
html_url, reason, action, priority
G5 Budget          : Item-Cap und Laufzeit-Cap, Ueberhang nur als Zaehler
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from common import TriageError, config_fingerprint, load_config, parse_iso

PRIORITY_ORDER = {
    "priority:critical": 0,
    "priority:high": 1,
    "priority:medium": 2,
    "priority:low": 3,
}
REQUIRED_FIELDS = (
    "repo",
    "kind",
    "number",
    "title",
    "html_url",
    "reason",
    "action",
    "priority",
)
DEFAULT_KEYS = (
    "workflow_run_default_branch",
    "workflow_run_feature_branch",
    "pull_request_needs_review",
    "issue_stale",
    "issue_open",
    "repo_error",
)


def _days_since(iso_value: str, now: datetime) -> int:
    if not iso_value:
        return 9999
    return max((now - parse_iso(iso_value)).days, 0)


def _priority_from_labels(
    labels: list[str],
    priority_set: set[str],
) -> str | None:
    found = [label for label in labels if label in priority_set]
    if not found:
        return None
    return min(found, key=lambda name: PRIORITY_ORDER.get(name, 9))


def _base_item(repo: str, kind: str, entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "repo": repo,
        "kind": kind,
        "number": entry.get("number"),
        "title": str(entry.get("title") or ""),
        "html_url": entry.get("html_url") or "",
        "labels": list(entry.get("labels") or []),
        "updated_at": entry.get("updated_at") or "",
    }


def _run_item(
    repo: str,
    run: dict[str, Any],
    default_branch: str,
) -> dict[str, Any]:
    branch = run.get("head_branch") or "?"
    conclusion = run.get("conclusion") or "keine Conclusion (fail-closed)"
    item = _base_item(repo, "workflow_run", run)
    item["number"] = run.get("id")
    item["title"] = str(run.get("name") or "Workflow")
    item["reason"] = (
        f"Workflow '{run.get('name') or 'Workflow'}' "
        f"auf Branch '{branch}' fehlgeschlagen "
        f"({conclusion}, Event {run.get('event') or '?'})."
    )
    item["action"] = (
        "Logs pruefen und Fix priorisieren; "
        "Pages-Deploy-Aenderungen nur auf dem nextjs-Zweig."
    )
    item["_default_key"] = (
        "workflow_run_default_branch"
        if branch == default_branch
        else "workflow_run_feature_branch"
    )
    return item


def _pr_item(repo: str, pr: dict[str, Any], now: datetime) -> dict[str, Any]:
    days = _days_since(pr.get("updated_at") or "", now)
    reviewers = pr.get("requested_reviewers") or []
    item = _base_item(repo, "pull_request", pr)
    if reviewers:
        item["reason"] = (
            f"PR mit zugewiesenen Reviewern, "
            f"letzte Aktivitaet vor {days} Tagen."
        )
    else:
        item["reason"] = (
            f"PR ohne zugewiesene Reviewer, "
            f"seit {days} Tagen ohne Review."
        )
    item["action"] = "Review zuweisen, durchfuehren oder PR schliessen."
    item["_default_key"] = "pull_request_needs_review"
    return item


def _issue_item(
    repo: str,
    issue: dict[str, Any],
    cfg: dict[str, Any],
    now: datetime,
) -> dict[str, Any]:
    days = _days_since(issue.get("updated_at") or "", now)
    stale_days = int(cfg["stale_days"])
    item = _base_item(repo, "issue", issue)
    if days >= stale_days:
        item["reason"] = (
            f"Issue ohne Aktivitaet seit {days} Tagen "
            f"(Grenze {stale_days} Tage)."
        )
        item["action"] = (
            "Klaeren, bearbeiten oder nach der 30-Tage-Regel schliessen."
        )
        item["_default_key"] = "issue_stale"
    else:
        item["reason"] = (
            "Offenes Issue im Triage-Fenster, "
            "keine Stale-Ueberschreitung."
        )
        item["action"] = "Prioritaet und Status pruefen und einordnen."
        item["_default_key"] = "issue_open"
    return item


def _repo_error_item(repo: str, message: str) -> dict[str, Any]:
    return {
        "repo": repo,
        "kind": "repo_error",
        "number": 0,
        "title": "Repo nicht lesbar",
        "html_url": f"https://github.com/{repo}",
        "labels": [],
        "updated_at": "",
        "reason": f"Repo-Zugriff im Collect-Schritt fehlgeschlagen: {message}",
        "action": (
            "Token-Berechtigung und App-Installation pruefen "
            "(G1 fail-closed)."
        ),
        "_default_key": "repo_error",
    }


def _schema_ok(item: dict[str, Any]) -> bool:
    for field in REQUIRED_FIELDS:
        value = item.get(field)
        if value is None or value == "":
            return False
    return item.get("priority") in PRIORITY_ORDER


def grade_items(
    collect: dict[str, Any],
    cfg: dict[str, Any],
    now: datetime | None = None,
) -> dict[str, Any]:
    """Fuehrt G1-G5 aus: verifizierte Items, Verwuerfe, Zaehler."""
    now = now or datetime.now(timezone.utc)
    priority_set = set(cfg["labels"]["priority"])
    status_set = set(cfg["labels"]["status"])
    grading = cfg["grading"]
    defaults = grading["default_priority"]

    verified: list[dict[str, Any]] = []
    discarded: list[dict[str, Any]] = []
    counters = {
        "collected": 0,
        "verified": 0,
        "discarded": 0,
        "overflow": 0,
        "draft_prs_skipped": 0,
    }

    def _drop(item: dict[str, Any], reason: str) -> dict[str, Any]:
        counters["discarded"] += 1
        return {
            "repo": item.get("repo"),
            "kind": item.get("kind"),
            "number": item.get("number"),
            "title": item.get("title"),
            "reason": reason,
        }

    def finish(item: dict[str, Any]) -> None:
        key = item.pop("_default_key", "issue_open")
        if key not in DEFAULT_KEYS:
            key = "issue_open"
        label_priority = _priority_from_labels(
            item.get("labels", []), priority_set
        )
        if label_priority:
            item["priority"] = label_priority
        else:
            item["priority"] = f"priority:{defaults.get(key, 'low')}"
        counters["collected"] += 1

        labels = item.get("labels", [])
        if item["kind"] in ("pull_request", "issue"):
            has_priority = (
                _priority_from_labels(labels, priority_set) is not None
            )
            has_status = any(label in status_set for label in labels)
            if grading.get("require_priority_label") and not has_priority:
                discarded.append(
                    _drop(item, "unlabelled: Priority-Label fehlt (G2)")
                )
                return
            if grading.get("require_status_label") and not has_status:
                discarded.append(
                    _drop(item, "unlabelled: Status-Label fehlt (G2)")
                )
                return
        if not _schema_ok(item):
            discarded.append(_drop(item, "schema: G4-Feld unvollstaendig"))
            return
        verified.append(item)

    for repo, data in collect.get("repos", {}).items():
        if not isinstance(data, dict):
            continue
        if data.get("error"):
            finish(_repo_error_item(repo, data["error"]))
            continue
        default_branch = data.get("default_branch") or "main"
        for run in data.get("failed_runs", []):
            finish(_run_item(repo, run, default_branch))
        if grading.get("skip_draft_prs"):
            counters["draft_prs_skipped"] += sum(
                1 for pr in data.get("prs", []) if pr.get("draft")
            )
        for pr in data.get("prs", []):
            if pr.get("draft") and grading.get("skip_draft_prs"):
                continue
            finish(_pr_item(repo, pr, now))
        for issue in data.get("issues", []):
            finish(_issue_item(repo, issue, cfg, now))

    verified.sort(
        key=lambda it: (
            PRIORITY_ORDER.get(it["priority"], 9),
            it.get("updated_at") or "",
        )
    )
    max_items = int(cfg["caps"].get("max_items", 50))
    if len(verified) > max_items:
        counters["overflow"] = len(verified) - max_items
        verified = verified[:max_items]
    counters["verified"] = len(verified)
    return {"items": verified, "discarded": discarded, "counters": counters}


def main(argv: list[str] | None = None) -> int:
    started = time.monotonic()
    parser = argparse.ArgumentParser(description="Triage-Loop: Grader G1-G5")
    parser.add_argument("--config", default=None)
    parser.add_argument("--collect", default="collect.json")
    parser.add_argument("--report", default="report.json")
    parser.add_argument("--trace", default="trace.json")
    args = parser.parse_args(argv)

    exit_code = 0
    try:
        cfg = load_config(args.config)
        collect_path = Path(args.collect)
        if not collect_path.exists():
            raise TriageError(f"Collect-Datei fehlt: {collect_path}")
        collect = json.loads(collect_path.read_text(encoding="utf-8"))
        result = grade_items(collect, cfg)
    except TriageError as exc:
        print(f"[grade] Strukturfehler: {exc}", file=sys.stderr)
        return 3

    elapsed = time.monotonic() - started
    timeout_seconds = int(cfg["caps"].get("timeout_minutes", 10)) * 60
    if elapsed > timeout_seconds:
        exit_code = 2

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    report = {
        "generated_at": now_iso,
        "window_since": collect.get("window_since"),
        "repos": list(collect.get("repos", {}).keys()),
        "items": result["items"],
        "counters": result["counters"],
    }
    trace = {
        "generated_at": now_iso,
        "config_fingerprint": config_fingerprint(cfg),
        "iterations": 1,
        "runtime_seconds": round(elapsed, 2),
        "budget_ok": exit_code == 0,
        "exit_code": exit_code,
        "counters": result["counters"],
        "discarded": result["discarded"],
        "grader": [
            "G1 ci_status",
            "G2 label_coverage",
            "G3 stale",
            "G4 schema",
            "G5 budget",
        ],
    }
    Path(args.report).write_text(
        json.dumps(report, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    Path(args.trace).write_text(
        json.dumps(trace, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    c = result["counters"]
    print(
        f"[grade] verifiziert {c['verified']}, verworfen {c['discarded']}, "
        f"ueberhang {c['overflow']}, "
        f"draft-PRs uebersprungen {c['draft_prs_skipped']}, "
        f"exit {exit_code}"
    )
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
