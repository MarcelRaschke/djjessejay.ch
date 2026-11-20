#!/usr/bin/env python3
"""Static site check for publishing public/ under a sub-path (e.g. /BDSN/).

Python stdlib only.

  python3 scripts/check-site.py public --allow-prefix /media/gallery/

Checks every *.html in the given directory:
  - every local href/src resolves to a file in the directory
    (directory -> index.html, extensionless -> .html, like GitHub Pages)
  - no root-absolute paths ("/foo"), because under /BDSN/ they would point to
    the djjessejay.ch root; known exceptions via --allow-prefix
  - no forbidden file types in the tree (.php, .sql, .env*, .pem, .key)
  - index.html exists

Exit 1 on any error.
"""

from __future__ import annotations

import argparse
import os
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ATTRS = {"href", "src", "poster", "data"}
SKIP_SCHEMES = ("http:", "https:", "mailto:", "tel:", "data:", "javascript:", "blob:", "about:")
FORBIDDEN = (".php", ".sql", ".pem", ".key")


class RefParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.refs: list[tuple[int, str]] = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ATTRS and value:
                self.refs.append((self.getpos()[0], value.strip()))
            elif name == "srcset" and value:
                for part in value.split(","):
                    url = part.strip().split(" ")[0]
                    if url:
                        self.refs.append((self.getpos()[0], url))


def resolves(root: Path, target: Path) -> bool:
    try:
        target.resolve().relative_to(root.resolve())
    except ValueError:
        return False
    if target.is_file():
        return True
    if target.is_dir() and (target / "index.html").is_file():
        return True
    if not target.suffix and target.with_suffix(".html").is_file():
        return True
    return False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("root", type=Path)
    ap.add_argument("--allow-prefix", action="append", default=[],
                    help="root-absolute prefix that is known and accepted (warning only)")
    args = ap.parse_args()
    root: Path = args.root

    errors: list[str] = []
    warnings: list[str] = []

    if not (root / "index.html").is_file():
        errors.append(f"{root}/index.html fehlt")

    for path in root.rglob("*"):
        if path.is_file():
            name = path.name.lower()
            if name.endswith(FORBIDDEN) or name.startswith(".env"):
                errors.append(f"{path}: Dateityp darf nicht veröffentlicht werden")

    pages = sorted(root.rglob("*.html"))
    checked = 0
    for page in pages:
        parser = RefParser()
        parser.feed(page.read_text(encoding="utf-8", errors="replace"))
        for line, ref in parser.refs:
            if ref.startswith(("#", "//")) or ref.lower().startswith(SKIP_SCHEMES) or "${" in ref or "{{" in ref:
                continue
            path_part = unquote(urlsplit(ref).path)
            if not path_part:
                continue
            where = f"{page.relative_to(root)}:{line}"
            checked += 1
            if path_part.startswith("/"):
                if any(path_part.startswith(p) for p in args.allow_prefix):
                    warnings.append(f"{where}: root-absolut, akzeptiert: {ref}")
                else:
                    errors.append(f"{where}: root-absoluter Pfad bricht unter Subpfad: {ref}")
                continue
            target = (page.parent / path_part)
            if not resolves(root, Path(os.path.normpath(target))):
                errors.append(f"{where}: Ziel fehlt: {ref}")

    print(f"Seiten: {len(pages)}, lokale Referenzen: {checked}, Fehler: {len(errors)}, Warnungen: {len(warnings)}")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    lines = [f"## Site-Check {root}", "", f"{len(pages)} Seiten, {checked} lokale Referenzen, "
             f"{len(errors)} Fehler, {len(warnings)} Warnungen", ""]
    lines += [f"- Fehler: `{e}`" for e in errors] + [f"- Warnung: `{w}`" for w in warnings[:20]]
    if summary:
        with open(summary, "a", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")
    for w in warnings[:20]:
        print(f"::warning::{w}")
    for e in errors:
        print(f"::error::{e}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
