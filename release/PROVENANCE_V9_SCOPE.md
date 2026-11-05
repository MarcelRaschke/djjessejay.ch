# v9 Public Provenance — preparation scope

Target tag: `v9public-provenance-rc` (exact spelling). Baseline: `420614ddd6b79896a35196026f96620b1c906caa`.

Status: NOT READY. This change prepares reviewable artifacts; it does not certify public deployment, independent archival capture, or a release.

## Included

- 15 ledger claims and a source registry preserving historical observations and original reference IDs.
- New source-linked archive status; canonical Markdown appendix and a static HTML counterpart.
- Deterministic assertion graph (15 claims, 15 sources, 36 CITES edges), JSON plus standalone Cypher. The graph does not promote assertions to facts. Import in an empty review database using cypher-shell; a real Neo4j import has not yet been tested.
- Draft ZIP packager with per-file UTF-8 byte sizes and SHA-256, ZIP readback validation, and an explicit RC hold.

## Evidence review

Existing claim values and historical observations are retained. The artist-name claim is downgraded from verified to supported; profile evidence is P5, not presumed P4. Previous assessments remain in assessmentHistory. Three candidates from closed PR #213 are imported as unreviewed, confidence 0; publication dates and track counts are not adopted. Four historical source references remain partial/unresolved and are explicitly listed by archive-status and the appendix. They must not be treated as independently verified.

Resident Advisor event 896816 was retrieved via search on 2026-11-05 (possibly cached); it supports the 2016 GSN association only. SoundCloud retrieval was restricted. Wayback CDX was inaccessible. No capture URL or receipt was fabricated.

## Deployment

CI and the static deployment workflow share scripts/prepare-pages-content.sh. The CI bundle job builds CSS, applies the actual Pages cleanup and checks the retained public appendix, JSON targets, and source/status parity. The deployment workflow repeats this check immediately before upload. Root Markdown is removed. The appendix HTML is the public representation; the root Markdown file is a compatibility pointer. Verify the actual built bundle and published content after review/merge, including website/archive-status.json, website/provenance.json and presskit/ARCHIVE_CITATION_APPENDIX.html. A general HTTP 200 is insufficient: compare actual bytes/content and expected v9 markers.

Main already contains the upload-pages-artifact v4 SHA fix; do not reopen closed #229. PR #213 was closed at maintainer request; this PR imports candidate provenance only, not its player/navigation UI changes.

## Commands

`python3 scripts/package-provenance-v9.py --check` validates references, statuses, graph parity, appendix coverage, and draft ZIP hash/size roundtrip in a temporary directory.

`python3 scripts/package-provenance-v9.py --output /tmp/djjj-v9-draft` writes a **draft** MANIFEST.json and ZIP. The manifest inventories payload files, not itself. The ZIP SHA-256 is written separately to SHA256SUMS. Source commit and clean working tree are required for an auditable package. An untracked file at an allowlisted path must not enter the package.

`--rc` fails closed until a separately reviewed release-gate implementation exists. Do not publish a draft ZIP under the RC tag.

## Remaining acceptance gates

1. Resolve historical references, verify candidate source contents, and obtain human evidence review.
2. Retrieve real independent archive captures with original URL, capture URL/time and integrity evidence. Define required capture coverage explicitly; no invented 6/6 target.
3. Test Neo4j import and compare node/edge counts and all assertion metadata.
4. Passing CI, human CODEOWNERS review, resolved conversations, and authorized merge.
5. Verify candidate files in the deployed bundle and public endpoints; record actual deployed commit.
6. Build clean committed payload, independently verify ZIP manifest and checksum, review release readiness, then create the exact tag and attach assets.

Rollback: revert this PR. Deployment checks are added; routing, credentials and existing policy gates are unchanged. No live deployment is performed by this PR.
