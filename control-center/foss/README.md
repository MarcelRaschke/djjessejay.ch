# DJ Jesse Jay Control Center — FOSS Edition v0.1

This directory defines the self-hosted FOSS control-plane architecture for the DJ Jesse Jay backend.

## Principles

- Core operation must not depend on proprietary SaaS.
- GitHub remains a source/provenance input, not the operational database.
- PostgreSQL is the system of record for curated CMS, music, events, radio metadata, analytics aggregates and audit events.
- Drizzle schema + checked-in Drizzle migrations are the only database schema authority.
- All external imports carry source URI, revision/hash, evidence class, fetch time and verification state.
- External evidence enters staging before any curated/public mutation.
- Unknown or unavailable live values remain `null` / `not_connected`; no fabricated listeners, schedules, releases, events or analytics.
- Mutations require authenticated, explicit user action, caller-supplied `operationId`, and an audit record.

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

## Database authority

`api/src/db/schema.ts` is the typed schema authority. Migration SQL exists only under `api/drizzle/` and is applied by `drizzle-kit migrate`.

The former hand-maintained `db/schema.sql` bootstrap was removed. Docker Compose runs the one-shot `control-center-migrate` service before the Fastify API starts. CI provisions a clean PostgreSQL 17 instance and applies the checked-in Drizzle migration set.

Schema workflow:

```bash
cd control-center/foss/api
npm install
# edit src/db/schema.ts
npm run db:generate
# review generated SQL under drizzle/
npm run db:migrate
npm run typecheck
npm run build
```

Do not add a second hand-written schema bootstrap outside `api/drizzle/`.

## Authentication and authorization

`/api/control-center/health` stays unauthenticated for infrastructure probes. All other read routes require a valid Keycloak access token with one of `viewer`, `editor`, or `admin`. Normal create/update/import/review commands require `editor` or `admin`; destructive deletes and publication to `published` require `admin`.

Tokens are verified server-side against the configured issuer, audience and Keycloak JWKS endpoint. The API does not trust browser-supplied role headers.

The bootstrap realm in `keycloak/realm-export.json` defines the three realm roles and the `djjessejay-control-center` client. No application users or default passwords are committed.

## Provenance-first external staging

SoundCloud and Resident Advisor now have explicit read-only import commands. These adapters never write directly to `releases`, `events`, CMS or public output.

The pipeline is:

```text
External URL
  -> allowlisted HTTPS fetch
  -> response-size/time limits
  -> content hash + source revision
  -> source_records
  -> import_staging (pending)
  -> explicit human review
  -> approved/rejected staging state
  -> no curated mutation yet
```

SoundCloud uses the public oEmbed representation for operator-supplied `soundcloud.com` URLs and marks that evidence as P2 first-party external publication. Resident Advisor fetches only allowlisted RA hosts, extracts JSON-LD when present, does not retain raw HTML, and marks the resulting evidence P3.

The adapters reject non-HTTPS and non-allowlisted hosts, disallow credential-bearing URLs, reject redirects, impose a 10-second timeout and cap upstream bodies at 2 MiB. This keeps the importer from becoming a generic SSRF/fetch proxy.

Approving a staging record only records a review decision; it does not promote data into curated tables. Promotion is deliberately deferred to a separate audited command slice.

## Implemented API surface

| Route | Access | Data authority |
| --- | --- | --- |
| `GET /api/control-center/health` | public | PostgreSQL probe |
| `GET /api/control-center/profile` | viewer+ | mounted canonical profile |
| `GET /api/control-center/sources` | viewer+ | `source_records` |
| `GET /api/control-center/staging` | viewer+ | `import_staging` |
| `GET /api/control-center/cms` | viewer+ | `cms_pages` |
| `GET /api/control-center/music` | viewer+ | `releases` |
| `GET /api/control-center/events` | viewer+ | `events` |
| `GET /api/control-center/visuals` | viewer+ | `visual_assets` |
| `GET /api/control-center/analytics` | viewer+ | `analytics_daily` |
| `GET /api/control-center/radio` | viewer+ | canonical identity + verified `radio_entities` |
| `POST /api/control-center/commands/imports/soundcloud` | editor/admin | SoundCloud evidence -> staging + audit |
| `POST /api/control-center/commands/imports/resident-advisor` | editor/admin | RA evidence -> staging + audit |
| `POST /api/control-center/commands/staging/:id/review` | editor/admin | staging review only; no curated write |
| `POST /api/control-center/commands/sources/:id/verification` | editor/admin | verification + audit |
| `POST /api/control-center/commands/cms` | editor/admin | create CMS page + audit |
| `PATCH /api/control-center/commands/cms/:id` | editor/admin | update CMS page + audit |
| `DELETE /api/control-center/commands/cms/:id` | admin | delete CMS page + audit |
| `POST /api/control-center/commands/releases` | editor/admin | create release + audit |
| `PATCH /api/control-center/commands/releases/:id` | editor/admin | update release + audit |
| `DELETE /api/control-center/commands/releases/:id` | admin | delete release + audit |
| `POST /api/control-center/commands/events` | editor/admin | create event + audit |
| `PATCH /api/control-center/commands/events/:id` | editor/admin | update event + audit |
| `DELETE /api/control-center/commands/events/:id` | admin | delete event + audit |

Every write requires a UUID `operationId`. `audit_log.operation_id` is unique, providing database-enforced replay protection in addition to the API pre-check. Mutation and audit append occur in the same PostgreSQL transaction. Audit rows record actor subject, action, effect, resource, before-state and after-state.

Setting `status: "published"` requires `admin`. Editors can create and maintain `draft` / `review` content but cannot silently publish it. Deletes are also admin-only.

## Migration boundary

The original Express source module is retained temporarily as a rollback/legacy path. In the FOSS Compose topology, Caddy routes `/api/control-center/*` directly to `control-center-api:3100`.

Umami and AzuraCast adapters remain intentionally unimplemented until their verified endpoints/configuration are available. Their data must follow the same provenance/source-record boundary rather than bypassing staging or verification.

## Local bring-up

1. Copy `.env.example` to `.env` and replace every `CHANGE_ME` value.
2. Start `postgres`, `keycloak`, `control-center-migrate`, `control-center-api` and `caddy` with Docker Compose.
3. The API starts only after the migration service exits successfully.
4. Open Keycloak on `http://localhost:8080`, create a user and assign `viewer`, `editor`, or `admin` as appropriate.
5. Obtain a normal OIDC access token for the `djjessejay-control-center` client.
6. Verify `http://localhost:8088/api/control-center/health` without a token, then call protected routes with `Authorization: Bearer <token>`.
7. Run external importers only as explicit operator actions with a new `operationId`.
8. Review staged evidence explicitly before any future promotion command is allowed.
9. Pin container image digests before production deployment.

## Data authority

`Evidence -> Staging -> Human review -> Curated PostgreSQL -> Public/API projection`

Generated output is never evidence by itself.
