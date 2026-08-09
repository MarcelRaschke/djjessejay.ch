# DJ Jesse Jay Public Provenance v7 — Release Notes

## Scope

Introduces a single canonical artist profile, machine-readable identity, Schema.org JSON-LD, provenance ledger, archive appendix, press kits and guarded AI context.

## Corrected contradictions

- Static/no-build documentation is stale relative to current `package.json` Express/Tailwind runtime metadata.
- Licensing references conflict across historical files; the repository `LICENSE` file must be treated as authoritative.
- Current radio cadence is not asserted until verified from a current primary station source.

## Evidence added

- Longitudinal SoundCloud profile/recordings corroborate Zürich, Galaxy Space Night, Radio LoRa and Blue Dimension context.
- Resident Advisor event 896816 independently corroborates `DJ Jesse Jay (GSN ZH)` in 2016.

## Release gate

Before creating a GitHub Release:

1. merge provenance branch;
2. run repository tests/build/lint;
3. validate JSON and JSON-LD;
4. capture P0 archive receipts;
5. generate SHA-256 hashes into archive manifest;
6. tag immutable release;
7. attach manifest/archive bundle.
