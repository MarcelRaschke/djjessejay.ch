#!/usr/bin/env python3
"""Secrets audit for GitHub Actions. Python stdlib only.

Static mode (no token needed, runs on every PR):
  python3 scripts/secrets-audit.py static

  - every secrets.NAME reference in .github/workflows is declared in
    .github/secrets-inventory.json (or is a builtin)
  - a secret is only referenced by the workflows listed in its "consumers"
  - no forbidden secret is referenced
  - no secrets.* inside an if: condition (GitHub rejects it)
  - no ${{ secrets.* }} interpolated inside a run: script (use env: instead)
  - active secrets without any reference are reported as stale

Remote mode (needs metadata from the GitHub API, never values):
  python3 scripts/secrets-audit.py remote --remote-dir DIR

  DIR contains repo.json (GET /repos/{o}/{r}/actions/secrets) and
  env-<environment>.json (GET /repos/{o}/{r}/environments/{env}/secrets).

  - required secrets exist in their declared scope
  - no unmanaged secrets (present but not in the inventory)
  - no forbidden secrets present
  - age (updated_at) within rotation_days; warning from 80 %

Exit code 1 on any error finding. Findings as JSON via --json-out.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INVENTORY = ROOT / ".github" / "secrets-inventory.json"
WORKFLOWS = ROOT / ".github" / "workflows"

REF_RE = re.compile(r"secrets\.([A-Za-z_][A-Za-z0-9_]*)|secrets\[['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]\]")
RUN_RE = re.compile(r"^(\s*)(?:-\s+)?run:\s*(.*)$")
IF_RE = re.compile(r"^\s*(?:-\s+)?if:\s*(.*)$")
WARN_RATIO = 0.8


class Findings:
    def __init__(self) -> None:
        self.items: list[dict] = []

    def add(self, level: str, code: str, secret: str, msg: str, where: str = "") -> None:
        self.items.append({"level": level, "code": code, "secret": secret, "message": msg, "where": where})

    @property
    def errors(self) -> list[dict]:
        return [f for f in self.items if f["level"] == "error"]

    def markdown(self, title: str) -> str:
        lines = [f"## {title}", ""]
        if not self.items:
            lines.append("Keine Befunde.")
            return "\n".join(lines) + "\n"
        lines += ["| Level | Code | Secret | Befund | Ort |", "|---|---|---|---|---|"]
        order = {"error": 0, "warning": 1, "info": 2}
        for f in sorted(self.items, key=lambda x: (order[x["level"]], x["secret"])):
            lines.append(f"| {f['level']} | {f['code']} | `{f['secret']}` | {f['message']} | {f['where']} |")
        return "\n".join(lines) + "\n"


def load_inventory() -> tuple[dict[str, dict], set[str]]:
    data = json.loads(INVENTORY.read_text(encoding="utf-8"))
    secrets = {s["name"]: s for s in data["secrets"]}
    if len(secrets) != len(data["secrets"]):
        sys.exit("inventory: duplicate secret names")
    for s in data["secrets"]:
        for key in ("scope", "status", "required", "rotation_days", "consumers"):
            if key not in s:
                sys.exit(f"inventory: {s['name']} missing field {key}")
        if s["status"] not in ("active", "planned", "forbidden"):
            sys.exit(f"inventory: {s['name']} has invalid status {s['status']}")
    return secrets, set(data.get("builtin", []))


def scan_workflow(path: Path) -> list[tuple[str, int, str]]:
    """Return (secret, line_no, context) with context in {run, if, other}."""
    refs: list[tuple[str, int, str]] = []
    lines = path.read_text(encoding="utf-8").splitlines()
    run_indent: int | None = None
    for no, line in enumerate(lines, 1):
        stripped = line.lstrip()
        indent = len(line) - len(stripped)
        context = "other"

        if run_indent is not None:
            if stripped and indent <= run_indent:
                run_indent = None
            elif stripped:
                context = "run"

        m = RUN_RE.match(line)
        if m and run_indent is None:
            value = m.group(2).strip()
            if value.startswith(("|", ">")):
                run_indent = len(m.group(1))
            else:
                context = "run"
        elif IF_RE.match(line):
            context = "if"

        if stripped.startswith("#"):
            continue
        for a, b in REF_RE.findall(line):
            refs.append((a or b, no, context))
    return refs


def static_audit(f: Findings) -> None:
    inv, builtin = load_inventory()
    seen: dict[str, set[str]] = {}

    for wf in sorted(list(WORKFLOWS.glob("*.yml")) + list(WORKFLOWS.glob("*.yaml"))):
        rel = wf.relative_to(ROOT).as_posix()
        for name, no, ctx in scan_workflow(wf):
            where = f"{rel}:{no}"
            if ctx == "if":
                f.add("error", "SECRET_IN_IF", name, "secrets.* ist in if: nicht erlaubt; als Job-env setzen und env.* prüfen", where)
            if ctx == "run":
                f.add("warning", "SECRET_IN_RUN", name, "${{ secrets.* }} direkt im Skript; über env: übergeben", where)
            if name in builtin:
                continue
            seen.setdefault(name, set()).add(rel)
            spec = inv.get(name)
            if spec is None:
                f.add("error", "UNDECLARED", name, "nicht in secrets-inventory.json deklariert", where)
                continue
            if spec["status"] == "forbidden":
                f.add("error", "FORBIDDEN_REF", name, "verbotenes Secret wird referenziert", where)
            elif spec["status"] == "planned":
                f.add("warning", "PLANNED_REF", name, "Status planned, aber bereits referenziert; auf active setzen", where)
            if rel not in spec["consumers"]:
                f.add("error", "CONSUMER", name, "Workflow nicht in consumers-Allowlist", where)

    for name, spec in inv.items():
        if spec["status"] == "active" and name not in seen:
            f.add("warning", "STALE", name, "aktiv deklariert, aber von keinem Workflow genutzt", ".github/secrets-inventory.json")


def scopes_of(spec: dict) -> list[str]:
    """scope may be a string or a list ("repository", "environment:<name>")."""
    sc = spec["scope"]
    return list(sc) if isinstance(sc, list) else [sc]


def parse_ts(value: str) -> dt.datetime:
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))


def load_remote(remote_dir: Path) -> dict[str, dict[str, dict]]:
    """scope -> {name: {"updated_at": ...}}"""
    out: dict[str, dict[str, dict]] = {}
    for file in sorted(remote_dir.glob("*.json")):
        if file.name == "repo.json":
            scope = "repository"
        elif file.name.startswith("env-"):
            scope = "environment:" + file.stem[4:]
        else:
            continue
        raw = file.read_text(encoding="utf-8").strip()
        # gh api --paginate may emit several JSON documents back to back
        decoder = json.JSONDecoder()
        idx, entries = 0, {}
        while idx < len(raw):
            doc, end = decoder.raw_decode(raw, idx)
            for s in doc.get("secrets", []):
                entries[s["name"]] = s
            idx = end
            while idx < len(raw) and raw[idx].isspace():
                idx += 1
        out[scope] = entries
    return out


def remote_audit(f: Findings, remote_dir: Path, now: dt.datetime) -> None:
    inv, _ = load_inventory()
    remote = load_remote(remote_dir)
    if not remote:
        f.add("error", "NO_DATA", "-", f"keine API-Daten in {remote_dir}")
        return

    present: dict[str, list[str]] = {}
    for scope, entries in remote.items():
        for name, meta in entries.items():
            present.setdefault(name, []).append(scope)
            spec = inv.get(name)
            if spec is None:
                f.add("error", "UNMANAGED", name, "existiert, ist aber nicht inventarisiert", scope)
                continue
            if spec["status"] == "forbidden":
                f.add("error", "FORBIDDEN_PRESENT", name, "verbotenes Secret ist hinterlegt; sofort löschen und Schlüssel als kompromittiert behandeln", scope)
                continue
            if scope not in scopes_of(spec):
                f.add("warning", "SCOPE", name, f"liegt in {scope}, deklariert ist {', '.join(scopes_of(spec))}", scope)
            days = spec.get("rotation_days")
            if days:
                age = (now - parse_ts(meta["updated_at"])).days
                if age > days:
                    f.add("error", "ROTATION_OVERDUE", name, f"{age} Tage alt, Limit {days}", scope)
                elif age > days * WARN_RATIO:
                    f.add("warning", "ROTATION_DUE", name, f"{age} Tage alt, Limit {days}", scope)
                else:
                    f.add("info", "OK", name, f"{age}/{days} Tage", scope)

    for name, spec in inv.items():
        if spec["status"] != "active":
            continue
        fetched = [sc for sc in scopes_of(spec) if sc in remote]
        if not fetched:
            continue  # scope not fetched (e.g. environment not listed)
        if not any(sc in present.get(name, []) for sc in fetched):
            level = "error" if spec["required"] else "warning"
            f.add(level, "MISSING", name, "deklariert, aber nicht hinterlegt", ", ".join(fetched))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["static", "remote"])
    ap.add_argument("--remote-dir", type=Path)
    ap.add_argument("--json-out", type=Path)
    ap.add_argument("--now", help="ISO timestamp, for tests")
    args = ap.parse_args()

    f = Findings()
    if args.mode == "static":
        static_audit(f)
        title = "Secrets-Audit (statisch)"
    else:
        if not args.remote_dir:
            ap.error("--remote-dir required for remote mode")
        now = parse_ts(args.now) if args.now else dt.datetime.now(dt.timezone.utc)
        remote_audit(f, args.remote_dir, now)
        title = "Secrets-Audit (Bestand und Rotation)"

    report = f.markdown(title)
    print(report)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as fh:
            fh.write(report)
    if args.json_out:
        args.json_out.write_text(json.dumps(f.items, indent=2), encoding="utf-8")
    for item in f.errors:
        file_line = item["where"].split(":")
        if len(file_line) == 2 and file_line[1].isdigit():
            print(f"::error file={file_line[0]},line={file_line[1]}::{item['code']} {item['secret']}: {item['message']}", file=sys.stderr)
        else:
            print(f"::error::{item['code']} {item['secret']}: {item['message']}", file=sys.stderr)
    return 1 if f.errors else 0


if __name__ == "__main__":
    sys.exit(main())
