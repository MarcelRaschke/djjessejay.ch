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
- Identity/RBAC: Keycloak + JOSE JWT verification
- Object storage: SeaweedFS
- Analytics: Umami
- Radio: AzuraCast + Icecast, gated until verified metadata exists
- Reverse proxy/TLS: Caddy
- Packaging: Docker Compose
- Git forge: GitHub initially; Forgejo-compatible boundary planned

## Authentication and authorization

`/api/control-center/health` stays unauthenticated for infrastructure probes. All other read routes require a valid Keycloak access token with one of `viewer`, `editor`, or `admin`. Mutation commands require `editor` or `admin`.

Tokens are verified server-side against the configured issuer, audience and Keycloak JWKS endpoint. The API does not trust browser-supplied role headers.

The bootstrap realm in `keycloak/realm-export.json` defines the three realm roles and the `djjessejay-control-center` client. No application users or default passwords are committed.

## Implemented API slice

The FOSS API lives in `api/` and owns the compatibility namespace `/api/control-center/*` when traffic enters through Caddy.

| Route | Source | Access / policy |
| --- | --- | --- |
| `GET /api/control-center/health` | PostgreSQL connection | public probe; degraded on DB failure |
| `GET /api/control-center/profile` | mounted `artist-profile.json` | viewer+; fails closed when missing |
| `GET /api/control-center/sources` | `source_records` | viewer+; no synthetic source state |
| `GET /api/control-center/visuals` | `visual_assets` | viewer+; curated references only |
| `GET /api/control-center/analytics` | `analytics_daily` | viewer+; empty when no real rows exist |
| `GET /api/control-center/radio` | canonical identity + verified `radio_entities` | viewer+; only verified live rows |
| `GET /api/control-center/music` | `releases` | viewer+; curated rows only |
| `GET /api/control-center/events` | `events` | viewer+; curated rows only |
| `POST /api/control-center/commands/sources/:id/verification` | `source_records` + `audit_log` | editor/admin; explicit `operationId`; transactional audit |

The verification command rejects reused `operationId` values, validates UUIDs and enum values, performs the source update and audit-log append in one PostgreSQL transaction, and records before/after state plus actor subject.

The original Express route module is retained temporarily as a rollback/legacy path. In the FOSS Compose topology, Caddy routes `/api/control-center/*` directly to `control-center-api:3100`.

## Local bring-up

1. Copy `.env.example` to `.env` and replace every `CHANGE_ME` value.
2. Start `postgres`, `keycloak`, `control-center-api` and `caddy` with Docker Compose.
3. Open Keycloak on `http://localhost:8080`, create a user and assign `viewer`, `editor`, or `admin` as appropriate.
4. Obtain a normal OIDC access token for the `djjessejay-control-center` client.
5. Verify `http://localhost:8088/api/control-center/health` without a token, then call protected routes with `Authorization: Bearer <token>`.
6. Run the bootstrap importer only as an explicit operator action.
7. Pin container image digests before production deployment.

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
