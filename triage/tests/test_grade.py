"""Unit-Tests fuer die Grader G1-G5 (grade.py).

Lauf: python -m pytest triage/tests -q
"""
from __future__ import annotations

import copy
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

TRIAGE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TRIAGE_DIR))

import grade  # noqa: E402
from common import load_config  # noqa: E402

CFG = load_config(TRIAGE_DIR / "config.yaml")
NOW = datetime(2026, 10, 12, 6, 30, tzinfo=timezone.utc)
REPO = "MarcelRaschke/djjessejay.ch"


def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def base_collect() -> dict:
    return {"generated_at": iso(NOW), "window_since": iso(NOW - timedelta(days=7)), "repos": {}}


def repo_entry(collect: dict, repo: str = REPO) -> dict:
    return collect["repos"].setdefault(
        repo, {"default_branch": "main", "failed_runs": [], "prs": [], "issues": []}
    )


def add_issue(collect: dict, labels: list[str], updated: datetime, repo: str = REPO) -> None:
    repo_entry(collect, repo)["issues"].append(
        {
            "number": 42,
            "title": "Test-Issue",
            "html_url": f"https://github.com/{repo}/issues/42",
            "created_at": iso(updated),
            "updated_at": iso(updated),
            "labels": labels,
        }
    )


def test_stale_boundary_31_days() -> None:
    collect = base_collect()
    add_issue(collect, ["priority:low", "status:ready"], NOW - timedelta(days=31))
    result = grade.grade_items(collect, CFG, now=NOW)
    assert result["items"][0]["reason"].startswith("Issue ohne Aktivitaet seit 31 Tagen")


def test_no_stale_at_29_days() -> None:
    collect = base_collect()
    add_issue(collect, ["priority:low", "status:ready"], NOW - timedelta(days=29))
    result = grade.grade_items(collect, CFG, now=NOW)
    assert "keine Stale-Ueberschreitung" in result["items"][0]["reason"]


def test_missing_priority_label_discarded() -> None:
    collect = base_collect()
    add_issue(collect, ["status:ready"], NOW - timedelta(days=5))
    result = grade.grade_items(collect, CFG, now=NOW)
    assert result["counters"]["discarded"] == 1
    assert "Priority-Label fehlt" in result["discarded"][0]["reason"]


def test_missing_status_label_discarded() -> None:
    collect = base_collect()
    add_issue(collect, ["priority:high"], NOW - timedelta(days=5))
    result = grade.grade_items(collect, CFG, now=NOW)
    assert "Status-Label fehlt" in result["discarded"][0]["reason"]


def test_priority_label_overrides_default() -> None:
    collect = base_collect()
    add_issue(collect, ["priority:critical", "status:blocked"], NOW - timedelta(days=3))
    result = grade.grade_items(collect, CFG, now=NOW)
    assert result["items"][0]["priority"] == "priority:critical"


def test_schema_missing_url_discarded() -> None:
    collect = base_collect()
    entry = repo_entry(collect)
    entry["issues"].append(
        {
            "number": 7,
            "title": "Ohne URL",
            "html_url": "",
            "updated_at": iso(NOW),
            "labels": ["priority:low", "status:ready"],
        }
    )
    result = grade.grade_items(collect, CFG, now=NOW)
    assert any("G4" in item["reason"] for item in result["discarded"])


def test_budget_cap_overflow() -> None:
    cfg = copy.deepcopy(CFG)
    cfg["caps"]["max_items"] = 1
    collect = base_collect()
    add_issue(collect, ["priority:low", "status:ready"], NOW - timedelta(days=2))
    add_issue(collect, ["priority:high", "status:ready"], NOW - timedelta(days=3))
    result = grade.grade_items(collect, cfg, now=NOW)
    assert result["counters"]["overflow"] == 1
    assert result["counters"]["verified"] == 1
    assert result["items"][0]["priority"] == "priority:high"


def test_draft_pr_skipped() -> None:
    collect = base_collect()
    repo_entry(collect)["prs"].append(
        {
            "number": 152,
            "title": "Draft",
            "html_url": "https://github.com/x",
            "updated_at": iso(NOW),
            "draft": True,
            "requested_reviewers": [],
            "labels": ["priority:high", "status:in-review"],
        }
    )
    result = grade.grade_items(collect, CFG, now=NOW)
    assert result["counters"]["draft_prs_skipped"] == 1
    assert result["counters"]["verified"] == 0


def test_failed_run_default_branch_is_high() -> None:
    collect = base_collect()
    repo_entry(collect)["failed_runs"].append(
        {
            "id": 99,
            "name": "deploy-wdjjj",
            "head_branch": "main",
            "conclusion": "failure",
            "status": "completed",
            "event": "push",
            "html_url": "https://github.com/x/actions/runs/99",
            "updated_at": iso(NOW),
        }
    )
    result = grade.grade_items(collect, CFG, now=NOW)
    assert result["items"][0]["priority"] == "priority:high"
    assert result["items"][0]["kind"] == "workflow_run"


def test_repo_error_surfaces_fail_closed() -> None:
    collect = base_collect()
    collect["repos"][REPO] = {"error": "Rate-Limit"}
    result = grade.grade_items(collect, CFG, now=NOW)
    assert result["items"][0]["kind"] == "repo_error"
    assert result["items"][0]["priority"] == "priority:high"
