# Cloudflare deployment recovery

## The deploy no longer runs on a stored API token

This change moves the regular Worker deploy out of GitHub Actions. It is meant
to run at Cloudflare, through Workers Builds, where the Cloudflare "Workers and
Pages" GitHub App is installed on the repository and Cloudflare deploys on every
push to `main`. The trust direction is then reversed: Cloudflare holds a
connection to GitHub instead of GitHub holding a Cloudflare secret, so no
Cloudflare credential in this repository can expire.

NOT YET IN EFFECT. Workers Builds for `wdjjj` exists in the account but has
failed on every run since 2026-10-13 because its build command is `gobuild`, a
command that does not exist. Until the three settings below are corrected once
in the dashboard, nothing deploys the Worker automatically — neither this
workflow, which no longer deploys on push, nor Workers Builds. The emergency
path (`deploy_with_token=true`) remains the only way to deploy until then, and
it needs a valid token.

That failure mode is the reason. A hand-made API token with a TTL blocked every
deploy from 2026-10-22 to at least 2026-11-05; the preflight reported
`tokenStatus: "expired"`, `writePermissionVerified: false` on each run. It was
the second outage of that kind. Cloudflare's API does not support OIDC or
workload-identity federation, so the token could not be replaced by something
short-lived — only by removing it from the path.

Workers Builds settings (Workers & Pages > wdjjj > Settings > Build):

| Field | Value |
| --- | --- |
| Root directory | `infra/cloudflare` |
| Build command | *(empty)* |
| Deploy command | `npx wrangler deploy` |

The deploy command calls Wrangler, so `infra/cloudflare/wrangler.toml` stays the
source of configuration and the dashboard supplies only the trigger. Before this
correction the field held `gobuild`, a command that does not exist, which is why
every Workers Builds run failed from 2026-10-13 onwards. An earlier revision of
the deploy audit called that failure a protection, on the reasoning that a
successful run would deploy from dashboard configuration instead of from
`wrangler.toml`. That is true only if the command bypasses Wrangler; it does not
apply to the command above.

`deploy-wdjjj.yml` keeps two jobs. `verify` needs no credential and asserts the
live edge, so it cannot be made red by an expired token, and a red result there
means the edge is actually wrong. `deploy-with-token` is an emergency path that
runs only on an explicit `workflow_dispatch`, never on push.

The `verify` job checks the live edge; it does not gate the deploy. On a push it
races Workers Builds and may still observe the previous Worker. The steady state
is covered by the daily `Live Site Smoke`.

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

For the emergency path, dispatch with `deploy_with_token=true` and
`diagnose_only=false`. Push-triggered runs no longer deploy at all: since
2026-11-05 a push runs the credential-free `verify` job only, and the deploy
comes from Workers Builds. Changes to the preflight script and tests remain in
the workflow's path filters.

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
