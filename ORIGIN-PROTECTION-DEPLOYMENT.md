# Origin Protection Deployment Contract

## Scope

This feature establishes a fail-closed deployment gate for a Cloudflare Tunnel based origin-protection path. It does **not** change `main` directly and it does not store Cloudflare credentials in Git.

## Files

- `scripts/cloudflare-tunnel-setup.js` — Node 22+ Cloudflare API bootstrap. Dry-run by default; mutations require `--apply`.
- `scripts/verify-origin-protection.js` — six-point, read-only verification.
- `scripts/deployment-checklist.sh` — local syntax and security gate.
- `.github/workflows/origin-protection-ci-block.yml` — pull-request/main gate.
- `ORIGIN-PROTECTION-DEPLOYMENT.md` — deployment contract.

## Cloudflare state on 2026-11-01

The account now contains a remotely managed `djjessejay-origin` Tunnel (`9794cff6-1f09-444c-a2df-5dcb48370c90`). Its only upstream ingress is `origin.djjessejay.ch` with path `^/api(?:/.*)?$` to `http://127.0.0.1:3000`; all other requests get `http_status:404`. DNS record `04c54d8bb8bc0562596b6f63fd2f4380` is a proxied CNAME to `9794cff6-1f09-444c-a2df-5dcb48370c90.cfargotunnel.com`.

This path-scoped ingress was configured directly through the Cloudflare API. The setup script's host-only reconciliation would broaden it, so this branch makes the script refuse to alter a tunnel with an existing path-scoped rule for the origin. Do not use `--apply` to reconfigure this Tunnel without a reviewed path-aware migration.

Access app `da8c4507-9ab7-4b1d-928e-69aac3d733ad` covers only `origin.djjessejay.ch`. Its sole `non_identity` policy admits service-token ID `7e7386b4-5f7f-44a2-a435-10d29994f7a0` (expires 2027-11-01). The token's client ID and secret are bound to `wdjjj` as `ORIGIN_ACCESS_CLIENT_ID` and `ORIGIN_ACCESS_CLIENT_SECRET`; their values are not recorded here. A control-plane read confirmed the CNAME, tunnel ingress, Access policy, and Worker binding names. An unauthenticated GET to `https://origin.djjessejay.ch/api/health` returned 403, while the public homepage and Worker health returned 200.

**The tunnel is inactive with zero connector connections.** GitHub Pages hosts static files and cannot run `server.js` or `cloudflared`. The operator selected an existing Hosttech/VPS server, but its SSH hostname and access are not available in this environment yet. The current production Worker also does not forward its Access service token: `/api/health` through the public hostname returns 403. The Worker change in this branch prepares that forwarding for human review; it must not be treated as deployed. Even after review and deployment, the API remains unavailable until the Express service and connector are running on the VPS.

Security impact: the origin hostname is published only behind Access, and Tunnel ingress restricts the exposed path to `/api`. Provenance impact: no DJ Jesse Jay archive claims changed. Validation: Cloudflare API readback, unauthenticated Access denial, public-site HTTP probes, and `test/worker-origin-access.test.mjs`. Rollback: delete the origin CNAME, then the Access app and Tunnel if unused; remove the two Access secrets from `wdjjj` and revoke the service token. Keep the public Worker routes intact. Residual risk: the API is unavailable, and the connector plus direct-origin exposure cannot yet be verified.

## Security invariants

1. `main` is not modified directly by this feature branch.
2. No API token, tunnel token, private key, or secret is committed.
3. The setup script is non-mutating unless `--apply` is supplied.
4. Existing DNS records are never overwritten implicitly.
5. Existing named tunnels are reused; duplicate active names are refused.
6. A failed apply rolls back DNS records and a newly created tunnel.
7. The public hostname must terminate at a proxied CNAME targeting `<tunnel-id>.cfargotunnel.com`.
8. Tunnel ingress contains an explicit catch-all `http_status:404` rule.
9. Cloudflare Access, when used, is attached to a **dedicated** hostname. The script refuses to attach Access to the public hostname.
10. The verifier fails closed when a known origin IP is not supplied, because direct-origin exposure cannot otherwise be proven absent.
11. CI has `contents: read` only and does not receive Cloudflare credentials.
12. Failed validation blocks the deployment gate when the workflow check is configured as a required status check for `main`.

