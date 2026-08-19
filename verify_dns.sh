#!/usr/bin/env bash
# Read-only DNS/TLS verification for djjessejay.ch.
#
# Usage:
#   ./verify_dns.sh current
#   CLOUDFLARE_NAMESERVERS="name1.ns.cloudflare.com name2.ns.cloudflare.com" \
#     ./verify_dns.sh cloudflare
set -uo pipefail

MODE="${1:-current}"
DOMAIN="djjessejay.ch"
WWW_DOMAIN="www.${DOMAIN}"
ORIGIN_IPV4="185.101.158.113"
ORIGIN_IPV6="2001:1680:101:8bd::1"
EXPECTED_SPF="v=spf1 +mx +a include:_spf.mail.hostserv.eu ~all"
EXPECTED_DMARC="v=DMARC1; p=reject; pct=100"
ALLOW_WILDCARD="${ALLOW_WILDCARD:-0}"

PASSED=0
WARNED=0
FAILED=0

green='\033[0;32m'
yellow='\033[1;33m'
red='\033[0;31m'
reset='\033[0m'

pass() {
  PASSED=$((PASSED + 1))
  printf '%bPASS%b  %s\n' "$green" "$reset" "$1"
}

warn() {
  WARNED=$((WARNED + 1))
  printf '%bWARN%b  %s\n' "$yellow" "$reset" "$1"
  [ -z "${2:-}" ] || printf '      %s\n' "$2"
}

fail() {
  FAILED=$((FAILED + 1))
  printf '%bFAIL%b  %s\n' "$red" "$reset" "$1"
  [ -z "${2:-}" ] || printf '      %s\n' "$2"
}

usage() {
  cat <<'EOF'
Usage:
  ./verify_dns.sh current
  CLOUDFLARE_NAMESERVERS="name1.ns.cloudflare.com name2.ns.cloudflare.com" \
    ./verify_dns.sh cloudflare

Environment:
  ALLOW_WILDCARD=1  Accept a wildcard A/AAAA record after explicit approval.
EOF
}

if [ "$MODE" != "current" ] && [ "$MODE" != "cloudflare" ]; then
  usage
  exit 2
fi

if ! command -v dig >/dev/null 2>&1; then
  printf 'ERROR: dig is required (Debian/Ubuntu package: dnsutils).\n' >&2
  exit 2
fi

normalize_lines() {
  sed '/^[[:space:]]*$/d' |
    tr '[:upper:]' '[:lower:]' |
    sed 's/[[:space:]]*$//' |
    sort -u
}

normalize_fqdn_lines() {
  normalize_lines | sed 's/\.$//'
}

same_set() {
  [ "$(printf '%s\n' "$1" | normalize_fqdn_lines)" =     "$(printf '%s\n' "$2" | normalize_fqdn_lines)" ]
}

query() {
  local type="$1"
  local name="$2"
  dig +time=5 +tries=2 +short "$type" "$name" 2>/dev/null || true
}

printf 'DNS/TLS verification: %s (%s mode)\n' "$DOMAIN" "$MODE"
printf 'Timestamp: %s\n\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

actual_ns="$(query NS "$DOMAIN")"
if [ "$MODE" = "current" ]; then
  expected_ns=$'ns1.hosttech.ch\nns2.hosttech.ch\nns3.hosttech.ch'
else
  if [ -z "${CLOUDFLARE_NAMESERVERS:-}" ]; then
    fail "Cloudflare nameserver expectation missing"       "Set CLOUDFLARE_NAMESERVERS to the exact pair assigned to this zone."
    expected_ns=""
  else
    expected_ns="$(printf '%s\n' $CLOUDFLARE_NAMESERVERS)"
  fi
fi

if [ -n "$expected_ns" ] && same_set "$actual_ns" "$expected_ns"; then
  pass "Authoritative nameservers match the $MODE baseline"
else
  fail "Authoritative nameservers do not match the $MODE baseline"     "Actual: $(printf '%s' "$actual_ns" | paste -sd ' ' -)"
fi

actual_a="$(query A "$DOMAIN" | normalize_lines)"
actual_aaaa="$(query AAAA "$DOMAIN" | normalize_lines)"
www_a="$(query A "$WWW_DOMAIN" | normalize_lines)"
www_aaaa="$(query AAAA "$WWW_DOMAIN" | normalize_lines)"

if [ "$MODE" = "current" ]; then
  [ "$actual_a" = "$ORIGIN_IPV4" ] &&
    pass "A apex points to the current IPv4 origin" ||
    fail "Unexpected apex A record" "Actual: $actual_a"

  [ "$actual_aaaa" = "$ORIGIN_IPV6" ] &&
    pass "AAAA apex points to the current IPv6 origin" ||
    fail "Unexpected apex AAAA record" "Actual: $actual_aaaa"

  [ "$www_a" = "$ORIGIN_IPV4" ] &&
    pass "www resolves to the current IPv4 origin" ||
    fail "Unexpected www A record" "Actual: $www_a"
