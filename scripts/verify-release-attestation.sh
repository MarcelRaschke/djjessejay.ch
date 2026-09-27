#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-MarcelRaschke/djjessejay.ch}"
TAG="${TAG:-v7.0.0}"
BUNDLE="${BUNDLE:-provenance/attestations/v7.0.0.sigstore.json}"
EXPECTED_DIGEST="${EXPECTED_DIGEST:-7670724a806910fcdc2c9ffb6401e6f2c65a5ff6}"
CERT_IDENTITY="${CERT_IDENTITY:-https://dotcom.releases.github.com}"
CERT_ISSUER="${CERT_ISSUER:-https://token.actions.githubusercontent.com}"
PREDICATE_TYPE="https://in-toto.io/attestation/release/v0.2"

command -v gh >/dev/null || { echo "ERROR: gh is required" >&2; exit 2; }
command -v cosign >/dev/null || { echo "ERROR: cosign is required" >&2; exit 2; }
test -s "$BUNDLE" || { echo "ERROR: missing attestation bundle: $BUNDLE" >&2; exit 2; }

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

artifact="$workdir/source-${TAG}.tar.gz"

echo "::group::Download GitHub source tarball"
gh api "repos/${REPO}/tarball/${TAG}" > "$artifact"
echo "::endgroup::"

actual_digest="$(sha256sum "$artifact" | awk '{print $1}')"
echo "expected sha256: $EXPECTED_DIGEST"
echo "actual   sha256: $actual_digest"

if [[ "$actual_digest" != "$EXPECTED_DIGEST" ]]; then
  echo "ERROR: source tarball digest does not match the archived attestation subject." >&2
  exit 1
fi

echo "::group::Verify Sigstore/In-Toto release attestation"
cosign verify-blob-attestation "$artifact" \
  --bundle "$BUNDLE" \
  --new-bundle-format \
  --type "$PREDICATE_TYPE" \
  --certificate-oidc-issuer "$CERT_ISSUER" \
  --certificate-identity "$CERT_IDENTITY"
echo "::endgroup::"

echo "PROVENANCE GATE: PASS"