## Required environment

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_ZONE_ID
CF_PUBLIC_HOSTNAME           # tunnel hostname; for this site: origin.djjessejay.ch
CF_TUNNEL_ID                 # verifier only
CF_ORIGIN_PUBLIC_IP          # verifier: known origin IP, required for OP-05
CF_ORIGIN_SERVICE            # setup, default http://127.0.0.1:3000
CF_TUNNEL_NAME               # setup, default djjessejay-origin
CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID  # setup: ID of the service token used by the wdjjj Worker (required)
CF_ACCESS_HOSTNAME           # optional dedicated Access hostname
CF_ACCESS_EMAILS             # comma-separated allow-list when --access is used
```

The Cloudflare token should be scoped to only the account/zone and permissions required for the operations. Cloudflare's current Tunnel API documentation requires Tunnel write plus DNS write for this bootstrap path. Access application creation requires Access Apps and Policies write; the pre-flight check of the Worker's service token (exists, enabled, not expired) requires Access Service Tokens read. Do not use a Global API Key.

## Execution

### 1. Plan only

```bash
node scripts/cloudflare-tunnel-setup.js
```

The default mode makes no Cloudflare changes.

For djjessejay.ch the tunnel carries only the Express backend. The public site
stays behind the `wdjjj` Worker, which reaches the backend through the Worker
secret `API_ORIGIN_HOST=origin.djjessejay.ch`. Never use the apex or `www` as
`CF_PUBLIC_HOSTNAME`; the script refuses to overwrite their existing records.

### Worker-only origin (service token)

The tunnel hostname is publicly resolvable, so it must only accept requests from
the `wdjjj` Worker. The setup script therefore requires an Access service token
and protects `CF_PUBLIC_HOSTNAME` with an Access app whose only policy is
`non_identity` for exactly that token:

1. Zero Trust → Access → Service Auth → create a service token, e.g. `wdjjj-origin`.
   Copy Client ID and Client Secret once into your password manager; note the token ID.
2. Store both values as Worker secrets (never in `wrangler.toml`):
   `npx wrangler secret put ORIGIN_ACCESS_CLIENT_ID` and
   `npx wrangler secret put ORIGIN_ACCESS_CLIENT_SECRET`.
3. Make sure the deployed `wdjjj` Worker forwards the token (`cf-access-client-id` /
   `cf-access-client-secret` on `/api` subrequests; PR #160). Until that Worker is live,
   applying the service-token-only policy makes every `/api` request fail at Access.
4. Run the setup with `CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID=<token id>`.
5. Store the token ID as repository variable `CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID` so the
   deployment checklist can verify it.

`--allow-public-origin` skips this protection and is meant for tests only.

### 2. Apply

```bash
node scripts/cloudflare-tunnel-setup.js --apply
```

For a dedicated Access hostname:

```bash
node scripts/cloudflare-tunnel-setup.js --apply --access
```

The script intentionally does not print the tunnel token. Retrieve it through the Cloudflare control plane and install/run `cloudflared` on the origin host using your normal secret-management mechanism.

### 3. Verify

```bash
node scripts/verify-origin-protection.js
```

Expected result:

```text
ORIGIN PROTECTION: PASS
```

### 4. Local gate

```bash
bash scripts/deployment-checklist.sh
```

### 5. CI gate

The GitHub Actions workflow validates the five files on pull requests to `main` and on relevant pushes to `main`. The workflow has read-only repository permissions and does not perform Cloudflare mutations.

To make this a merge/deployment block, configure the workflow's validation check as a **required status check** in the branch protection/ruleset for `main`. The workflow alone cannot enforce repository branch protection policy.

## Six verification points

| ID | Control | Failure condition |
|---|---|---|
| OP-01 | API / zone | target zone unavailable or inactive |
| OP-02 | Tunnel | tunnel missing or not remotely managed |
| OP-03 | Ingress | expected hostname/catch-all missing |
| OP-04 | DNS | public hostname is not exactly a proxied tunnel CNAME |
| OP-05 | Origin leak | known origin IP is directly published |
| OP-06 | Access boundary | dedicated Access hostname missing or public site accidentally protected |

## Rollback

Do not delete a pre-existing tunnel automatically as part of CI failure. Preserve evidence and recover through the Cloudflare control plane. If a bad DNS record is detected, stop deployment first, then correct the DNS state explicitly.

## Release rule

`ORIGIN PROTECTION: FAIL` means **release prohibited**. There is no warning-as-pass state.