else
  if [ -n "$actual_a" ] && ! printf '%s\n' "$actual_a" | grep -Fxq "$ORIGIN_IPV4"; then
    pass "Apex A no longer exposes the IPv4 origin"
  else
    fail "Apex A is empty or still exposes the IPv4 origin" "Actual: $actual_a"
  fi

  if [ -n "$actual_aaaa" ] && ! printf '%s\n' "$actual_aaaa" | grep -Fxq "$ORIGIN_IPV6"; then
    pass "Apex AAAA no longer exposes the IPv6 origin"
  else
    fail "Apex AAAA is empty or still exposes the IPv6 origin" "Actual: $actual_aaaa"
  fi

  if [ -n "$www_a$www_aaaa" ] &&
    ! printf '%s\n%s\n' "$www_a" "$www_aaaa" |
      grep -Fxe "$ORIGIN_IPV4" -e "$ORIGIN_IPV6" >/dev/null; then
    pass "www resolves without exposing either origin address"
  else
    fail "www is empty or still exposes an origin address"       "A: $www_a; AAAA: $www_aaaa"
  fi
fi

actual_mx="$(query MX "$DOMAIN" | normalize_fqdn_lines)"
expected_mx=$'10 mail1.hosttech.eu\n10 mail2.hosttech.eu'
if same_set "$actual_mx" "$expected_mx"; then
  pass "Hosttech MX records are preserved"
else
  fail "MX records changed" "Actual: $(printf '%s' "$actual_mx" | paste -sd ';' -)"
fi

actual_spf="$(
  query TXT "$DOMAIN" |
    tr -d '"' |
    grep '^v=spf1 ' |
    head -n 1
)"
if [ "$actual_spf" = "$EXPECTED_SPF" ]; then
  pass "SPF matches the approved Hosttech baseline"
else
  fail "SPF differs from the approved baseline" "Actual: $actual_spf"
fi

actual_dmarc="$(
  query TXT "_dmarc.$DOMAIN" |
    tr -d '"' |
    grep '^v=DMARC1;' |
    head -n 1
)"
if [ "$actual_dmarc" = "$EXPECTED_DMARC" ]; then
  pass "DMARC reject policy is present"
else
  fail "DMARC differs from the approved baseline" "Actual: $actual_dmarc"
fi

actual_ds="$(query DS "$DOMAIN")"
if [ -n "$actual_ds" ]; then
  pass "A parent DS record is published"
else
  fail "No parent DS record is published"     "DNSSEC is absent or in an intentionally unsigned migration window."
fi

wildcard_label="dns-audit-$RANDOM-$RANDOM.$DOMAIN"
wildcard_a="$(query A "$wildcard_label" | normalize_lines)"
wildcard_aaaa="$(query AAAA "$wildcard_label" | normalize_lines)"
if [ -z "$wildcard_a$wildcard_aaaa" ]; then
  pass "No wildcard A/AAAA response was observed"
elif [ "$ALLOW_WILDCARD" = "1" ]; then
  warn "Wildcard A/AAAA is present and explicitly allowed"     "A: $wildcard_a; AAAA: $wildcard_aaaa"
elif [ "$MODE" = "current" ]; then
  warn "Current zone has wildcard A/AAAA records"     "A: $wildcard_a; AAAA: $wildcard_aaaa"
else
  fail "Cloudflare target unexpectedly has wildcard A/AAAA records"     "A: $wildcard_a; AAAA: $wildcard_aaaa"
fi

actual_caa="$(query CAA "$DOMAIN")"
if [ -n "$actual_caa" ]; then
  pass "CAA records are present"
else
  warn "No CAA restriction is published"     "Inventory the active certificate issuers before adding CAA."
fi

mta_sts="$(query TXT "_mta-sts.$DOMAIN")"
tls_rpt="$(query TXT "_smtp._tls.$DOMAIN")"
[ -n "$mta_sts" ] &&
  pass "MTA-STS discovery record is present" ||
  warn "MTA-STS discovery record is absent"
[ -n "$tls_rpt" ] &&
  pass "SMTP TLS reporting record is present" ||
  warn "SMTP TLS reporting record is absent"

if command -v curl >/dev/null 2>&1; then
  https_code="$(
    curl --silent --show-error --output /dev/null       --write-out '%{http_code}' --max-time 15 "https://$DOMAIN/" 2>/dev/null ||
      true
  )"
  case "$https_code" in
    200|204|301|302|307|308)
      pass "HTTPS apex responds successfully ($https_code)"
      ;;
    *)
      fail "HTTPS apex did not return an accepted status" "Actual: $https_code"
      ;;
  esac

  http_code="$(
    curl --silent --output /dev/null --write-out '%{http_code}'       --max-time 15 "http://$DOMAIN/" 2>/dev/null || true
  )"
  case "$http_code" in
    301|302|307|308)
      pass "HTTP redirects to HTTPS ($http_code)"
      ;;
    *)
      warn "HTTP did not return a redirect status" "Actual: $http_code"
      ;;
  esac

  if [ "$MODE" = "cloudflare" ]; then
    headers="$(curl --silent --show-error --head --max-time 15 "https://$DOMAIN/" 2>/dev/null || true)"
    if printf '%s\n' "$headers" | grep -Eiq '^(cf-ray:|server:[[:space:]]*cloudflare)'; then
      pass "Cloudflare edge headers are visible"
    else
      fail "Cloudflare edge headers were not observed"
    fi
  fi
else
  warn "curl is unavailable; HTTPS checks were skipped"
fi

printf '\nSummary: %s passed, %s warnings, %s failed\n'   "$PASSED" "$WARNED" "$FAILED"

[ "$FAILED" -eq 0 ]
