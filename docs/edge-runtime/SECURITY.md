# EDGE-RUNTIME SECURITY CONTRACT

Fail closed on unknown identity, operation, policy, capability or invalid input.

## Boundaries

B0 Human -> B1 GitHub -> B2 CI/CD -> B3 Cloudflare Control Plane -> B4 Edge Runtime -> B5 State Plane

## Hard rules

1. No long-lived production credentials in source.
2. OIDC is the deployment identity mechanism.
3. Production requires mandatory CI and review gates.
4. Worker permissions are least-privilege scoped.
5. State mutation requires validated authorization.
6. Queue consumers must be idempotent.
7. Telemetry cannot authorize operations.
8. Failed health checks cannot promote a release.
