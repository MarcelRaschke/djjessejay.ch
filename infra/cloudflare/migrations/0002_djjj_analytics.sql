-- 0002_djjj_analytics.sql
-- D1: event-datamining (82704ee7-fcba-4564-98eb-9d8f9edc0609)
-- Zweck: datensparsame Besucher- und Medien-Analytics für djjessejay.ch
--        (Seitenaufrufe, SoundCloud-Plays, Blue Dimension, Press-Kit, Booking).
-- Grundsätze (revDSG/DSGVO):
--   - keine IP-Adressen, keine rohen User-Agents
--   - visitor_hash = HMAC(Tagessalz, IP+UA), rotiert täglich -> keine tagesübergreifende Verfolgung
--   - Referrer nur als Host, Pfade ohne Query-String
--   - Rohdaten 400 Tage, danach nur Tagesaggregate (Cron im Worker wdjjj)
-- Angewendet am 2026-11-24 05:13 UTC per D1-API; die Datei bleibt idempotent.
-- Die Legacy-Tabellen (events, event_types, daily_event_summary) bleiben unangetastet;
-- Entfernen erfolgt separat und manuell: docs/d1/0003_drop_legacy.sql.

-- D1 erzwingt Foreign Keys standardmässig; PRAGMA foreign_keys ist dort nicht erlaubt.

-- Katalog der erlaubten Event-Typen
CREATE TABLE IF NOT EXISTS ev_type (
  type        TEXT PRIMARY KEY,
  category    TEXT NOT NULL CHECK (category IN ('navigation','media','engagement','conversion','security')),
  description TEXT NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
) STRICT, WITHOUT ROWID;

INSERT OR IGNORE INTO ev_type (type, category, description) VALUES
  ('page_view',         'navigation', 'Seitenaufruf'),
  ('outbound_click',    'navigation', 'Klick auf externen Link (SoundCloud, Instagram, RA)'),
  ('sc_play',           'media',      'SoundCloud-Widget: Play gestartet'),
  ('sc_progress',       'media',      'SoundCloud-Widget: Fortschritt 25/50/75/100 %'),
  ('bdsn_listen',       'media',      'Blue Dimension Player: Hörsitzung'),
  ('mix_download',      'media',      'Mix- oder Stundenaufnahme heruntergeladen'),
  ('presskit_download', 'conversion', 'Press-Kit (PDF/ZIP) heruntergeladen'),
  ('booking_submit',    'conversion', 'Booking-Anfrage abgeschickt'),
  ('contact_submit',    'conversion', 'Kontaktformular abgeschickt'),
  ('turnstile_fail',    'security',   'Turnstile-Prüfung fehlgeschlagen');

