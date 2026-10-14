# Datenbankplan — djjessejay.ch

## 1. Ziel und Kontext

Die Website ist ein Hybrid aus GitHub Pages (statisch) und einem Express-Backend
(`server.js`). Bislang sind alle Inhalte dateibasiert: YAML-Schema
(`archive/schema.yml`), JSON-Metadaten (`website/provenance.json`), JSONL-Survey
(`routes/djjj-survey.js`). Es existiert keine Datenbank.

Ziel: eine **eingebettete SQLite-Datenbank**, die das OSINT-Wissensgraph- und
Archiv-Modell aus `archive/schema.yml` und `AGENTS.md` abbildet, ohne eine neue
Server-Abhängigkeit einzuführen.

## 2. Technologie-Entscheidung

| Option | Bewertung |
| --- | --- |
| **SQLite via `node:sqlite` (gewählt)** | Kein neuer Prozess, keine Credentials, ACID, im Repo-Workflow reproduzierbar, Node >= 22 (Repo-Engine-Policy erfordert >= 24 auf dem Origin — erfüllt). |
| PostgreSQL/MySQL | Benötigt externen Dienst, Credentials, Geheimnis-Management — verstärkt Angriffsfläche ohne aktuellen Bedarf. |
| Weiter nur JSON/YAML | Keine referentielle Integrität, keine Zeit- und Statusabfragen, keine Indexierung. |

Begründung im Sinne von AGENTS.md (Priorität 1 Sicherheit, 6 minimale Änderung):
SQLite-Datei bleibt im Sandbox-/Server-Dateisystem, benötigt keine
Netzwerkports und keine Authentifizierung.

## 3. Schema-Design

Das Schema folgt direkt den Evidence-Regeln aus `AGENTS.md` und den Templates
aus `archive/schema.yml`:

### Kern-Tabellen

1. **`sources`** — Quellen mit Prioritätsklasse P0–P8 (`source_priority`).
2. **`archive_objects`** — Archiv-Objekte (`Set`, `RadioShow`, `Broadcast`,
   `Event`, `Venue`, `Flyer`, `Tracklist`, `Recording`, `PlatformProfile`,
   `Interview`, `PressReference`) mit Pflichtfeldern
   `status`, `confidence`, `observed_time`, `review_state`.
3. **`assertions`** — Wissensgraph-Claims mit `subject`, `predicate`,
   `object`, `value` und **getrennten** Feldern `valid_time_start`,
   `valid_time_end`, `valid_time_precision` sowie `observed_time`
   (Regel: valid_time ≠ observed_time, niemals zusammenlegen).
4. **`object_sources` / `assertion_sources`** — n:m-Verknüpfung Objekt/Claim →
   Quellen (ein Claim ohne Quelle ist ungültig).
5. **`survey_responses`** — persistente Ablage der djjj-Survey-Antworten
   (bisher JSONL) inkl. Anonymität (keine IP, keine Cookies).

### Integritäts-Regeln (Constraints)

- `status` ∈ (`unreviewed`, `possible`, `probable`, `supported`, `verified`,
  `contradicted`, `deprecated`) — CHECK-Constraint, damit kein generierter
  Text einen `verified`-Status erzeugen kann.
- `confidence` ∈ [0.0, 1.0] — CHECK-Constraint.
- `review_state` Pflichtfeld, Default `human_review_required`.
- Fremdschlüssel mit `ON DELETE RESTRICT` für Quellen-Verknüpfungen
  (Provenance-Metadaten dürfen nicht still verloren gehen — AGENTS.md:
  „Remove provenance metadata without replacing it“ ist verboten).
- Jedes `assertions`- und `archive_objects`-Tupel braucht ≥ 1 Quelle
  (wird initial über `object_sources`/`assertion_sources` geprüft, nicht als
  SQL-Constraint, da SQLite keine Subquery-CHECKs erlaubt).

### Zeitmodell

- `valid_time_*`: Zeitraum, für den der Claim gelten soll — DATETIME, NULL
  erlaubt (offene Intervalle), plus `precision` (`day|month|year`).
- `observed_time`: Zeitpunkt der Quellenerfassung/-prüfung — NOT NULL.
- Beide bleiben getrennte Spalten; keine Views oder Trigger führen sie zusammen.

## 4. Dateien

| Pfad | Zweck |
| --- | --- |
| `db/schema.sql` | Vollständiges DDL (idempotent, `IF NOT EXISTS`) |
| `scripts/db-init.mjs` | Erstellt `db.sqlite` (Pfad via `DB_PATH`), lädt Schema, Seed der `sources`/`assertions` aus `website/provenance.json` |
| `test/db-schema.test.mjs` | Prüft Schema-Integrität, Constraints, FK, Seed-Konsistenz |
| `docs/DATABASE_PLAN.md` | Dieses Dokument |

## 5. Sicherheit

- Datenbankdatei wird nicht im Repo committet (`.gitignore`: `db.sqlite`), da
  Survey-Antworten (DSG/revDSG) hineinschreiben können.
- Keine Secrets im Schema; `node:sqlite` ist eingebettet, kein Port, keine
  Netzwerkexposition.
- Schreibzugriffe erfolgen nur über geprüfte Routen (Rate-Limit, Honeypot,
  Sanitization wie in `routes/djjj-survey.js`).
- Zugriffsmodell: read-only für öffentliche Endpunkte; Schreiben nur durch
  administrative Skripte und geprüfte Formulare.

## 6. Migrationsstrategie

- Versioniert über `PRAGMA user_version` (Start: `1`).
- Jede Änderung am Schema erfolgt als neue Datei `db/migrations/000N_*.sql`
  plus Erhöhung von `user_version`; `scripts/db-init.mjs` spielt ausstehende
  Migrationen vorwärts ab (SQLite-Changelog, kein Down-Migrationspfad —
  Rollback = vorherige DB-Datei aus Backup).

## 7. Rollout & Rollback

1. `npm run db:init` erzeugt die DB lokal und auf dem Origin-Host.
2. `npm test` erweitert um `test/db-schema.test.mjs`.
3. Rollback: DB-Datei löschen — alle kanonischen Daten bleiben in
   `website/provenance.json`/`archive/` erhalten (DB ist abgeleitet, keine
   neue Source of Truth).

## 8. Restrisiken

- `node:sqlite` ist in Node 22 experimental (in Node 24 stabil); Warnung wird
  unterdrückt, kein Funktionsrisiko für die genutzte API.
- Die DB ist ein **abgeleitetes** Artefakt: generierte Inhalte bleiben
  Nicht-Evidenz; Befüllung nur aus versionierten Quell-Dateien.
