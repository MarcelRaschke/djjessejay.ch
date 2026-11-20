#!/usr/bin/env python3
"""Checks tracked example env files for real-looking credential values.

Usage: python3 scripts/check-env-examples.py FILE...

A line NAME=VALUE whose NAME contains PASSWORD, SECRET, TOKEN, PRIVATE_KEY or
API_KEY fails when VALUE is 20 characters or longer and is not an explicit
placeholder. Only the value is judged: an inline comment (" # ...") is removed
first, so a comment such as "# replace_me" cannot exempt a real credential.
A placeholder must be the whole value in one of the formats below. Python
stdlib only; exit 1 on any finding.
"""
from __future__ import annotations

import re
import sys

SENSITIVE = re.compile(r"^([A-Z0-9_]*(?:PASSWORD|SECRET|TOKEN|PRIVATE_KEY|API_KEY)[A-Z0-9_]*)=(.*)$")
PLACEHOLDER = re.compile(
    r"^(?:"
    r"your[_-][a-z0-9_-]*"                       # your_secret_token_here_change_this
    r"|[a-z0-9_-]*[_-]change[_-]?(?:me|this)"    # some_value_change_me
    r"|change[_-]?(?:me|this)|replace[_-]?me"
    r"|example|placeholder|dummy|x{6,}"
    r"|<[a-z0-9_ -]+>"                            # <your token>
    r"|\$\{[A-Z0-9_]+\}"                          # ${OTHER_VAR}
    r")$",
    re.IGNORECASE,
)
MIN_LEN = 20


def value_of(raw: str) -> str:
    value = raw.strip()
    if value and value[0] in "\"'" and value.count(value[0]) >= 2:
        return value[1 : value.index(value[0], 1)]
    # Unquoted: an inline comment starts at whitespace followed by "#".
    return re.split(r"\s+#", value, maxsplit=1)[0].strip()


def check(path: str) -> list[str]:
    findings = []
    with open(path, encoding="utf-8") as fh:
        for no, line in enumerate(fh, 1):
            m = SENSITIVE.match(line.rstrip("\n"))
            if not m:
                continue
            value = value_of(m.group(2))
            if len(value) >= MIN_LEN and not PLACEHOLDER.match(value):
                findings.append(f"{path}:{no}: {m.group(1)}")
    return findings


def main(paths: list[str]) -> int:
    findings = [f for p in paths for f in check(p)]
    for f in findings:
        file, no, name = f.split(":", 2)
        print(f"::error file={file},line={no}::Langer Wert bei sensitiver Variable{name} in Beispieldatei")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
