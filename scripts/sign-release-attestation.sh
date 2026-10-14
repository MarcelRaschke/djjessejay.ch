#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-MarcelRaschke/djjessejay.ch}"
TAG="${TAG:-v7.0.0}"
BUNDLE="${BUNDLE:-provenance/attestations/${TAG}.sigstore.json}"
IDENTITY_FILE="${IDENTITY_FILE:-provenance/attestations/${TAG}.identity}"
PREDICATE_TYPE="https://in-toto.io/attestation/release/v0.2"

command -v gh >/dev/null || { echo "ERROR: gh is required" >&2; exit 2; }
command -v cosign >/dev/null || { echo "ERROR: cosign is required" >&2; exit 2; }

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

artifact="$workdir/tag-${TAG}.gitobj"

echo "::group::Reconstruct signed git tag object"
git fetch --no-tags origin "refs/tags/${TAG}:refs/tags/${TAG}" >/dev/null 2>&1
git cat-file tag "${TAG}" > "$artifact.body"
tag_size="$(wc -c < "$artifact.body")"
{ printf 'tag %s\0' "$tag_size"; cat "$artifact.body"; } > "$artifact"
echo "::endgroup::"

cat > "$workdir/predicate.json" <<PRED
{
  "attestation": {
    "kind": "release",
    "rebuild": false,
    "principal": "${REPO}"
  }
}
PRED

echo "::group::Create keyless Sigstore release attestation"
cosign attest-blob "$artifact" \
  --type "$PREDICATE_TYPE" \
  --predicate "$workdir/predicate.json" \
  --bundle "$BUNDLE"
echo "::endgroup::"

echo "::group::Pin signer identity for the provenance gate"
python3 - "$BUNDLE" > "$workdir/leaf.der" <<'PY'
import base64, json, sys
bundle = json.load(open(sys.argv[1]))
cert = bundle["verificationMaterial"]["certificate"]
sys.stdout.buffer.write(base64.b64decode(cert["rawBytes"]))
PY
identity="$(openssl x509 -inform der -in "$workdir/leaf.der" -noout -ext subjectAltName | sed -n 's/.*URI://p')"
if [[ -z "$identity" ]]; then
  echo "ERROR: could not extract signer identity URI from the attestation certificate." >&2
  exit 1
fi
printf '%s\n' "$identity" > "$IDENTITY_FILE"
echo "pinned identity: $identity"
echo "::endgroup::"

echo "PROVENANCE SIGN: DONE — commit $BUNDLE and $IDENTITY_FILE"