-- Medienkatalog (Mixe, Tracks, Radio-Stunden)
CREATE TABLE IF NOT EXISTS media (
  media_id      TEXT PRIMARY KEY,                       -- Slug, z. B. 'bdsn-2026-11-20-h03'
  kind          TEXT NOT NULL CHECK (kind IN ('mix','track','radio_hour','video')),
  title         TEXT NOT NULL,
  source_url    TEXT,                                   -- SoundCloud/IPFS-URL
  ipfs_cid      TEXT,
  show_date     TEXT CHECK (show_date IS NULL OR show_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  show_hour     INTEGER CHECK (show_hour IS NULL OR show_hour BETWEEN 0 AND 23),
  duration_s    INTEGER CHECK (duration_s IS NULL OR duration_s >= 0),
  bpm           REAL    CHECK (bpm IS NULL OR bpm BETWEEN 40 AND 220),
  musical_key   TEXT,                                   -- Camelot, z. B. '8A'
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT, WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_media_show ON media (show_date, show_hour);

-- Rohereignisse
CREATE TABLE IF NOT EXISTS ev (
  id            TEXT PRIMARY KEY,                       -- ULID (zeitlich sortierbar)
  ts            INTEGER NOT NULL,                       -- Unix-Millisekunden, serverseitig gesetzt
  day           TEXT GENERATED ALWAYS AS (date(ts / 1000, 'unixepoch')) STORED,
  type          TEXT NOT NULL REFERENCES ev_type(type),
  visitor_hash  TEXT NOT NULL CHECK (length(visitor_hash) = 16),
  session_id    TEXT CHECK (session_id IS NULL OR length(session_id) <= 32),
  path          TEXT NOT NULL CHECK (length(path) <= 512 AND instr(path, '?') = 0),
  ref_host      TEXT CHECK (ref_host IS NULL OR length(ref_host) <= 253),
  utm_source    TEXT CHECK (utm_source   IS NULL OR length(utm_source)   <= 64),
  utm_medium    TEXT CHECK (utm_medium   IS NULL OR length(utm_medium)   <= 64),
  utm_campaign  TEXT CHECK (utm_campaign IS NULL OR length(utm_campaign) <= 64),
  country       TEXT CHECK (country IS NULL OR length(country) = 2),
  device        TEXT CHECK (device IN ('desktop','mobile','tablet','bot','unknown')),
  lang          TEXT CHECK (lang IS NULL OR length(lang) <= 8),
  media_id      TEXT REFERENCES media(media_id) ON DELETE SET NULL,
  value_ms      INTEGER CHECK (value_ms IS NULL OR value_ms >= 0),  -- Hördauer / Verweildauer
  props         TEXT CHECK (props IS NULL OR (json_valid(props) AND length(props) <= 2048))
) STRICT;

CREATE INDEX IF NOT EXISTS idx_ev_day_type ON ev (day, type);
CREATE INDEX IF NOT EXISTS idx_ev_media    ON ev (media_id, day) WHERE media_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ev_path     ON ev (path, day);
CREATE INDEX IF NOT EXISTS idx_ev_ts       ON ev (ts);

-- Tagesaggregate (bleiben nach Löschung der Rohdaten erhalten)
CREATE TABLE IF NOT EXISTS ev_daily (
  day           TEXT NOT NULL,
  type          TEXT NOT NULL REFERENCES ev_type(type),
  path          TEXT NOT NULL DEFAULT '',
  country       TEXT NOT NULL DEFAULT '',
  device        TEXT NOT NULL DEFAULT '',
  media_id      TEXT NOT NULL DEFAULT '',
  events        INTEGER NOT NULL DEFAULT 0,
  visitors      INTEGER NOT NULL DEFAULT 0,             -- Tagesunique (visitor_hash rotiert täglich)
  sessions      INTEGER NOT NULL DEFAULT 0,
  sum_value_ms  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, type, path, country, device, media_id)
) STRICT, WITHOUT ROWID;

-- Booking-Anfragen: Personendaten nur verschlüsselt (AES-GCM im Worker), mit Löschfrist
CREATE TABLE IF NOT EXISTS booking_request (
  id            TEXT PRIMARY KEY,                       -- ULID
  created_ts    INTEGER NOT NULL,
  event_date    TEXT CHECK (event_date IS NULL OR event_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  city          TEXT CHECK (city IS NULL OR length(city) <= 80),
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','replied','confirmed','declined','spam')),
  key_id        TEXT NOT NULL,                          -- Schlüsselversion für Rotation
  iv            BLOB NOT NULL CHECK (length(iv) = 12),
  payload_enc   BLOB NOT NULL,                          -- Name, E-Mail, Nachricht (verschlüsselt)
  delete_after  INTEGER NOT NULL                        -- Unix-Sekunden; Cron löscht danach
) STRICT;

CREATE INDEX IF NOT EXISTS idx_booking_status ON booking_request (status, created_ts);
CREATE INDEX IF NOT EXISTS idx_booking_delete ON booking_request (delete_after);

-- Schema-Version
CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT, WITHOUT ROWID;

INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', '0002'), ('applied_at', datetime('now'));
