# Dependency update: 2026-11-12

## Scope

Update all six checked-in npm manifests to the npm registry's stable `latest`
versions, including existing overrides. Refresh the root lockfile and add
lockfiles for the five previously unlocked subprojects. Update Python
requirements to exact stable PyPI releases, Mojo to 1.2.0, Wrangler's workflow
version to 4.160.1, and GitHub Actions to stable release commit SHAs.
The SLSA reusable workflow retains the required version-tag reference.

Important updates include TypeScript 7.0.2, Wrangler 4.160.1,
Anthropic 2.8.0, pytest 9.2.0, Three.js 0.187.0, Tailwind 4.3.5,
Nodemailer 10.5.0, ws 8.22.2 and express-rate-limit 8.7.4.
Already-current direct dependencies are retained.

This is a package/tooling update, not a database migration or a deployment.
Container/database/runtime major upgrades are not included. The active Hotze
Three.js import map is updated alongside its package manifest; the Mermaid
diagram dependency is pinned to stable 12.3.0.

## Compatibility changes

- Mojo 1.2 uses `std.math`; add an explicit empty initializer for `SoundKurator`.
  Run the current formatter on the audio core and its tests.
- Enable the PGP Worker's `nodejs_compat` flag for its existing
  `node:crypto` import. Wrangler's dry run warned about the missing flag.
- Use `npm ci` and lockfile-keyed caching for the PGP and orchestrator CI jobs,
  and `npm ci` for the Control Center API.
- Keep Node 24 for the existing application validation environment.
  The latest `@types/node` is 26.6.6; existing source typechecks under it, but
  future code must not assume Node 26 APIs are available on Node 24.
- CodeQL is pinned to action release v4.39.3, not the separately published
  `codeql-bundle` release.

## Validation

Local validation uses Node 24.22.3 and an isolated Python environment.

- Root lint: passed.
- Root tests: 98 passed; provenance v9 checks passed.
- Pages build: passed; checked-in Tailwind output regenerated.
- Control Center API: TypeScript typecheck and production build passed.
- PGP Worker: 14 tests passed; Wrangler deployment dry run passed.
- Skillgenerator: syntax check and Wrangler deployment dry run passed.
- Superagent orchestrator: TypeScript and Wrangler deployment dry run passed.
- Python triage and Claude helper: 16 tests passed; `pip check` passed.
- Mojo 1.2 compilation, tests and runtime smoke test passed.
- `npm outdated` reports no outdated direct packages in any of the six projects.
- Production-only npm audits report zero vulnerabilities in all six projects.
- Full npm audit: four moderate development-only findings remain in
  `drizzle-kit` and its esbuild loader dependency chain. The registry's current
  `latest` still contains this chain. Do not use a forced audit downgrade.
- Actionlint 1.7.12 recognizes the workflow syntax after ignoring its
  pre-existing unknown `ubuntu-26.04` runner-label diagnostic. This is not
  confirmation that the runner label is available for this repository.

## Security and provenance impact

Authentication, authorization, rate limiting and deployment guards remain
enabled. Actions retain immutable SHA pins, except the documented SLSA tag
requirement. No credentials, archive assertions, source records, review states
or public cultural claims are modified. Build output is regenerated; historical
provenance evidence is not rewritten.

## Residual risk and review

GitHub-hosted CI and human review are still required. Local tests do not prove
live Cloudflare behavior, browser rendering compatibility, PostgreSQL migration
compatibility or manual release/attestation workflow execution. This update
includes major tooling releases, including TypeScript, Anthropic and Actions.
No live database migration, release, merge or deployment was performed.

## Rollback

Before merge, close the PR or discard the branch. After merge, revert the update
commit, reinstall with `npm ci`, and rebuild generated assets. No database or
remote infrastructure rollback is needed because this change performs no
migration or deployment.
