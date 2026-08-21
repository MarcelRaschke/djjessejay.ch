# AGENTS.md

## Purpose

This repository is not only a website repository. It is a versioned governance, archive and provenance system for **DJ Jesse Jay — since 1997**.

Agents working in this repository must protect three project roles:

1. **Software project** — GitHub governance, CI/CD, security and quality.
2. **Digital archive** — long-term documentation of sets, radio broadcasts, events and metadata.
3. **OSINT knowledge graph** — evidence-based temporal cultural graph where every public claim can be traced to sources, time ranges, confidence values and review states.

## Operating Principle

> Model capability is not permission. Automated assistance must remain reviewable, constrained and reversible.

No agent may treat generated content as evidence. Generated content can only describe, normalize or transform evidence that is already present or explicitly cited.

## Priority Order

When instructions conflict, use this order:

1. Safety and security
2. Repository integrity
3. Evidence preservation
4. Correctness of claims
5. Reproducibility
6. Minimal change
7. Style and presentation

## Hard Rules

Agents must never:

- Commit or expose secrets, tokens, private keys, API keys or credentials.
- Weaken authentication, authorization, rate limits, CORS, CSP, security headers or bot protection.
- Disable or bypass CI, CodeQL, dependency review, secret scanning or provenance validation.
- Convert an unverified claim into a verified claim.
- Use a generated text, prompt, image or model output as primary evidence.
- Remove provenance metadata without replacing it with stronger metadata.
- Rewrite archive history to make a claim look more certain than the evidence supports.
- Merge agent-generated changes without human review.

## Required Change Discipline

Every non-trivial change must include:

- Summary of what changed.
- Security impact.
- Provenance impact.
- Test or validation evidence.
- Rollback plan.
- Residual risk.

## Evidence Rules

Claims about DJ Jesse Jay, Blue Dimension, Radio LoRa, Galaxy Space Night, venues, sets, broadcasts, events, platforms or collaborations must be represented as claims or assertions with:

- Subject
- Predicate
- Object or value
- Valid time
- Observed time
- Source list
- Confidence
- Status
- Review state

Use `possible`, `probable`, `supported`, `verified` and `contradicted` carefully. Do not infer `verified` from repetition alone.

## Valid Time vs Observed Time

- `valid_time` describes when a claim is supposed to be true.
- `observed_time` describes when the source was captured or reviewed.

Never collapse these two fields.

## Source Priority

Prefer evidence in this order:

1. Independently archived third-party source.
2. Institutional primary source.
3. Venue or organizer archive.
4. Established event database.
5. Verified platform profile.
6. First-party repository evidence.
7. Social post.
8. Search result snippet.
9. Unverified self-claim.

## Pull Request Review Output

Agent reviews should use this structure:

```text
Critical findings
Major findings
Minor findings
Provenance findings
Security findings
Recommended patch
Residual risk
```

## Repository Areas

- `.github/` — governance and workflow controls.
- `archive/` — source-normalized cultural archive metadata.
- `website/` — public website and public JSON metadata.
- `docs/` — policies, governance and operational documentation.
- `scripts/` — validators and metadata generation tools.

## Merge Policy

No change to code, archive data or provenance data should reach `main` without:

- Pull request.
- Passing CI.
- CODEOWNERS review.
- Resolved conversations.
- Clear rollback path.
