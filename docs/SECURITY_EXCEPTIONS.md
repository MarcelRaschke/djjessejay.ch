# Security Exceptions

This document lists known vulnerability findings that are deliberately excluded from the
`Dependency audit` CI job (`.github/workflows/security-gate.yml`, job `dependency-audit`)
together with justification, scope and review conditions.

## GHSA-vfj7-8cjw-p6xm — braces (CVE-2026-93687)

| Field | Value |
|---|---|
| Advisory | https://github.com/advisories/GHSA-vfj7-8cjw-p6xm |
| Severity | High (CVSS 4.0 AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:H) |
| Affected versions | `braces <= 3.0.3` |
| Patched versions | **None** (as of 2026-10-08) |
| Dependency path | `@tailwindcss/cli` (devDependency) → `@parcel/watcher` → `micromatch` → `braces` |
| Exposure | Dev toolchain only (`build:css` / `watch:css`); not part of the production dependency tree, never receives untrusted input at runtime |

### Justification

- The repository already installs the newest available versions (`braces@3.0.3`,
  `micromatch@4.0.8`, `@tailwindcss/cli@4.3.3`); no fixed release exists to upgrade to.
- The vulnerability (stack exhaustion via deeply nested brace patterns) only affects
  processes that pass attacker-controlled patterns to `braces`/`micromatch`. Within this
  repository, that code is reachable only from the local Tailwind CLI watch/build mode.
- `npm audit fix` cannot remediate the finding; an `overrides` entry has no effect because
  `3.0.3` is the highest published version and is itself affected.

### Mitigation and removal conditions

- Production dependencies remain fully audited at `--audit-level=high` with `--omit=dev`
  semantics; this exception covers only the dev dependency tree.
- The exception must be removed as soon as any of the following occurs:
  1. A patched `braces` release is published, or
  2. `@tailwindcss/cli` moves to `@parcel/watcher >= 2.6.0` (micromatch removed), or
  3. The Tailwind CLI devDependency is dropped from `package.json`.
- Review cadence: re-check this exception at every release and whenever the audit job is
  touched.

## Policy

- Exceptions must reference a GitHub Advisory ID, document the dependency path and the
  concrete unreachability argument, and define removal conditions.
- Production (`--omit=dev`) audit findings must never be excepted without a separate
  governance decision.
