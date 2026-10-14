#!/usr/bin/env bash
# WKD publish helper for djjessejay.ch
# Spec: draft-koch-openpgp-webkey-service
# Exports a public key in binary form under its WKD Z-Base-32 hash name.
#
# Usage: scripts/wkd-publish.sh <local-part> [key-id]
#   <local-part>  local part of the mail address (e.g. "cy8er", "info")
#   [key-id]     optional key id/fingerprint to export;
#                defaults to <local-part>@djjessejay.ch
#
# Preconditions: gpg >= 2.1 with the key in the local keyring.
# The key MUST carry a User ID matching <local-part>@djjessejay.ch.
set -euo pipefail

DOMAIN="djjessejay.ch"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Direct Method layout (draft-koch-openpgp-webkey-service, Section 3.1):
#   https://<domain>/.well-known/openpgpkey/hu/<hash>
# The <domain> path segment exists only in the Advanced Method.
WKD_ROOT="${REPO_ROOT}/.well-known/openpgpkey/hu"
ZBASE32='[ybndrfg8ejkmcpqxot1uwisza345h769]{32}'

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <local-part> [key-id]" >&2
  exit 1
fi

LOCAL_PART="$1"
KEY_ID="${2:-${LOCAL_PART}@${DOMAIN}}"
ADDRESS="${LOCAL_PART}@${DOMAIN}"

command -v gpg >/dev/null 2>&1 || { echo "gpg not found in PATH" >&2; exit 1; }

if ! gpg --list-keys "${ADDRESS}" >/dev/null 2>&1; then
  echo "ERROR: no public key with User ID <${ADDRESS}> in local keyring." >&2
  exit 1
fi

HASH="$(gpg --with-wkd-hash --list-keys "${ADDRESS}" 2>/dev/null \
  | grep -Eo "^${ZBASE32}" | head -n1)"

if [ -z "${HASH}" ]; then
  echo "ERROR: could not extract WKD hash for ${ADDRESS}." >&2
  exit 1
fi

mkdir -p "${WKD_ROOT}"

# Binary export (no --armor): WKD keys MUST NOT be ASCII armored.
gpg --export "${KEY_ID}" > "${WKD_ROOT}/${HASH}"

SIZE="$(wc -c < "${WKD_ROOT}/${HASH}")"
if [ "${SIZE}" -le 1024 ]; then
  echo "ERROR: exported key implausibly small (${SIZE} bytes), aborting." >&2
  rm -f "${WKD_ROOT}/${HASH}"
  exit 1
fi

echo "Published: ${ADDRESS} -> ${WKD_ROOT#"${REPO_ROOT}"/}/${HASH} (${SIZE} bytes, binary)"
echo "Next: commit, push, wait for Pages deploy, then run scripts/wkd-verify.sh"
echo "Client verification: gpg --locate-keys ${ADDRESS}"
