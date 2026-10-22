# Cloudflare deployment recovery

## Problem and behavior

Run [39072704053](https://github.com/MarcelRaschke/djjessejay.ch/actions/runs/39072704053)
passed its nonempty-secret check, then failed with authentication error 10000 at
the `wdjjj` Worker-service API lookup. Presence of a token value did not establish
validity or access to the configured account. A separately added
`setup-recovery.sh` does not run in the active deployment workflow and is not a
credential repair.

The existing `deploy-wdjjj.yml` now verifies token status and read access to the
actual `wdjjj` service before invoking Wrangler. It supports user-owned and
account-owned token verification; auto mode tries user verification first and
account verification only if needed. It does not list all accounts or require
account-list permissions just for diagnostics. A failed preflight prevents upload.

The check deliberately does not claim that successful reads establish Worker
edit or zone-route write permissions. A deployment can still fail at a later
authorization stage. First-time Worker creation requires a separate reviewed
bootstrap; a 403/404 read response is not permission to create a replacement.

## Read-only diagnostic run

Use the existing workflow on the reviewed branch, explicitly selecting diagnostic
mode. This uses repository secrets without fetching or printing their values:

```bash
gh workflow run deploy-wdjjj.yml --ref <reviewed-branch> \
  -f diagnose_only=true -f token_kind=auto
```

The run performs local preflight tests, Worker syntax validation and GET requests
to Cloudflare's token verification and the configured Worker service. It skips
Wrangler upload, route changes and subsequent live request assertions. Results
appear as sanitized JSON and in the job summary. A failed diagnostic run is an
observed authentication/access failure, not a successful deployment.

For normal deployment, leave `diagnose_only` false. Push-triggered runs retain
their normal deployment behavior after the new preflight passes. Changes to the
preflight script and tests are included in the deployment path filters.

## Configuration

- `CLOUDFLARE_API_TOKEN`: existing GitHub Actions secret; value never stored in Git.
- `CLOUDFLARE_ACCOUNT_ID`: existing secret, otherwise the existing public fallback.
- `CLOUDFLARE_TOKEN_KIND`: optional repository variable, `auto`, `user` or `account`.
  A manual run's input takes precedence.
- Worker target remains `wdjjj`, with `infra/cloudflare/wrangler.toml` unchanged.

If verification fails, check token ownership/type, validity, resource/account
scope, member permissions and source-IP restrictions in the authorized Cloudflare
account. Do not substitute a GitHub token for a Cloudflare token. The existing
Worker needs edit access; changes to routes require the relevant zone's Workers
Routes Write permission. Confirm current permissions in Cloudflare before
changing them; do not grant broad Admin or use a Global API Key as a shortcut.

## Security and provenance

Only fixed HTTPS Cloudflare API endpoints receive the token. Requests use GET,
refuse redirects and have a 15-second timeout. No API messages, raw response
bodies, exception messages or token values are logged. Failed configuration
checks make no network calls. Secrets are not passed to the local unit tests.

This change does not alter the Worker, origin protection, DNS, website content,
archive metadata or provenance claims. HTTP 520 remains a separate live incident
until the actual route/origin configuration is verified. A missing Worker header
alone does not prove a missing route.

## Validation

`npm run test:cloudflare-preflight` covers rejected/expired tokens, both token
kinds, denied Worker access, redirects, malformed replies, credential redaction
and target consistency. The test also runs before the workflow receives the
credential for preflight. The standard Node test and lint commands include it.

## Rollback and residual risk

Revert the preflight change through the normal reviewed pull-request process.
No production configuration or token rollback is required by this source change.
Reverting restores the earlier presence-only check; it cannot repair a rejected
token. A successful preflight is not a deployment, route-state verification or
API-health acceptance. Network failures stop the preflight conservatively.

References:
[token verification](https://developers.cloudflare.com/api/resources/user/subresources/tokens/methods/verify/),
[account token verification](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/verify/),
[Workers authorization](https://developers.cloudflare.com/workers/authorization/workers/).
