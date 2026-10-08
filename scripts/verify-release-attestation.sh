#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-MarcelRaschke/djjessejay.ch}"
TAG="${TAG:-v7.0.0}"
BUNDLE="${BUNDLE:-provenance/attestations/${TAG}.sigstore.json}"
IDENTITY_FILE="${BUNDLE%.sigstore.json}.identity"
EXPECTED_DIGEST="${EXPECTED_DIGEST:-7670724a806910fcdc2c9ffb6401e6f2c65a5ff6}"
CERT_ISSUER="${CERT_ISSUER:-https://token.actions.githubusercontent.com}"
PREDICATE_TYPE="https://in-toto.io/attestation/release/v0.2"

command -v gh >/dev/null || { echo "ERROR: gh is required" >&2; exit 2; }
command -v cosign >/dev/null || { echo "ERROR: cosign is required" >&2; exit 2; }
test -s "$BUNDLE" || { echo "ERROR: missing attestation bundle: $BUNDLE" >&2; exit 2; }

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

artifact="$workdir/tag-${TAG}.gitobj"

echo "::group::Reconstruct signed git tag object"
git fetch --no-tags origin "refs/tags/${TAG}:refs/tags/${TAG}" >/dev/null 2>&1
git cat-file tag "${TAG}" > "$artifact.body"
tag_size="$(wc -c < "$artifact.body")"
{ printf 'tag %s\0' "$tag_size"; cat "$artifact.body"; } > "$artifact"
echo "::endgroup::"

actual_digest="$(sha1sum "$artifact" | awk '{print $1}')"
echo "expected sha1:  $EXPECTED_DIGEST"
echo "actual   sha1:  $actual_digest"

if [[ "$actual_digest" != "$EXPECTED_DIGEST" ]]; then
  echo "ERROR: source tarball digest does not match the archived attestation subject." >&2
  exit 1
fi

if [[ -s "$IDENTITY_FILE" ]]; then
  CERT_IDENTITY="$(head -n1 "$IDENTITY_FILE")"
  echo "using pinned signer identity: $CERT_IDENTITY"
else
  CERT_IDENTITY="${CERT_IDENTITY:-https://dotcom.releases.github.com}"
  echo "WARN: no identity file for $TAG; falling back to $CERT_IDENTITY" >&2
fi

echo "::group::Verify Sigstore/In-Toto release attestation"
cosign verify-blob-attestation "$artifact" \
  --bundle "$BUNDLE" \
  --type "$PREDICATE_TYPE" \
  --certificate-oidc-issuer "$CERT_ISSUER" \
  --certificate-identity "$CERT_IDENTITY"
echo "::endgroup::"

echo "PROVENANCE GATE: PASS"
