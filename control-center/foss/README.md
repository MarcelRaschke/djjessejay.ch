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

- Web: React + Vite + TypeScript
- API: Fastify + TypeScript
- Database: PostgreSQL
- ORM/migrations: Drizzle ORM
- Identity/RBAC: Keycloak
- Object storage: SeaweedFS
- Analytics: Umami
- Radio: AzuraCast + Icecast
- Reverse proxy/TLS: Caddy
- Packaging: Docker Compose
- Git forge: GitHub initially; Forgejo-compatible boundary planned

## Layout

```text
control-center/
  foss/
    api/
    db/
    docker-compose.yml
    .env.example
    README.md
  web/                    # migration target for current UI
  adapters/               # future source adapters
  provenance/             # evidence receipts / sync metadata
```

The current `control-center/` vanilla UI and read-only source routes remain intact during migration. This prevents a big-bang rewrite and gives the FOSS API a stable compatibility boundary.

## Local bring-up

1. Copy `.env.example` to `.env`.
2. Replace all `CHANGE_ME` values.
3. Pin container image digests before production deployment.
4. Run `docker compose up -d postgres keycloak seaweedfs umami-db umami caddy`.
5. Add AzuraCast/Icecast only after the verified Blue Dimension stream endpoint is ready.

## Data authority

`Evidence -> Staging -> Human review -> Curated PostgreSQL -> Public/API projection`

Generated output is never evidence by itself.
