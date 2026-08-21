# Security Policy

## Scope

This policy covers the `djjessejay.ch` repository, including:

- Website code and configuration.
- GitHub Actions workflows.
- Archive metadata.
- Public provenance metadata.
- Scripts that transform, validate or publish archive data.

The repository is treated as both a software project and a cultural archive. Security incidents can therefore affect code integrity, public trust, provenance integrity and the DJ Jesse Jay archive record.

## Supported Branches

| Branch | Status | Notes |
|---|---|---|
| `main` | Supported | Production/canonical branch. |
| active PR branches | Best effort | Reviewed through CI and CODEOWNERS. |
| stale branches | Not supported | Must be rebased or closed before merge. |

## Reporting a Vulnerability

Do not publish exploitable details in a public issue.

Use a private GitHub security advisory when available. If that is not available, contact the repository owner through a known private channel.

Include:

- Affected file, endpoint, workflow or metadata object.
- Reproduction steps.
- Impact.
- Evidence.
- Suggested mitigation if known.

## Severity Matrix

| Severity | Criteria | Target response |
|---|---|---:|
| Critical | Secret exposure, auth bypass, remote code execution, workflow token abuse, public archive tampering | 24 hours |
| High | Stored XSS, dependency exploit path, provenance corruption, unsafe GitHub Actions permission | 72 hours |
| Medium | Reflected XSS, unsafe headers, weak validation, metadata integrity issue | 7 days |
| Low | Hardening issue, documentation gap, non-exploitable validation weakness | 30 days |

## Security Controls

Required controls for protected branches:

- Pull request review.
- CODEOWNERS review.
- Passing CI.
- Secret scanning.
- Dependency review.
- CodeQL or equivalent static analysis.
- Gitleaks scan.
- Provenance metadata validation.

## Supply-Chain Policy

Dependencies must be justified by function and maintenance status. Avoid adding packages for tasks that can be done with platform tooling or standard libraries.

For dependency changes, the pull request must include:

- Package name and purpose.
- License impact.
- Security impact.
- Runtime or build-time scope.
- Rollback path.

## GitHub Actions Policy

Workflows must use least privilege permissions. Default to:

```yaml
permissions:
  contents: read
```

Escalate permissions only when required and document why.

Avoid unsafe `pull_request_target` usage. Do not run untrusted fork code with write tokens.

## Secrets Policy

Secrets must never be committed, logged or embedded in metadata. If a secret is suspected to be exposed:

1. Revoke or rotate it immediately.
2. Preserve evidence.
3. Open an incident record.
4. Audit recent workflow runs and deployments.
5. Confirm remediation through CI and manual review.

## Provenance Integrity

Archive and identity claims must not be silently upgraded. Claim status changes require evidence and review.

Generated text, generated images and model outputs are not evidence. They may only be used as presentation or transformation layers.

## Disclosure

Accepted vulnerabilities should be fixed on a private or protected branch first, then merged after validation. Public disclosure should avoid exposing operational secrets or reusable exploit details.
