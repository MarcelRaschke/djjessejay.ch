# Sigstore / Cosign Provenance Gate

This repository archives the GitHub release attestation for `v7.0.0` and verifies it in CI.

## Verification contract

The gate requires all of the following:

- repository: `MarcelRaschke/djjessejay.ch`
- release tag: `v7.0.0`
- predicate: `https://in-toto.io/attestation/release/v0.2`
- expected subject digest: `sha256:7670724a806910fcdc2c9ffb6401e6f2c65a5ff6`
- certificate identity: `https://dotcom.releases.github.com`
- OIDC issuer: `https://token.actions.githubusercontent.com`

The workflow downloads the GitHub source tarball for the tag, computes its SHA-256 digest, compares it with the attested digest, and then verifies the Sigstore bundle with Cosign.

## Local verification

Install GitHub CLI and Cosign, authenticate GitHub CLI if the repository is private, then run:

```bash
GH_TOKEN="${GH_TOKEN:-$(gh auth token)}" \
  ./scripts/verify-release-attestation.sh
```

## CI gate

Workflow:

`.github/workflows/provenance-gate.yml`

It runs on pull requests targeting `main`, pushes to `main`, and manual dispatch.

For branch protection, configure the required status check:

`Verify v7.0.0 Sigstore provenance`

## Important scope

This gate verifies the archived `v7.0.0` release provenance. It is a **baseline provenance control**, not proof that every future `main` commit was independently attested.

For future releases, generate a fresh GitHub artifact attestation for the release artifact and add its bundle to `provenance/attestations/`. Then update the gate to the new release tuple.

GitHub artifact attestations use Sigstore-issued short-lived signing certificates and in-toto statements. Cosign supports verification of blob attestations and Sigstore bundles.
