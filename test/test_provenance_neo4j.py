"""Regression tests for the Neo4j count-only verification protocol."""
import importlib.util
import json
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts"
SPEC = importlib.util.spec_from_file_location(
    "snapshot_check", SCRIPT / "check-provenance-neo4j.py",
)
CHECK = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECK)


class SnapshotProtocolTests(unittest.TestCase):
    def setUp(self):
        self.graph = {
            "nodes": [
                {"id": "claim:x", "label": "Claim",
                 "properties": {"text": 'Zürich, "club" \\ archive'}},
                {"id": "source:x", "label": "Source",
                 "properties": {"url": "https://example.org"}},
            ],
            "edges": [
                {"from": "claim:x", "to": "source:x", "type": "CITES"},
            ],
        }

    def query(self, responses):
        answers = iter(responses)
        return lambda statement: "matches\n" + next(answers)

    def test_complete_snapshot(self):
        CHECK.verify_snapshot(self.query(["2", "1", "1\n1", "1"]), self.graph)

    def test_metadata_mismatch_rejected(self):
        with self.assertRaisesRegex(ValueError, "metadata"):
            CHECK.verify_snapshot(
                self.query(["2", "1", "1\n0"]), self.graph,
            )

    def test_extra_node_rejected(self):
        with self.assertRaisesRegex(ValueError, "inventory"):
            CHECK.verify_snapshot(self.query(["3"]), self.graph)

    def test_duplicate_edge_rejected(self):
        with self.assertRaisesRegex(ValueError, "relationships"):
            CHECK.verify_snapshot(
                self.query(["2", "1", "1\n1", "2"]), self.graph,
            )

    def test_plain_csv_is_not_accepted_as_a_count(self):
        with self.assertRaises(ValueError):
            CHECK.counts(lambda _: 'id, label\n"a", "Claim"', "unused")

    def test_record_escaping_preserved(self):
        statements = []
        answers = iter(["2", "1", "1\n1", "1"])

        def query(statement):
            statements.append(statement)
            return "matches\n" + next(answers)

        CHECK.verify_snapshot(query, self.graph)
        value = json.dumps(
            self.graph["nodes"][0]["properties"],
            ensure_ascii=False, separators=(",", ":"),
        )
        self.assertIn(json.dumps(value, ensure_ascii=False), statements[2])


if __name__ == "__main__":
    unittest.main()
