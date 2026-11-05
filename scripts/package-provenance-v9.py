#!/usr/bin/env python3
"""Draft-only v9 packager. No network, uploads, tags or release mutations."""
import argparse
import hashlib
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import subprocess
import tempfile
import zipfile
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = [
    "AI_SYSTEM_PROMPT.md",
    "DJ_JESSE_JAY_CANONICAL_PROFILE.md",
    "archive/MANIFEST.json",
    "artist-profile.json",
    "graph/neo4j/v9-assertions.cypher",
    "graph/neo4j/v9-assertions.json",
    "jj-ai/knowledge-context.json",
    "pressekit/README.md",
    "presskit/ARCHIVE_CITATION_APPENDIX.html",
    "presskit/ARCHIVE_CITATION_APPENDIX.md",
    "presskit/README.md",
    "release/PROVENANCE_V9_SCOPE.md",
    "website/archive-status.json",
    "website/provenance.json",
    "website/schema.org.jsonld"
]
REQUIRED = {
    "id", "subject", "predicate", "value", "valid_time", "observed_time",
    "confidence", "status", "sourceClass", "sources", "review_state",
}
STATUSES = {
    "unreviewed", "possible", "probable", "supported", "verified",
    "contradicted", "deprecated",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def validate():
    ledger = read_json("website/provenance.json")
    status = read_json("website/archive-status.json")
    graph = read_json("graph/neo4j/v9-assertions.json")
    claims = ledger["claims"]
    sources = {s["id"]: s for s in ledger["sources"]}
    require(len(sources) == len(ledger["sources"]), "duplicate source IDs")
    require(
        len({c["id"] for c in claims}) == len(claims),
        "duplicate claim IDs",
    )
    for c in claims:
        require(REQUIRED <= c.keys(), "missing claim fields: " + c["id"])
        require(c["status"] in STATUSES, "invalid status")
        require(0 <= c["confidence"] <= 1, "invalid confidence")
        require(
            c["sourceClass"] in ledger["policy"]["classes"],
            "invalid source class",
        )
        require(
            c["sources"] and all(s in sources for s in c["sources"]),
            "unresolved reference ID",
        )
        require(
            {"start", "end", "precision"} <= c["valid_time"].keys(),
            "missing valid time",
        )
        require(
            c["review_state"] == "human_review_required",
            "unreviewed preparation must retain review hold",
        )
        # Keep the ledger compatible with its existing SQLite consumer.
        require(
            c["value"] is None or isinstance(c["value"], (str, int, float)),
            "claim value must be a SQLite-compatible scalar",
        )
        for sid in c["sources"]:
            s = sources[sid]
            require(
                s["url"] is None or s["url"].startswith("https://"),
                "unsafe source URL",
            )
            require(
                s["resolution"] != "resolved" or s["url"],
                "resolved reference without URL",
            )
    require(status["claimCount"] == len(claims), "status count mismatch")
    require(
        status["readiness"] == "NOT_READY",
        "draft must not claim readiness",
    )
    require(
        status["verifiedArchiveReceiptCount"] == 0
        and not status["archiveReceipts"],
        "new receipts need reviewed gate implementation",
    )
    expected = [
        {
            "id": c["id"], "status": c["status"],
            "review_state": c["review_state"], "sources": c["sources"],
            "sourceResolution": c["sourceResolution"],
            "archiveStatus": "MISSING",
        }
        for c in claims
    ]
    require(status["claims"] == expected, "archive status drift")
    expected_nodes = [
        {"id": s["id"], "label": "Source", "properties": s}
        for s in ledger["sources"]
    ] + [
        {"id": c["id"], "label": "Claim", "properties": c}
        for c in claims
    ]
    expected_edges = [
        {"from": c["id"], "to": s, "type": "CITES"}
        for c in claims for s in c["sources"]
    ]
    require(
        graph["nodes"] == expected_nodes and graph["edges"] == expected_edges,
        "graph drift",
    )
    require(
        graph["nodeCount"] == len(expected_nodes)
        and graph["edgeCount"] == len(expected_edges),
        "graph count drift",
    )
    require(
        graph["notIndependentEvidence"] is True,
        "derived graph evidence boundary missing",
    )
    for path in [
        "presskit/ARCHIVE_CITATION_APPENDIX.md",
        "presskit/ARCHIVE_CITATION_APPENDIX.html",
    ]:
        text = (ROOT / path).read_text(encoding="utf-8")
        require(
            all(c["id"] in text for c in claims),
            "appendix claim coverage drift",
        )
        require("NOT READY" in text, "appendix readiness hold missing")
    # Neo4j execution is a separate gate, not claimed by this validator.
    validate_public(ledger)
    return ledger


class PublicAppendix(HTMLParser):
    """Validate the deployable HTML without executing it."""

    def __init__(self):
        super().__init__()
        self.links = []
        self.rows = []
        self.row = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        require(tag not in {"script", "style", "iframe"}, "active HTML")
        for name, value in attrs:
            require(
                not name.startswith("on") and name != "style",
                "inline behavior or style",
            )
            if name in {"href", "src"}:
                require(bool(value), "empty link")
                self.links.append(value)
        if tag == "tr":
            self.row = []
        if tag == "td":
            self.cell = ""

    def handle_data(self, data):
        if self.cell is not None:
            self.cell += data

    def handle_endtag(self, tag):
        if tag == "td":
            self.row.append(self.cell)
            self.cell = None
        if tag == "tr":
            if self.row:
                self.rows.append(self.row)
            self.row = None


def validate_public(ledger):
    path = ROOT / "presskit/ARCHIVE_CITATION_APPENDIX.html"
    parser = PublicAppendix()
    parser.feed(path.read_text(encoding="utf-8"))
    rows = {r[0]: r for r in parser.rows}
    require(
        set(rows) == {c["id"] for c in ledger["claims"]},
        "public appendix claim inventory mismatch",
    )
    markdown = (ROOT / "presskit/ARCHIVE_CITATION_APPENDIX.md").read_text(
        encoding="utf-8",
    )
    for claim in ledger["claims"]:
        label = claim["status"] + " / " + claim["sourceClass"]
        row = rows[claim["id"]]
        require(row[1] == label, "public appendix status/class drift")
        require(
            "human review required" in row[3],
            "public appendix review hold missing",
        )
        require(
            "| " + claim["id"] + " | " + label + " |" in markdown,
            "Markdown appendix status/class drift",
        )
        require(
            all(s in row[2] for s in claim["sources"]),
            "public appendix source mapping drift",
        )
    for source in ledger["sources"]:
        if source["url"]:
            require(
                source["url"] in parser.links
                and source["url"] in markdown,
                "appendix source URL drift",
            )
    for link in parser.links:
        url = urlsplit(link)
        if url.scheme:
            require(url.scheme == "https", "unsafe public link")
        else:
            require(not url.netloc, "scheme-relative public link")
            target = (path.parent / url.path).resolve()
            require(
                target.is_relative_to(ROOT) and target.is_file(),
                "missing or unsafe local appendix target: " + link,
            )
    for name in [
        "website/archive-status.json", "website/provenance.json",
        "website/schema.org.jsonld",
    ]:
        read_json(name)
    print("PASS: public appendix, source/status parity and JSON targets.")


def git(*args):
    return subprocess.check_output(
        ["git", *args], cwd=ROOT, text=True,
    ).strip()


def archive_bytes(entries):
    result = io.BytesIO()
    with zipfile.ZipFile(
        result, "w", compression=zipfile.ZIP_STORED,
    ) as archive:
        for name, data in sorted(entries.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    return result.getvalue()


def verify_zip(data, manifest):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        expected = {f["path"] for f in manifest["files"]} | {"MANIFEST.json"}
        require(
            set(archive.namelist()) == expected
            and len(archive.namelist()) == len(expected),
            "ZIP inventory mismatch",
        )
        require(
            json.loads(archive.read("MANIFEST.json")) == manifest,
            "embedded manifest mismatch",
        )
        for f in manifest["files"]:
            content = archive.read(f["path"])
            require(len(content) == f["size"], "size mismatch: " + f["path"])
            require(
                hashlib.sha256(content).hexdigest() == f["sha256"],
                "digest mismatch: " + f["path"],
            )


def build(output):
    validate()
    commit = git("rev-parse", "HEAD")
    tracked = set(git("ls-files").splitlines())
    require(set(PAYLOAD) <= tracked, "payload contains untracked files")
    require(
        not git("diff", "HEAD", "--", *PAYLOAD),
        "payload differs from committed source",
    )
    entries = {}
    for path in PAYLOAD:
        local = ROOT / path
        require(
            not local.is_symlink() and local.is_file(),
            "not a regular payload file: " + path,
        )
        entries[path] = local.read_bytes()
    manifest = {
        "format": "djjj-release-manifest-v1", "target": "v9",
        "status": "DRAFT_NOT_READY", "sourceCommit": commit,
        "notIndependentEvidence": True,
        "files": [
            {
                "path": p, "size": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            }
            for p, data in sorted(entries.items())
        ],
    }
    manifest_bytes = (
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    ).encode("utf-8")
    entries["MANIFEST.json"] = manifest_bytes
    data = archive_bytes(entries)
    verify_zip(data, manifest)
    require(data == archive_bytes(entries), "non-deterministic ZIP")
    # A changed payload must fail against the unchanged manifest.
    changed = dict(entries)
    changed[PAYLOAD[0]] += b"\nTAMPER"
    try:
        verify_zip(archive_bytes(changed), manifest)
    except ValueError:
        pass
    else:
        raise ValueError("tampering negative control did not fail")
    output.mkdir(parents=True, exist_ok=True)
    archive_path = output / "djjj-v9-provenance-DRAFT.zip"
    archive_path.write_bytes(data)
    (output / "MANIFEST.json").write_bytes(manifest_bytes)
    (output / "SHA256SUMS").write_text(
        hashlib.sha256(data).hexdigest() + "  " + archive_path.name + "\n"
        + hashlib.sha256(manifest_bytes).hexdigest() + "  MANIFEST.json\n",
        encoding="utf-8",
    )
    print("ZIP bytes:", len(data))
    print("ZIP SHA-256:", hashlib.sha256(data).hexdigest())
    print(
        "PASS: references, status, graph, appendix coverage, deterministic "
        "ZIP, SHA-256, sizes and tamper rejection."
    )
    print(
        "NOT READY: independent archive captures, source review, Neo4j "
        "import, human approval and public-content checks remain required."
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--site-check", action="store_true")
    mode.add_argument("--output", type=Path)
    parser.add_argument("--rc", action="store_true")
    args = parser.parse_args()
    if args.rc:
        parser.error(
            "RC publication is held: independent receipts and human release "
            "gates are incomplete. Draft packaging cannot authorize a release."
        )
    if args.site_check:
        validate()
    elif args.check:
        with tempfile.TemporaryDirectory(prefix="djjj-v9-check-") as directory:
            build(Path(directory))
    elif args.output:
        build(args.output.resolve())
    else:
        parser.error("choose --check, --site-check or --output DIRECTORY")


if __name__ == "__main__":
    main()
