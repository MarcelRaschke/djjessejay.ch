# DJ Jesse Jay Provenance Repository Governance

## Architecture Definition

This repository is not a pure website repository.

It is a versioned governance, archive and provenance system for **DJ Jesse Jay — since 1997**.

It connects software quality, security controls, long-term digital archiving and an evidence-based OSINT knowledge graph where each public claim about DJ Jesse Jay, Blue Dimension, radio and club contexts, sets, platforms and events can be traced to sources, time ranges, confidence values and review states.

## Three Project Roles

```text
djjessejay.ch / archive repo
|
|-- 1. Software Project
|   |-- GitHub Governance
|   |-- CI/CD
|   |-- Security Gates
|   |-- Code Quality
|   `-- Branch Protection
|
|-- 2. Digital Archive
|   |-- DJ Sets
|   |-- Radio Broadcasts
|   |-- Events
|   |-- Tracklists
|   |-- Flyers / Media
|   `-- Metadata
|
`-- 3. OSINT Knowledge Graph
    |-- Sources
    |-- Evidence
    |-- Assertions
    |-- Confidence Scores
    |-- Timelines
    `-- Versioned Changes
```

## 1. Software Project

Purpose: protect technical integrity.

Mandatory controls:

- `AGENTS.md`
- `.github/CODEOWNERS`
- `.github/workflows/security-gate.yml`
- `SECURITY.md`
- `INCIDENT_RESPONSE.md`
- Branch protection
- Dependency audit
- Secret scanning
- Gitleaks
- Coverage policy
- Provenance validation

Rule:

> No change to code, archive data or provenance data without pull request, CI validation and reviewable human approval.

## 2. Digital Archive

Purpose: preserve long-term documentation of artistic and cultural traces.

Object types:

- Set
- RadioShow
- Broadcast
- Event
- Venue
- Flyer
- Tracklist
- Recording
- PlatformProfile
- Interview
- PressReference

Rule:

> No archive entry without date or valid time, source, status and confidence.

## 3. OSINT Knowledge Graph

Purpose: make every claim traceable, assessable and temporally versionable.

Core model:

```text
G_T = (V, E, tau, omega, chi)
```

Where:

- `V` = entities such as artist, radio stations, platforms, collaborators, places, media objects and sources.
- `E` = relationships between entities.
- `tau` = time function.
- `omega` = evidence weight or confidence.
- `chi` = classification function.

## Claim Discipline

```text
Claim != Evidence
Evidence != Verification
Verification != Official Certification
```

Each public assertion should be represented with:

```yaml
assertion_id: assertion:slug
subject: artist:dj-jesse-jay
predicate: MEMBER_OF
object: show:blue-dimension
valid_time:
  start: 1997
  precision: year
observed_time: 2026-08-21
confidence: 0.0
status: unreviewed
sources: []
review_state: human_review_required
```

## Valid Time vs Observed Time

- `valid_time` describes when a claim is supposed to be true.
- `observed_time` describes when a source was observed, captured or reviewed.

These fields must remain separate.

## Trust Levels

| Status | Meaning |
|---|---|
| `verified` | Strong source base, reviewed, no known unresolved contradiction. |
| `supported` | Evidence-backed but not official certification. |
| `probable` | Plausible, limited evidence. |
| `possible` | Weak or incomplete source base. |
| `unreviewed` | Imported but not evaluated. |
| `contradicted` | Conflicting evidence exists. |
| `deprecated` | Replaced or no longer used. |

## Lifecycle

```text
New information
-> import
-> schema validation
-> evidence review
-> confidence assignment
-> human review
-> pull request
-> CI validation
-> merge
-> website/archive publication
```

## Operational Consequence

Initial governance branch:

```bash
git checkout -b agent-governance
```

Initial files:

```text
AGENTS.md
.github/CODEOWNERS
.github/workflows/security-gate.yml
SECURITY.md
INCIDENT_RESPONSE.md
archive/schema.yml
website/provenance.json
.github/ISSUE_TEMPLATE/
.github/PULL_REQUEST_TEMPLATE.md
docs/BRANCH_PROTECTION.md
```
