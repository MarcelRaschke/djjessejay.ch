-- 0003_drop_legacy.sql
-- Entfernt die generischen E-Commerce-Vorlagentabellen aus event-datamining.
-- Stand 2026-11-24: events enthält nur 5 Beispielzeilen (evt_001..evt_005, user_123/user_456,
-- "laptop"-Kauf), daily_event_summary und certs sind leer.
-- NICHT RÜCKGÄNGIG ZU MACHEN. Vorher sichern:
--   wrangler d1 export event-datamining --remote --output=backup-pre-0003.sql
-- certs bleibt erhalten, falls ein CT-Log-Monitor darauf schreibt.

DROP INDEX IF EXISTS idx_events_type_date;
DROP INDEX IF EXISTS idx_events_user;
DROP INDEX IF EXISTS idx_events_session;
DROP INDEX IF EXISTS idx_events_category;
DROP INDEX IF EXISTS idx_events_country;
DROP INDEX IF EXISTS idx_events_conversion;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS daily_event_summary;
DROP TABLE IF EXISTS event_types;

INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', '0003'), ('applied_at', datetime('now'));
