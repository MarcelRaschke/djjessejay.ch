"""Triage-Loop Schritt 3: Report.

Ausgabe: Markdown in stdout und GITHUB_STEP_SUMMARY,
Slack-Routing nach Prioritaet.
Critical-Items gehen an SLACK_WEBHOOK_URL_CRITICAL (mit @here), alles andere an
SLACK_WEBHOOK_URL_DEFAULT. Ohne Webhook-Umgebungsvariablen laeuft der Report
still (Ausgabe bleibt stdout/Step Summary).
"""
from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

SECTION_TITLES = {
    "priority:critical": "Critical",
    "priority:high": "High",
    "priority:medium": "Medium",
    "priority:low": "Low",
}

MAX_SLACK_CHARS = 38000


def build_markdown(report: dict[str, Any]) -> str:
    counters = report.get("counters", {})
    lines = [
        "# Triage-Loop Report",
        "",
        f"Fenster seit {report.get('window_since') or '?'} | "
        f"Repos: {', '.join(report.get('repos', []))}",
        f"Verifiziert: {counters.get('verified', 0)} | "
        f"Verworfen (Nacharbeit): {counters.get('discarded', 0)} | "
        f"Ueberhang: {counters.get('overflow', 0)}",
        "",
    ]
    items = report.get("items", [])
    if not items:
        lines.append("Keine verifizierten Items im Fenster.")
    for priority, title in SECTION_TITLES.items():
        section = [item for item in items if item.get("priority") == priority]
        if not section:
            continue
        lines.append(f"## {title}")
        for item in section:
            labels = ", ".join(item.get("labels", [])) or "keine Labels"
            lines.append(
                f"- [{item['repo']} #{item['number']}]"
                f"({item['html_url']}) — {item['title']}: "
                f"{item['reason']} Aktion: {item['action']} ({labels})"
            )
        lines.append("")
    return "\n".join(lines)


def post_slack(webhook_url: str, text: str) -> bool:
    payload = json.dumps({"text": text[:MAX_SLACK_CHARS]}).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "ivdj-triage-loop",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15):
            return True
    except (urllib.error.URLError, urllib.error.HTTPError) as exc:
        print(f"[report] Slack-Post fehlgeschlagen: {exc}")
        return False


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Triage-Loop: Report")
    parser.add_argument("--report", default="report.json")
    parser.add_argument("--trace", default="trace.json")
    args = parser.parse_args(argv)

    report_path = Path(args.report)
    if not report_path.exists():
        print(
            "[report] Kein report.json vorhanden "
            "(Collect/Grade fehlgeschlagen) — nur Trace-Info."
        )
        return 0
    report = json.loads(report_path.read_text(encoding="utf-8"))
    trace_path = Path(args.trace)
    trace = (
        json.loads(trace_path.read_text(encoding="utf-8"))
        if trace_path.exists()
        else {}
    )

    markdown = build_markdown(report)
    if trace:
        fingerprint = trace.get("config_fingerprint", "n/a")
        discarded = trace.get("counters", {}).get("discarded", 0)
        markdown += (
            "\n---\n"
            f"\nTrace: fingerprint `{fingerprint}`, "
            f"verworfen {discarded}.\n"
        )
    print(markdown)
    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        with Path(step_summary).open("a", encoding="utf-8") as handle:
            handle.write(markdown + "\n")

    items = report.get("items", [])
    critical_items = [
        item for item in items
        if item.get("priority") == "priority:critical"
    ]
    default_hook = os.environ.get("SLACK_WEBHOOK_URL_DEFAULT", "").strip()
    critical_hook = os.environ.get("SLACK_WEBHOOK_URL_CRITICAL", "").strip()

    if critical_items:
        mention = "<!here>"
        text = (
            f"{mention} Triage-Loop: "
            f"{len(critical_items)} kritische Items.\n"
            + "\n".join(
                f"- {item['repo']} #{item['number']} "
                f"{item['title']}: {item['html_url']}"
                for item in critical_items
            )
        )
        if critical_hook:
            post_slack(critical_hook, text)
        elif default_hook:
            post_slack(default_hook, text)

    if items and default_hook:
        post_slack(default_hook, markdown)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
