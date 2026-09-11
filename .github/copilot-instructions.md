# Repository instructions

## Cloudflare

- The Cloudflare Worker is `workers/pgp-directory/`; do not convert the root Express/static site to a Worker without explicit approval.
- Run Wrangler commands from `workers/pgp-directory/`, where `wrangler.jsonc` and the Worker package are located.
- Before changing Cloudflare APIs, bindings, deployment configuration, or product usage, consult the Cloudflare Docs MCP server or current Cloudflare documentation.
- Prefer Cloudflare Skills for detailed, task-specific guidance and use Wrangler for local development, checks, dry runs, deployments, and migrations.
- Run `npm run check` and, when relevant, `npm run deploy:dry-run` in `workers/pgp-directory/` before deployment.
- Never commit API tokens, account IDs that are intended to remain private, secrets, private keys, `.env` values, or OAuth credentials.
- Do not change production DNS, Cloudflare account resources, or deploy to production without explicit confirmation.
- Report assumptions, changed files, validation results, and any required local authentication.

## General

- Preserve existing project structure and conventions.
- Make minimal, reviewable changes.
- Validate external input and handle errors explicitly.
- Do not claim that tests, audits, or deployments were performed unless they were actually verified.
