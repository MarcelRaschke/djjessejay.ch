'use strict';

// DB-SCHEMA: schema integrity, constraints, foreign keys, seed consistency.

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = readFileSync(resolve(ROOT, 'db', 'schema.sql'), 'utf8');

let tmpDir;
function freshDb() {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = mkdtempSync(resolve(tmpdir(), 'djjj-db-'));
  const db = new DatabaseSync(resolve(tmpDir, 'test.sqlite'));
  db.exec(SCHEMA);
  return db;
}

test.after(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

test('DB-SCHEMA-01: schema creates all tables, indexes and version', () => {
  const db = freshDb();
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).all().map((r) => r.name);
  for (const t of ['sources', 'archive_objects', 'assertions',
    'object_sources', 'assertion_sources', 'survey_responses', 'schema_meta']) {
    assert.ok(tables.includes(t), `missing table ${t}`);
  }
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
  db.close();
});

test('DB-SCHEMA-02: invalid status and confidence are rejected', () => {
  const db = freshDb();
  assert.throws(() => db.prepare(
    "INSERT INTO assertions (id, subject, predicate, observed_time, status) " +
    "VALUES ('x','s','p','2026-01-01','made-up-status')"
  ).run());
  assert.throws(() => db.prepare(
    "INSERT INTO assertions (id, subject, predicate, observed_time, confidence) " +
    "VALUES ('x','s','p','2026-01-01',1.5)"
  ).run());
  assert.throws(() => db.prepare(
    "INSERT INTO assertions (id, subject, predicate, observed_time, confidence) " +
    "VALUES ('x','s','p','2026-01-01',-0.1)"
  ).run());
  db.close();
});

test('DB-SCHEMA-03: archive object type constrained to schema.yml object types', () => {
  const db = freshDb();
  assert.throws(() => db.prepare(
    "INSERT INTO archive_objects (id, type, title, observed_time) " +
    "VALUES ('x','BlogPost','t','2026-01-01')"
  ).run());
  db.prepare(
    "INSERT INTO archive_objects (id, type, title, observed_time) " +
    "VALUES ('set:1998-05-30-galaxy','Set','Galaxy 1998','2026-01-01')"
  ).run();
  db.close();
});

test('DB-SCHEMA-04: foreign keys enforce provenance-source integrity', () => {
  const db = freshDb();
  db.exec('PRAGMA foreign_keys = ON;');
  db.prepare(
    "INSERT INTO archive_objects (id, type, title, observed_time) " +
    "VALUES ('set:1','Set','S','2026-01-01')"
  ).run();
  assert.throws(() => db.prepare(
    "INSERT INTO object_sources (object_id, source_id) VALUES ('set:1','source:missing')"
  ).run());
  assert.throws(() => db.prepare(
    "INSERT INTO object_sources (object_id, source_id) VALUES ('set:missing','source:missing')"
  ).run());
  db.close();
});

test('DB-SCHEMA-05: observed_time is mandatory, valid_time stays separate', () => {
  const db = freshDb();
  assert.throws(() => db.prepare(
    "INSERT INTO assertions (id, subject, predicate) VALUES ('x','s','p')"
  ).run());
  db.prepare(
    "INSERT INTO assertions (id, subject, predicate, valid_time_start, valid_time_end, " +
    "valid_time_precision, observed_time) " +
    "VALUES ('c:1','artist:dj-jesse-jay','ACTIVE_SINCE','1997-01-01',NULL,'year','2026-08-23')"
  ).run();
  const row = db.prepare(
    'SELECT valid_time_start, valid_time_end, observed_time FROM assertions WHERE id = ?'
  ).get('c:1');
  assert.equal(row.valid_time_start, '1997-01-01');
  assert.equal(row.valid_time_end, null);
  assert.equal(row.observed_time, '2026-08-23');
  db.close();
});

test('DB-SCHEMA-06: db-init seeds all ledger claims with sources', () => {
  const dbPath = resolve(tmpdir(), `djjj-db-seed-${process.pid}-${Date.now()}.sqlite`);
  execFileSync(process.execPath, ['scripts/db-init.mjs', '--db', dbPath],
    { cwd: ROOT, env: { ...process.env, NODE_NO_SQLITE_WARNINGS: '1' } });
  const db = new DatabaseSync(dbPath);
  try {
    const claims = JSON.parse(readFileSync(
      resolve(ROOT, 'website', 'provenance.json'), 'utf8')).claims || [];
    const n = db.prepare('SELECT COUNT(*) AS n FROM assertions').get().n;
    assert.equal(n, claims.length);
    const unlinked = db.prepare(
      `SELECT a.id FROM assertions a
       LEFT JOIN assertion_sources l ON l.assertion_id = a.id
       WHERE l.assertion_id IS NULL`
    ).all();
    assert.deepEqual(unlinked, [], 'every assertion must trace to >= 1 source');
    const seeded = db.prepare(
      "SELECT COUNT(*) AS n FROM sources WHERE review_state = 'seeded-from-ledger'"
    ).get().n;
    assert.ok(seeded > 0);
  } finally {
    db.close();
    rmSync(dbPath, { force: true });
  }
});
