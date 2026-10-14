#!/usr/bin/env node
'use strict';

// Initialize the SQLite database for djjessejay.ch.
// Derived artifact: seeds sources and assertions from website/provenance.json.
// Usage: node scripts/db-init.mjs [--db PATH]
// Env: DB_PATH (default: ./db.sqlite), NODE_NO_SQLITE_WARNING=1 recommended.

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dbArgIndex = args.indexOf('--db');
const dbPath = dbArgIndex !== -1 && args[dbArgIndex + 1]
  ? resolve(args[dbArgIndex + 1])
  : process.env.DB_PATH || resolve(ROOT, 'db.sqlite');
const schemaPath = resolve(ROOT, 'db', 'schema.sql');

function main() {
  const db = new DatabaseSync(dbPath);
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec(readFileSync(schemaPath, 'utf8'));

    const provenance = JSON.parse(
      readFileSync(resolve(ROOT, 'website', 'provenance.json'), 'utf8')
    );

    const insertSource = db.prepare(
      `INSERT INTO sources (id, source_class, title, url, observed_time, review_state)
       VALUES (?, ?, ?, NULL, ?, 'seeded-from-ledger')
       ON CONFLICT(id) DO NOTHING`
    );
    const insertAssertion = db.prepare(
      `INSERT INTO assertions (id, subject, predicate, object, value,
         valid_time_start, valid_time_end, valid_time_precision,
         status, confidence, observed_time, review_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`
    );
    const insertAssertionSource = db.prepare(
      `INSERT INTO assertion_sources (assertion_id, source_id) VALUES (?, ?)
       ON CONFLICT DO NOTHING`
    );

    db.exec('BEGIN');
    try {
      for (const claim of provenance.claims || []) {
        const claimSourceIds = (claim.sources || []).map((s) => `source:${s}`);
        const vt = claim.valid_time || {};
        insertAssertion.run(
          claim.id,
          claim.subject || 'artist:dj-jesse-jay',
          claim.predicate || null,
          claim.object || null,
          claim.value ?? null,
          vt.start || null,
          vt.end || null,
          vt.precision && vt.precision !== 'unknown' ? vt.precision : null,
          claim.status || 'unreviewed',
          Number(claim.confidence) || 0.0,
          claim.observed_time || provenance.generatedAt || new Date().toISOString(),
          claim.review_state || 'human_review_required'
        );
        for (const sid of claimSourceIds) {
          insertSource.run(
            sid,
            claim.sourceClass || 'P8',
            sid.replace(/^source:/, ''),
            claim.observed_time || provenance.generatedAt || new Date().toISOString()
          );
          insertAssertionSource.run(claim.id, sid);
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const counts = {
      sources: db.prepare('SELECT COUNT(*) AS n FROM sources').get().n,
      assertions: db.prepare('SELECT COUNT(*) AS n FROM assertions').get().n,
      assertionSources: db.prepare('SELECT COUNT(*) AS n FROM assertion_sources').get().n,
      archiveObjects: db.prepare('SELECT COUNT(*) AS n FROM archive_objects').get().n
    };
    console.log(`db-init: ${dbPath}`);
    console.log(`  user_version: ${db.prepare('PRAGMA user_version').get().user_version}`);
    console.log(`  sources: ${counts.sources}, assertions: ${counts.assertions}, ` +
      `assertion_sources: ${counts.assertionSources}, archive_objects: ${counts.archiveObjects}`);
  } finally {
    db.close();
  }
}

main();
