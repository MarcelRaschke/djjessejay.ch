# DJ Jesse Jay Control Center — FOSS Edition v0.1

This directory defines the self-hosted FOSS control-plane architecture for the DJ Jesse Jay backend.

## Principles

- Core operation must not depend on proprietary SaaS.
- GitHub remains a source/provenance input, not the operational database.
- PostgreSQL is the system of record for curated CMS, music, events, radio metadata, analytics aggregates and audit events.
- All external imports carry source URI, revision/hash, evidence class, fetch time and verification state.
- Unknown or unavailable live values remain `null` / `not_connected`; no fabricated listeners, schedules, releases, events or analytics.
- Mutations require authenticated, explicit user action and are auditable.

## Selected stack

- Web: current control-center UI, migration target React + Vite + TypeScript
- API: Fastify + TypeScript
- Database: PostgreSQL 17
- ORM/migrations: Drizzle ORM / Drizzle Kit
- Identity/RBAC: Keycloak
- Object storage: SeaweedFS
- Analytics: Umami
- Radio: AzuraCast + Icecast, gated until verified metadata exists
- Reverse proxy/TLS: Caddy
- Packaging: Docker Compose
- Git forge: GitHub initially; Forgejo-compatible boundary planned

## Implemented API slice

The FOSS API lives in `api/` and owns the compatibility namespace `/api/control-center/*` when traffic enters through Caddy.

| Route | Source | Fabrication policy |
| --- | --- | --- |
| `GET /api/control-center/health` | PostgreSQL connection | returns degraded on DB failure |
| `GET /api/control-center/profile` | mounted `artist-profile.json` | fails closed when missing |
| `GET /api/control-center/sources` | `source_records` | no synthetic source state |
| `GET /api/control-center/visuals` | `visual_assets` | curated external references only |
| `GET /api/control-center/analytics` | `analytics_daily` | empty/not-connected when no real rows exist |
| `GET /api/control-center/radio` | canonical identity + verified `radio_entities` | only `verified` live rows returned |
| `GET /api/control-center/music` | `releases` | curated database rows only |
| `GET /api/control-center/events` | `events` | curated database rows only |

The original Express route module is retained temporarily as a rollback/legacy path. In the FOSS Compose topology, Caddy routes `/api/control-center/*` directly to `control-center-api:3100`, so the UI keeps the same URL contract while runtime ownership moves to Fastify.

## Layout

```text
control-center/
  foss/
    api/
      src/
        db/
        routes/
        scripts/
      Dockerfile
      package.json
      drizzle.config.ts
    db/
      schema.sql
    Caddyfile
    docker-compose.yml
    .env.example
    README.md
```

## Local bring-up

1. Copy `.env.example` to `.env` and replace every `CHANGE_ME` value.
2. Start the FOSS API path: `docker compose up -d postgres control-center-api caddy`.
3. Verify `http://localhost:8088/api/control-center/health`.
4. Run the explicit bootstrap importer only when intended: `docker compose run --rm control-center-api node dist/scripts/bootstrap-import.js`.
5. Start Keycloak, SeaweedFS and Umami as needed with `docker compose up -d keycloak seaweed-master seaweed-volume umami-db umami`.
6. Pin container image digests before production deployment.

For an existing PostgreSQL volume, apply `db/schema.sql` explicitly; Docker's `/docker-entrypoint-initdb.d` runs only when the database volume is first initialized.

## Database workflow

From `control-center/foss/api/`:

```bash
npm install
npm run typecheck
npm run build
npm run db:generate
npm run db:migrate
```

The SQL bootstrap schema remains the deployment baseline while the Drizzle schema is the typed application model. Schema changes should be represented in both until the migration cutover is complete.

## Data authority

`Evidence -> Staging -> Human review -> Curated PostgreSQL -> Public/API projection`

Generated output is never evidence by itself.
