#!/usr/bin/env python3
"""Checks tracked example env files for real-looking credential values.

Usage: python3 scripts/check-env-examples.py FILE...

A line NAME=VALUE whose NAME contains PASSWORD, SECRET, TOKEN, PRIVATE_KEY or
API_KEY fails when VALUE is 20 characters or longer and is not an explicit
placeholder. Only the value is judged: an inline comment (" # ...") is removed
first, so a comment such as "# replace_me" cannot exempt a real credential.
Quoted values are read like a shell does (backslash escapes inside double
quotes); an unterminated quote is judged as the raw text. A placeholder must
be the whole value in one of the formats below. Python stdlib only; exit 1 on
any finding.
"""
from __future__ import annotations

import re
import sys

SENSITIVE = re.compile(
    r"^([A-Z0-9_]*(?:PASSWORD|SECRET|TOKEN|PRIVATE_KEY|API_KEY)[A-Z0-9_]*)"
    r"=(.*)$"
)
PLACEHOLDER = re.compile(
    r"^(?:"
    r"your[_-][a-z0-9_-]*"  # your_secret_token_here_change_this
    r"|[a-z0-9_-]*[_-]change[_-]?(?:me|this)"  # some_value_change_me
    r"|change[_-]?(?:me|this)|replace[_-]?me"
    r"|example|placeholder|dummy|x{6,}"
    r"|<[a-z0-9_ -]+>"  # <your token>
    r"|\$\{[A-Z0-9_]+\}"  # ${OTHER_VAR}
    r")$",
    re.IGNORECASE,
)
MIN_LEN = 20


def unquote(value: str) -> str:
    """Return the content of a leading quoted string, shell-style.

    Inside double quotes a backslash escapes the next character, so
    "abc\\"def" is abc"def. Single quotes have no escapes. Without a closing
    quote the raw text is returned, so ambiguity never shortens a value.
    """
    quote = value[0]
    out: list[str] = []
    i = 1
    while i < len(value):
        ch = value[i]
        if quote == '"' and ch == "\\" and i + 1 < len(value):
            out.append(value[i + 1])
            i += 2
            continue
        if ch == quote:
            return "".join(out)
        out.append(ch)
        i += 1
    return value


def value_of(raw: str) -> str:
    value = raw.strip()
    if value and value[0] in "\"'":
        return unquote(value)
    # Unquoted: an inline comment starts at whitespace followed by "#".
    return re.split(r"\s+#", value, maxsplit=1)[0].strip()


def check(path: str) -> list[tuple[str, int, str]]:
    findings = []
    with open(path, encoding="utf-8") as fh:
        for no, line in enumerate(fh, 1):
            m = SENSITIVE.match(line.rstrip("\n"))
            if not m:
                continue
            value = value_of(m.group(2))
            if len(value) >= MIN_LEN and not PLACEHOLDER.match(value):
                findings.append((path, no, m.group(1)))
    return findings


def main(paths: list[str]) -> int:
    findings = [f for p in paths for f in check(p)]
    for path, no, name in findings:
        print(
            f"::error file={path},line={no}::"
            f"Langer Wert bei sensitiver Variable {name} in Beispieldatei"
        )
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
