-- djjessejay.ch — SQLite schema v1
-- Derived artifact: canonical data lives in archive/ and website/.
-- Evidence rules per AGENTS.md: valid_time and observed_time stay separate;
-- no generative path may produce status='verified'.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id            TEXT PRIMARY KEY,              -- e.g. 'source:radio-lora-website'
  source_class  TEXT NOT NULL CHECK (source_class IN
                  ('P0','P1','P2','P3','P4','P5','P6','P7','P8')),
  title         TEXT NOT NULL,
  url           TEXT,
  archive_url   TEXT,
  citation      TEXT,
  observed_time TEXT NOT NULL,                 -- ISO-8601, capture/review time
  review_state  TEXT NOT NULL DEFAULT 'human_review_required',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS archive_objects (
  id             TEXT PRIMARY KEY,             -- e.g. 'set:1998-05-30-galaxy'
  type           TEXT NOT NULL CHECK (type IN
                   ('Set','RadioShow','Broadcast','Event','Venue','Flyer',
                    'Tracklist','Recording','PlatformProfile','Interview',
                    'PressReference')),
  title          TEXT NOT NULL,
  slug           TEXT UNIQUE,
  canonical_url  TEXT,
  valid_time_start TEXT,                       -- claim time range (nullable = open)
  valid_time_end   TEXT,
  valid_time_precision TEXT CHECK (valid_time_precision IN
                   ('day','month','year')) ,
  status         TEXT NOT NULL DEFAULT 'unreviewed' CHECK (status IN
                   ('unreviewed','possible','probable','supported',
                    'verified','contradicted','deprecated')),
  confidence     REAL NOT NULL DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  observed_time  TEXT NOT NULL,
  review_state   TEXT NOT NULL DEFAULT 'human_review_required',
  metadata_json  TEXT                          -- type-specific extras (JSON)
);

CREATE TABLE IF NOT EXISTS assertions (
  id                    TEXT PRIMARY KEY,      -- e.g. 'claim:artist-name'
  subject               TEXT NOT NULL,
  predicate             TEXT NOT NULL,
  object                TEXT,
  value                 TEXT,
  valid_time_start      TEXT,
  valid_time_end        TEXT,
  valid_time_precision  TEXT CHECK (valid_time_precision IN ('day','month','year')),
  status                TEXT NOT NULL DEFAULT 'unreviewed' CHECK (status IN
                        ('unreviewed','possible','probable','supported',
                         'verified','contradicted','deprecated')),
  confidence            REAL NOT NULL DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  observed_time         TEXT NOT NULL,
  review_state          TEXT NOT NULL DEFAULT 'human_review_required'
);

-- n:m links: every claim/archive object must trace to at least one source.
CREATE TABLE IF NOT EXISTS object_sources (
  object_id TEXT NOT NULL REFERENCES archive_objects(id) ON DELETE RESTRICT,
  source_id TEXT NOT NULL REFERENCES sources(id)        ON DELETE RESTRICT,
  PRIMARY KEY (object_id, source_id)
);

CREATE TABLE IF NOT EXISTS assertion_sources (
  assertion_id TEXT NOT NULL REFERENCES assertions(id) ON DELETE RESTRICT,
  source_id    TEXT NOT NULL REFERENCES sources(id)     ON DELETE RESTRICT,
  PRIMARY KEY (assertion_id, source_id)
);

-- djjjcoin survey responses (migrated from JSONL storage).
-- Anonymous by design: no cookies, no IP, no tracking.
CREATE TABLE IF NOT EXISTS survey_responses (
  id           TEXT PRIMARY KEY,
  received_at  TEXT NOT NULL,
  answers_json TEXT NOT NULL,                  -- sanitized payload (q1..q10)
  email        TEXT                            -- optional q10 invitation address; deletable on request
);

CREATE INDEX IF NOT EXISTS idx_objects_type        ON archive_objects(type);
CREATE INDEX IF NOT EXISTS idx_objects_status      ON archive_objects(status);
CREATE INDEX IF NOT EXISTS idx_objects_valid_time  ON archive_objects(valid_time_start, valid_time_end);
CREATE INDEX IF NOT EXISTS idx_assertions_subject  ON assertions(subject, predicate);
CREATE INDEX IF NOT EXISTS idx_assertions_status   ON assertions(status);
CREATE INDEX IF NOT EXISTS idx_survey_received_at  ON survey_responses(received_at);

PRAGMA user_version = 1;
