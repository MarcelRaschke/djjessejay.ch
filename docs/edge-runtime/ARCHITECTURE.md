# EDGE-RUNTIME v1.0

## Status

- Architecture: SEALED
- Implementation: ACTIVE
- P0 verification: REQUIRED
- Deployment: HARD-BLOCKED
- Production: HARD-BLOCKED

## Authority invariants

MODEL != AUTHORITY
CAPABILITY != PERMISSION
RUNTIME != CONTROL PLANE
DATA != AUTHORITY

## Request pipeline

request -> validate -> authenticate -> authorize -> capability -> operation -> state

No state mutation is permitted before authorization succeeds.

## Planes

- Control: GitHub, Actions, OIDC, Cloudflare IAM
- Data: DNS, CDN, WAF, Worker, API, Pages
- State: Durable Objects, D1, KV, R2, Queues
- Observability: logs, metrics, traces, audit, deployment provenance

Observability may observe execution but cannot grant authority.

## Release contract

All EDGE-P0-01 through EDGE-P0-16 must return PASS. Any failure means RELEASE PROHIBITED. WARN is not a deploy state.
