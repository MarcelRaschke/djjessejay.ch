# Origin Protection Deployment Contract

## Scope

This feature establishes a fail-closed deployment gate for a Cloudflare Tunnel based origin-protection path. It does **not** change `main` directly and it does not store Cloudflare credentials in Git.

## Files

- `scripts/cloudflare-tunnel-setup.js` — Node 22+ Cloudflare API bootstrap. Dry-run by default; mutations require `--apply`.
- `scripts/verify-origin-protection.js` — six-point, read-only verification.
- `scripts/deployment-checklist.sh` — local syntax and security gate.
- `.github/workflows/origin-protection-ci-block.yml` — pull-request/main gate.
- `ORIGIN-PROTECTION-DEPLOYMENT.md` — deployment contract.

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
CF_PUBLIC_HOSTNAME
CF_TUNNEL_ID                 # verifier only
CF_ORIGIN_PUBLIC_IP          # verifier: known origin IP, required for OP-05
CF_ORIGIN_SERVICE            # setup, default http://127.0.0.1:3000
CF_TUNNEL_NAME               # setup, default djjessejay-origin
CF_ACCESS_HOSTNAME           # optional dedicated Access hostname
CF_ACCESS_EMAILS             # comma-separated allow-list when --access is used
```

The Cloudflare token should be scoped to only the account/zone and permissions required for the operations. Cloudflare's current Tunnel API documentation requires Tunnel write plus DNS write for this bootstrap path. Access application creation requires Access Apps and Policies write. Do not use a Global API Key.

## Execution

### 1. Plan only

```bash
node scripts/cloudflare-tunnel-setup.js
```

The default mode makes no Cloudflare changes.

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
