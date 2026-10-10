#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-MarcelRaschke/djjessejay.ch}"
TAG="${TAG:-v7.0.0}"
BUNDLE="${BUNDLE:-provenance/attestations/${TAG}.sigstore.json}"
IDENTITY_FILE="${BUNDLE%.sigstore.json}.identity"
EXPECTED_DIGEST="${EXPECTED_DIGEST:-7670724a806910fcdc2c9ffb6401e6f2c65a5ff6}"
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

echo "::group::Fetch GitHub trusted root"
# The attestation leaf certificate chains to GitHub's hosted Fulcio CA
# (fulcio.githubapp.com), which is not part of the public Sigstore TUF trust
# root that cosign uses by default. `gh attestation trusted-root` returns
# one JSON object per line; keep the GitHub-hosted instance entry.
if ! gh attestation trusted-root > "$workdir/trusted-root.jsonl"; then
  echo "ERROR: unable to fetch GitHub attestation trusted root." >&2
  exit 1
fi
python3 - "$workdir/trusted-root.jsonl" "$workdir/github-trusted-root.json" <<'PY'
import json, sys
src, dst = sys.argv[1], sys.argv[2]
with open(src) as fh:
    for line in fh:
        line = line.strip()
        if not line:
            continue
        obj = json.loads(line)
        cas = obj.get("certificateAuthorities", [])
        if any(ca.get("uri") == "fulcio.githubapp.com" for ca in cas):
            with open(dst, "w") as out:
                json.dump(obj, out)
            sys.exit(0)
sys.exit("ERROR: GitHub-hosted Fulcio trust root not found")
PY
echo "::endgroup::"

echo "::group::Verify Sigstore/In-Toto release attestation"
# GitHub's hosted Fulcio leaf certificates do not carry the OIDC issuer
# extension, so the issuer is matched permissively while the identity
# (SAN URI) is pinned. The in-toto subject digest is a git tag-object sha1,
# so it is passed explicitly instead of the blob's sha256.
cosign verify-blob-attestation \
  --bundle "$BUNDLE" \
  --new-bundle-format \
  --trusted-root "$workdir/github-trusted-root.json" \
  --insecure-ignore-sct \
  --insecure-ignore-tlog \
  --type "$PREDICATE_TYPE" \
  --certificate-oidc-issuer-regexp ".*" \
  --certificate-identity "$CERT_IDENTITY" \
  --digest "$EXPECTED_DIGEST" \
  --digestAlg sha1
echo "::endgroup::"

echo "PROVENANCE GATE: PASS"
