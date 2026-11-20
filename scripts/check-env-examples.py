#!/usr/bin/env python3
"""Checks tracked example env files for real-looking credential values.

Usage: python3 scripts/check-env-examples.py FILE...

A line NAME=VALUE whose NAME contains PASSWORD, SECRET, TOKEN, PRIVATE_KEY or
API_KEY fails when VALUE is 20 characters or longer and is not an explicit
placeholder. Only the value is judged: an inline comment (" # ...") is removed
first, so a comment such as "# replace_me" cannot exempt a real credential.
Loaders differ (Bash, Node --env-file, dotenv), so a value is judged by the
longer of its shell reading and its raw text without a trailing comment; it
is never shortened by escapes or quotes. A placeholder must
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
DQ_ESCAPABLE = "$`\"\\"


def shell_value(raw: str) -> str:
    """Return the value a shell would assign for NAME=raw.

    Quoted and unquoted fragments are concatenated ("abc"def is abcdef);
    inside double quotes and unquoted text a backslash escapes the next
    character (inside double quotes only before $ ` " \\), single quotes
    have no escapes. The value ends at the first
    unquoted whitespace; what follows must be empty or a comment. An
    unterminated quote or other trailing text returns the raw text, so
    ambiguous syntax never shortens a value.
    """
    text = raw.strip()
    out: list[str] = []
    quote = ""
    i = 0
    while i < len(text):
        ch = text[i]
        if quote:
            if ch == quote:
                quote = ""
            elif (
                quote == '"'
                and ch == "\\"
                and i + 1 < len(text)
                and text[i + 1] in DQ_ESCAPABLE
            ):
                # Bash honours a backslash inside double quotes only before
                # $ ` " \ ; elsewhere it stays part of the value.
                i += 1
                out.append(text[i])
            else:
                out.append(ch)
        elif ch in "\"'":
            quote = ch
        elif ch == "\\" and i + 1 < len(text):
            i += 1
            out.append(text[i])
        elif ch.isspace():
            break
        else:
            out.append(ch)
        i += 1
    if quote:
        return text
    rest = text[i:].strip()
    if rest and not rest.startswith("#"):
        return text
    return "".join(out)


def is_credential(raw: str) -> bool:
    """True when the assigned value may be a real credential.

    Loaders disagree on quotes and backslashes (Bash, Node --env-file,
    dotenv), so the length is never taken from one parser alone: it is the
    longer of the shell-parsed value and the raw text without a trailing
    comment; escapes and quotes only ever shorten a literal value. A
    placeholder is exempt only when its raw text has no backslash, so an
    escape cannot turn a real value into something that looks like one.
    """
    value = shell_value(raw)
    if PLACEHOLDER.match(value) and "\\" not in raw:
        return False
    literal = re.sub(r"\s+#.*$", "", raw.strip())
    return max(len(value), len(literal)) >= MIN_LEN


def check(path: str) -> list[tuple[str, int, str]]:
    findings = []
    with open(path, encoding="utf-8") as fh:
        for no, line in enumerate(fh, 1):
            m = SENSITIVE.match(line.rstrip("\n"))
            if not m:
                continue
            if is_credential(m.group(2)):
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
