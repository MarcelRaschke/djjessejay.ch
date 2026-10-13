#!/usr/bin/env bash
# WKD endpoint verification for djjessejay.ch (Direct Method)
# Run after the GitHub Pages deploy has completed.
set -euo pipefail

BASE="https://djjessejay.ch/.well-known/openpgpkey/djjessejay.ch"

status() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$1"; }

echo "[1/3] Policy file (MUST be 200)"
POLICY_CODE="$(status "${BASE}/policy")"
echo "      GET ${BASE}/policy -> ${POLICY_CODE}"
[ "${POLICY_CODE}" = "200" ] || { echo "FAIL: policy file not served" >&2; exit 1; }

echo "[2/3] Key files under hu/ (MUST be 200 each)"
FOUND=0
for HASH_FILE in hu/*; do
  [ -f "${HASH_FILE}" ] || { echo "      hu/ is empty - no keys published yet"; exit 1; }
  case "${HASH_FILE}" in hu/.gitkeep) continue ;; esac
  CODE="$(status "${BASE}/${HASH_FILE}")"
  echo "      GET ${BASE}/${HASH_FILE} -> ${CODE}"
  [ "${CODE}" = "200" ] || { echo "FAIL: key file not served" >&2; exit 1; }
  FOUND=$((FOUND + 1))
done
[ "${FOUND}" -gt 0 ] || { echo "FAIL: no key files found" >&2; exit 1; }

echo "[3/3] Binary format check (first byte = packet tag 0xb4-ish, not ASCII armor)"
for HASH_FILE in hu/*; do
  case "${HASH_FILE}" in hu/.gitkeep) continue ;; esac
  FIRST="$(curl -s --max-time 20 "${BASE}/${HASH_FILE}" | head -c 4)"
  case "${FIRST}" in
    "----") echo "FAIL: ${HASH_FILE} is ASCII armored, WKD requires binary" >&2; exit 1 ;;
  esac
done

echo "WKD OK (${FOUND} key file[s])."
echo "Client check: gpg --locate-keys <local-part>@djjessejay.ch"
