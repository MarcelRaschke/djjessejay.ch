#!/usr/bin/env python3
"""Import the v9 logical snapshot in an isolated, disposable Neo4j."""
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
IMAGE = "neo4j:2026.10.1"


def run(args, **kwargs):
    return subprocess.run(
        args, check=True, capture_output=True, text=True, **kwargs,
    ).stdout.strip()


def counts(query, statement):
    """Read only integer columns; Cypher plain output is not RFC 4180 CSV."""
    lines = query(statement).strip().splitlines()
    if not lines or lines[0] != "matches":
        raise ValueError("unexpected count result header")
    values = lines[1:]
    if not values or any(not v.isdecimal() for v in values):
        raise ValueError("invalid count result")
    return [int(v) for v in values]


def verify_snapshot(query, graph):
    """Compare each full JSON record in Neo4j, without parsing quoted CSV."""
    def literal(value):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))

    nodes = graph["nodes"]
    edges = graph["edges"]
    node_clauses = []
    for node in nodes:
        label = "Provenance" + node["label"]
        if label not in {"ProvenanceClaim", "ProvenanceSource"}:
            raise ValueError("unexpected snapshot label")
        node_clauses.append(
            "MATCH (n:" + label + ") WHERE n.id = " + literal(node["id"])
            + " AND n.record_json = " + literal(literal(node["properties"]))
            + " AND labels(n) = [" + literal(label) + "]"
            + " RETURN count(n) AS matches"
        )
    edge_clauses = []
    for edge in edges:
        if edge["type"] != "CITES":
            raise ValueError("unexpected relationship type")
        edge_clauses.append(
            "MATCH (c:ProvenanceClaim)-[r:CITES]->(s:ProvenanceSource)"
            + " WHERE c.id = " + literal(edge["from"])
            + " AND s.id = " + literal(edge["to"])
            + " AND keys(r) = [] RETURN count(r) AS matches"
        )
    if counts(query, "MATCH (n) RETURN count(n) AS matches;") != [len(nodes)]:
        raise ValueError("Neo4j node inventory differs from snapshot")
    if counts(
        query, "MATCH ()-[r]->() RETURN count(r) AS matches;",
    ) != [len(edges)]:
        raise ValueError("Neo4j edge inventory differs from snapshot")
    if counts(query, " UNION ALL ".join(node_clauses) + ";") != [1] * len(
        nodes,
    ):
        raise ValueError("Neo4j node metadata differs from snapshot")
    if counts(query, " UNION ALL ".join(edge_clauses) + ";") != [1] * len(
        edges,
    ):
        raise ValueError("Neo4j relationships differ from snapshot")


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
        "cypher-shell", "-a", "bolt://localhost:7687",
        "-u", "neo4j", "-d", "neo4j",
        "--format", "plain", "--non-interactive",
    ]

    def query(statement):
        return run(command, input=statement, env=env)

    try:
        run([
            "docker", "run", "--detach", "--name", name,
            "--network", "none", "--hostname", "localhost",
            "--memory", "2g", "--cpus", "2",
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
            except subprocess.CalledProcessError as error:
                running = run([
                    "docker", "inspect", "--format",
                    "{{.State.Running}}", name,
                ])
                if running != "true" or time.monotonic() > deadline:
                    raise RuntimeError(
                        "Neo4j unavailable: " + error.stderr.replace(
                            password, "[REDACTED]",
                        )
                    ) from None
                time.sleep(3)
        if counts(query, "MATCH (n) RETURN count(n) AS matches;") != [0]:
            raise ValueError("review database must start empty")
        # Second import must preserve every record without duplicate edges.
        for _ in range(2):
            query(cypher)
            verify_snapshot(query, graph)
        print(json.dumps({
            "result": "PASS", "kind": "logical_assertion_snapshot",
            "sourceCommit": run(["git", "rev-parse", "HEAD"], cwd=ROOT),
            "image": IMAGE, "imageDigest": digest,
            "nodes": len(graph["nodes"]), "edges": len(graph["edges"]),
            "imports": 2, "allMetadataCompared": True,
            "snapshotSha256": hashlib.sha256(graph_bytes).hexdigest(),
            "cypherSha256": hashlib.sha256(cypher.encode()).hexdigest(),
            "notIndependentEvidence": True,
        }, indent=2))
    except Exception:
        logs = subprocess.run(
            ["docker", "logs", "--tail", "80", name],
            capture_output=True, text=True, check=False,
        )
        print((logs.stdout + logs.stderr).replace(password, "[REDACTED]"))
        print(run([
            "docker", "inspect", "--format",
            "{{json .State}}", name,
        ]).replace(password, "[REDACTED]"))
        with tempfile.TemporaryDirectory(prefix="v9-neo4j-log-") as directory:
            subprocess.run(
                ["docker", "cp", name + ":/logs", directory],
                capture_output=True, check=False,
            )
            debug = Path(directory) / "logs/debug.log"
            if debug.is_file():
                tail = debug.read_text(encoding="utf-8").splitlines()[-100:]
                print("\n".join(tail).replace(password, "[REDACTED]"))
        raise
    finally:
        subprocess.run(
            ["docker", "rm", "--force", name],
            capture_output=True, check=False,
        )


if __name__ == "__main__":
    main()
