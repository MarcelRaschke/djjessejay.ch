#!/usr/bin/env python3
"""Draft-only v9 packager. No network, uploads, tags or release mutations."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tempfile
import zipfile

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
REQUIRED = {"id", "subject", "predicate", "value", "valid_time", "observed_time",
            "confidence", "status", "sourceClass", "sources", "review_state"}
STATUSES = {"unreviewed", "possible", "probable", "supported", "verified", "contradicted", "deprecated"}

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
    require(len({c["id"] for c in claims}) == len(claims), "duplicate claim IDs")
    for c in claims:
        require(REQUIRED <= c.keys(), "missing claim fields: " + c["id"])
        require(c["status"] in STATUSES, "invalid status")
        require(0 <= c["confidence"] <= 1, "invalid confidence")
        require(c["sourceClass"] in ledger["policy"]["classes"], "invalid source class")
        require(c["sources"] and all(s in sources for s in c["sources"]), "unresolved reference ID")
        require({"start", "end", "precision"} <= c["valid_time"].keys(), "missing valid time")
        require(c["review_state"] == "human_review_required", "unreviewed preparation must retain review hold")
        for sid in c["sources"]:
            s = sources[sid]
            require(s["url"] is None or s["url"].startswith("https://"), "unsafe source URL")
            require(s["resolution"] != "resolved" or s["url"], "resolved reference without URL")
    require(status["claimCount"] == len(claims), "status count mismatch")
    require(status["readiness"] == "NOT_READY", "draft must not claim readiness")
    require(status["verifiedArchiveReceiptCount"] == 0 and not status["archiveReceipts"], "new receipts need reviewed gate implementation")
    expected = [{"id": c["id"], "status": c["status"], "review_state": c["review_state"],
                 "sources": c["sources"], "sourceResolution": c["sourceResolution"],
                 "archiveStatus": "MISSING"} for c in claims]
    require(status["claims"] == expected, "archive status drift")
    expected_nodes = ([{"id": s["id"], "label": "Source", "properties": s} for s in ledger["sources"]]
                      + [{"id": c["id"], "label": "Claim", "properties": c} for c in claims])
    expected_edges = [{"from": c["id"], "to": s, "type": "CITES"} for c in claims for s in c["sources"]]
    require(graph["nodes"] == expected_nodes and graph["edges"] == expected_edges, "graph drift")
    require(graph["nodeCount"] == len(expected_nodes) and graph["edgeCount"] == len(expected_edges), "graph count drift")
    require(graph["notIndependentEvidence"] is True, "derived graph evidence boundary missing")
    for path in ["presskit/ARCHIVE_CITATION_APPENDIX.md", "presskit/ARCHIVE_CITATION_APPENDIX.html"]:
        text = (ROOT / path).read_text(encoding="utf-8")
        require(all(c["id"] in text for c in claims), "appendix claim coverage drift")
        require("NOT READY" in text, "appendix readiness hold missing")
    # Neo4j execution is a separate acceptance gate, not claimed by this validator.
    return ledger

def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()

def archive_bytes(entries):
    result = io.BytesIO()
    with zipfile.ZipFile(result, "w", compression=zipfile.ZIP_STORED) as archive:
        for name, data in sorted(entries.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    return result.getvalue()

def verify_zip(data, manifest):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        expected = {f["path"] for f in manifest["files"]} | {"MANIFEST.json"}
        require(set(archive.namelist()) == expected and len(archive.namelist()) == len(expected), "ZIP inventory mismatch")
        require(json.loads(archive.read("MANIFEST.json")) == manifest, "embedded manifest mismatch")
        for f in manifest["files"]:
            content = archive.read(f["path"])
            require(len(content) == f["size"], "size mismatch: " + f["path"])
            require(hashlib.sha256(content).hexdigest() == f["sha256"], "digest mismatch: " + f["path"])

def build(output):
    validate()
    commit = git("rev-parse", "HEAD")
    tracked = set(git("ls-files").splitlines())
    require(set(PAYLOAD) <= tracked, "payload contains untracked files")
    require(not git("diff", "HEAD", "--", *PAYLOAD), "payload differs from committed source")
    entries = {}
    for path in PAYLOAD:
        local = ROOT / path
        require(not local.is_symlink() and local.is_file(), "not a regular payload file: " + path)
        entries[path] = local.read_bytes()
    manifest = {"format": "djjj-release-manifest-v1", "target": "v9", "status": "DRAFT_NOT_READY",
                "sourceCommit": commit, "notIndependentEvidence": True,
                "files": [{"path": p, "size": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                          for p, data in sorted(entries.items())]}
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    entries["MANIFEST.json"] = manifest_bytes
    data = archive_bytes(entries)
    verify_zip(data, manifest)
    require(data == archive_bytes(entries), "non-deterministic ZIP")
    # Negative control: a changed payload must be rejected with the unchanged manifest.
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
        + hashlib.sha256(manifest_bytes).hexdigest() + "  MANIFEST.json\n", encoding="utf-8")
    print("PASS: references, status, graph, appendix coverage, deterministic ZIP, SHA-256, sizes and tamper rejection.")
    print("NOT READY: independent archive captures, source review, Neo4j import, human approval and public-content checks remain required.")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--rc", action="store_true")
    args = parser.parse_args()
    if args.rc:
        parser.error("RC publication is held: independent receipts and human release gates are incomplete. Draft packaging cannot authorize a release.")
    if args.check:
        with tempfile.TemporaryDirectory(prefix="djjj-v9-check-") as directory:
            build(Path(directory))
    elif args.output:
        build(args.output.resolve())
    else:
        parser.error("choose --check or --output DIRECTORY")

if __name__ == "__main__":
    main()
