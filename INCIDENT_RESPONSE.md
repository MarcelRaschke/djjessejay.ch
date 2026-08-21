# Incident Response Runbook

## Purpose

This runbook defines how to handle security, CI, repository, archive and provenance incidents for the DJ Jesse Jay provenance repository.

The repository has three protected surfaces:

1. Software and website integrity.
2. Digital archive integrity.
3. OSINT/provenance graph integrity.

## Incident Classes

| Class | Description | Examples |
|---|---|---|
| C0 | Emergency | Secret leak, malicious workflow, public tampering, active exploitation |
| C1 | High | Broken auth, unsafe dependency, provenance corruption, compromised deployment |
| C2 | Medium | Failed security gate, stale dependency, broken archive validation |
| C3 | Low | Documentation gap, non-blocking metadata inconsistency |

## Immediate Actions

For C0/C1 incidents:

1. Stop affected workflow or deployment.
2. Preserve evidence before cleanup.
3. Revoke or rotate exposed secrets.
4. Create a private incident branch or advisory.
5. Identify the last known good commit.
6. Prepare rollback.
7. Validate fix through CI.
8. Document residual risk.

## Evidence Preservation

Preserve:

- Commit SHA.
- Branch name.
- Pull request number.
- Workflow run URL.
- Logs.
- Relevant files.
- Screenshots where appropriate.
- External source URLs.
- Timestamps with timezone.

Do not rewrite history unless a secret or legally sensitive material requires removal. Prefer revert commits for public auditability.

## Secret Exposure Procedure

1. Identify exposed secret type.
2. Revoke or rotate the secret.
3. Search repository history and workflow logs.
4. Audit access logs where available.
5. Confirm no active misuse.
6. Add or update detection rule.
7. Document the incident.

## Provenance Incident Procedure

A provenance incident occurs when a public claim is wrong, overconfident, unsupported or contradicted.

Procedure:

1. Downgrade claim status to `unreviewed`, `possible` or `contradicted`.
2. Add a `knownConflicts` entry where relevant.
3. Preserve old claim value in Git history.
4. Add source and observed time for the correction.
5. Require human review before returning to `supported` or `verified`.

## Archive Incident Procedure

For corrupted, missing or duplicated archive metadata:

1. Freeze publication for affected item.
2. Check source files and generated public JSON.
3. Compare against last known good commit.
4. Restore from canonical metadata if available.
5. Re-run provenance validation.
6. Update incident notes.

## Recovery Checklist

- [ ] Affected branch or deployment identified.
- [ ] Evidence preserved.
- [ ] Secrets rotated where relevant.
- [ ] Dependencies reviewed where relevant.
- [ ] Provenance claims downgraded where needed.
- [ ] Fix merged through pull request.
- [ ] CI passed.
- [ ] Rollback verified.
- [ ] Post-incident notes written.

## Postmortem Template

```md
# Incident Postmortem

## Summary

## Timeline

## Impact

## Root Cause

## Detection

## Response

## What Worked

## What Failed

## Corrective Actions

## Residual Risk
```
