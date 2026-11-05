#!/usr/bin/env python3
"""Import the v9 logical snapshot in an isolated, disposable Neo4j."""
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import secrets
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
IMAGE = "neo4j:2026.10.1"


def run(args, **kwargs):
    return subprocess.run(
        args, check=True, capture_output=True, text=True, **kwargs,
    ).stdout.strip()


def main():
    graph_bytes = (ROOT / "graph/neo4j/v9-assertions.json").read_bytes()
    graph = json.loads(graph_bytes)
    cypher = (ROOT / "graph/neo4j/v9-assertions.cypher").read_text(
        encoding="utf-8",
    )
    name = "v9-graph-check-" + uuid.uuid4().hex[:12]
    password = secrets.token_urlsafe(32)
    env = dict(os.environ)
    env["NEO4J_AUTH"] = "neo4j/" + password
    env["NEO4J_PASSWORD"] = password
    run(["docker", "pull", IMAGE])
    digest = run([
        "docker", "image", "inspect", "--format",
        "{{index .RepoDigests 0}}", IMAGE,
    ])
    command = [
        "docker", "exec", "-i", "--env", "NEO4J_PASSWORD", name,
        "cypher-shell", "-u", "neo4j", "-d", "neo4j",
        "--format", "plain", "--non-interactive",
    ]

    def query(statement):
        return run(command, input=statement, env=env)

    def rows(statement):
        return list(csv.DictReader(io.StringIO(query(statement))))

    try:
        run([
            "docker", "run", "--detach", "--name", name,
            "--network", "none", "--memory", "2g", "--cpus", "2",
            "--env", "NEO4J_AUTH",
            "--env", "NEO4J_server_memory_heap_initial__size=256m",
            "--env", "NEO4J_server_memory_heap_max__size=512m",
            "--env", "NEO4J_server_memory_pagecache_size=128m",
            IMAGE,
        ], env=env)
        deadline = time.monotonic() + 180
        while True:
            try:
                query("RETURN 1 AS ready;")
                break
            except subprocess.CalledProcessError:
                if time.monotonic() > deadline:
                    raise RuntimeError("Neo4j startup timed out")
                time.sleep(3)
        empty = rows("MATCH (n) RETURN count(n) AS nodes;")
        if empty != [{"nodes": "0"}]:
            raise ValueError("review database must start empty")
        expected_nodes = [
            (n["id"], "Provenance" + n["label"], n["properties"])
            for n in sorted(graph["nodes"], key=lambda n: n["id"])
        ]
        expected_edges = sorted(
            (e["from"], e["type"], e["to"]) for e in graph["edges"]
        )
        # Second import must preserve every record without duplicate edges.
        for _ in range(2):
            query(cypher)
            actual_nodes = [
                (r["id"], r["label"], json.loads(r["record"]))
                for r in rows(
                    "MATCH (n) RETURN n.id AS id, labels(n)[0] AS label, "
                    "n.record_json AS record ORDER BY n.id;"
                )
            ]
            actual_edges = sorted(
                (r["source"], r["kind"], r["target"])
                for r in rows(
                    "MATCH (c)-[r]->(s) RETURN c.id AS source, "
                    "type(r) AS kind, s.id AS target;"
                )
            )
            if actual_nodes != expected_nodes:
                raise ValueError("Neo4j node metadata differs from snapshot")
            if actual_edges != expected_edges:
                raise ValueError("Neo4j relationships differ from snapshot")
        print(json.dumps({
            "result": "PASS", "kind": "logical_assertion_snapshot",
            "sourceCommit": run(["git", "rev-parse", "HEAD"], cwd=ROOT),
            "image": IMAGE, "imageDigest": digest,
            "nodes": len(actual_nodes), "edges": len(actual_edges),
            "imports": 2, "allMetadataCompared": True,
            "snapshotSha256": hashlib.sha256(graph_bytes).hexdigest(),
            "cypherSha256": hashlib.sha256(cypher.encode()).hexdigest(),
            "notIndependentEvidence": True,
        }, indent=2))
    finally:
        subprocess.run(
            ["docker", "rm", "--force", name],
            capture_output=True, check=False,
        )


if __name__ == "__main__":
    main()
