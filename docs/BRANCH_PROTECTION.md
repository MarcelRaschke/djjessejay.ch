# Branch Protection Recommendations

## Scope

These recommendations apply to the protected `main` branch of `MarcelRaschke/djjessejay.ch`.

The repository is governed as:

1. Software project.
2. Digital archive.
3. OSINT knowledge graph.

## Required Protection for `main`

Enable:

- Require a pull request before merging.
- Require approvals.
- Require review from Code Owners.
- Dismiss stale pull request approvals when new commits are pushed.
- Require conversation resolution before merging.
- Require status checks to pass before merging.
- Require branches to be up to date before merging when practical.
- Block force pushes.
- Block branch deletion.

## Required Status Checks

Require these checks when available:

- `Tests and syntax checks`
- `Dependency audit`
- `Secret scan`
- `License summary`
- `Provenance metadata validation`
- `Coverage policy guard`
- CodeQL analysis
- Dependency Review
- OpenSSF Scorecard, if enabled

## Coverage Policy

The current `npm test` script performs syntax checks and Python compilation. When a coverage-producing test runner is introduced, set a minimum coverage threshold and require the coverage status check under branch protection.

Recommended starting thresholds:

| Area | Minimum |
|---|---:|
| Statements | 70% |
| Branches | 60% |
| Functions | 70% |
| Lines | 70% |

Coverage must not be reduced for security-sensitive code, provenance validators or metadata generation scripts without explicit justification.

## Merge Methods

Preferred:

1. Squash merge for small governance and metadata changes.
2. Merge commit for multi-commit feature branches where history matters.
3. Rebase only when it preserves auditability.

Do not enable unrestricted auto-merge for archive or provenance changes.

## Admin Rules

Repository admins should follow the same process unless emergency containment is required. Emergency direct commits must be documented after the fact in an incident note.

## Provenance Rule

No public claim about DJ Jesse Jay, Blue Dimension, radio associations, events, venues, sets or platform profiles should be merged without source, status, confidence and review state.
