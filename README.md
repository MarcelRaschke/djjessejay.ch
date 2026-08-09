# djjessejay.ch

Official repository for **DJ Jesse Jay — Zürich electronic DJ since 1997**.

## Canonical identity and provenance

Identity claims are governed by:

- `DJ_JESSE_JAY_CANONICAL_PROFILE.md` — human-readable source of truth
- `artist-profile.json` — machine-readable identity
- `website/provenance.json` — claim/evidence ledger
- `website/schema.org.jsonld` — structured public identity
- `ARCHIVE_CITATION_APPENDIX.md` — evidence register
- `AI_SYSTEM_PROMPT.md` / `jj-ai/knowledge-context.json` — AI guardrails

Generated AI content is **not evidence** and must not promote new biographical claims without provenance.

## Current technical architecture

The repository has evolved beyond the earlier static/no-build description. Current `package.json` defines Node.js 24+, Express 5, CORS, rate limiting, Nodemailer, WebSocket support, Tailwind CLI and render-farm test commands. Historical GitHub Pages/static deployment files remain and must be reconciled rather than treated as the only architecture.

### Commands

```bash
npm install
npm run build:css
npm run sync:metadata
npm test
npm start
```

## `index.html` canonical metadata

`index.html` is large and contains live UI/AI/animation code. To avoid destructive full-file rewrites, canonical title/description/Open Graph/Twitter/JSON-LD metadata is applied deterministically:

```bash
npm run sync:metadata
```

Review and commit the resulting `index.html` diff. CI checks that the generated metadata stays synchronized.

## Evidence status

Current evidence supports DJ Jesse Jay / Zürich / active-since-1997, Galaxy Space Night context, Radio LoRa association and Blue Dimension as a contemporary project/recording identity. The `Radio LoRa since 2001` statement remains classified as a historical first-party claim. A previously referenced Radio LoRa Blue Dimension URL returned 404 during the 2026-08-09 review, so no current broadcast schedule is asserted.

## Licensing

The repository `LICENSE` file contains **Apache License 2.0** and is authoritative for repository source code. Music, photography, logos, recordings and other media may have separate copyright or licensing conditions.

## Public provenance release

See `release/PROVENANCE_V7_RELEASE_NOTES.md` and `archive/MANIFEST.json`. P0 archive receipt URLs are added only after successful external archival capture; they are never fabricated.
