# Audio Intelligence Host Security — v1.5 rollout

**Release state: DENY. Draft integration only.**

This branch introduces an independent Ed25519 host-attestation contract, with negative tests and a SHA-pinned GitHub workflow. It is not a production security approval.

## Host acceptance gates

- **G1 Operator Trust:** Independently custodial operator root/HSM; an Ed25519 signature binds the key-policy inventory. Rotation/revocation and non-replay proof must come from the real host.
- **G2 WORM:** Real S3 Object Lock COMPLIANCE retained **version ID**, verified readback, and IAM negative test forbidding deletion of the protected version. Object Lock permits new object versions; never rely on just an object key.
- **G3 Sandbox:** Real MCP stdio process must be tested inside bubblewrap, with read-only inputs, no network, resource limits and negative mutation tests.
- **G4 CI:** Complete transitive `requirements.lock` with hashes, passing Python + MCP tests and this workflow configured as a **required** check in GitHub rulesets.

## CI design

`Audio host attestation contract` tests the signature/commit-bound contract, then verifies a **separate short-lived signed attestation** supplied through host-controlled GitHub Secrets. A signed statement is only as trustworthy as the independent issuer and its live evidence.

`Audio dependency and runtime security` fails closed until the source project and a complete wheel-hash lock are in the repository.

The workflows do not generate any trusted signing keys or silently grant authorization.

## Local implementation package

The v1.5 source package exists separately as `audio-intelligence-moe-host-v1.5.zip` and contains the code for offline-signed key policy, S3 WORM host preflight, bubblewrap launcher, local MCP and tests.

It is **not** present on this branch. Source review and integration are required before this CI can become green. Private key material, S3 credentials, grants, and release attestation are deliberately omitted.

## Required disposition

Do not merge until the full source is reviewed, the dependency lock is valid, the real host and WORM checks are evidenced, the branch ruleset requires both check contexts, and independent review signs off.

`CAPABILITY != AUTHORIZATION != EXECUTION`
