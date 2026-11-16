#!/usr/bin/env bash
# Live-Assertions für den wdjjj-Edge. Braucht kein Credential.
#
# EINZIGE QUELLE dieser Prüfungen. Aufgerufen von
#   .github/workflows/deploy-wdjjj.yml   (Job `verify`, und nach dem Notfall-Upload)
#   .github/workflows/live-site-smoke.yml (täglicher Lauf, hinter dem Readiness-Gate)
# Wer hier etwas ändert, ändert es für beide. Das ist der Zweck: vorher standen
# vier Assertions hier und sechs im Smoke-Workflow, und die zwei fehlenden waren
# genau die, die den Ausfall vom 2026-11-13 gemeldet haben.
#
# Es laufen ALLE Prüfungen, auch nach einem Fehlschlag, und am Ende steht eine
# Übersicht. Ein frühes `set -e` hat am 2026-11-14 die drei Prüfungen nach der
# fehlgeschlagenen übersprungen — damit war nicht zu sehen, ob sonst noch etwas
# kaputt war.
set -uo pipefail

BASE="${EDGE_BASE_URL:-https://djjessejay.ch}"
WWW="${EDGE_WWW_URL:-https://www.djjessejay.ch}"
BROWSER_UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
HEALTH_UA="wdjjj-healthcheck/1.0 (+https://github.com/MarcelRaschke/djjessejay.ch ci smoke test)"
RETRY=(--retry 3 --retry-delay 2)

names=(); results=()
record() { names+=("$1"); results+=("$2"); }
run() { # run <Name> <Funktion>
  printf '\n== %s ==\n' "$1"
  if "$2"; then record "$1" PASS; else record "$1" FAIL; printf '   -> FEHLGESCHLAGEN: %s\n' "$1"; fi
}

check_health() {
  local body
  for _ in 1 2 3 4 5 6; do
    body="$(curl -fsS -A "$HEALTH_UA" "${RETRY[@]}" "$BASE/__wdjjj/health")" && break
    sleep 10
  done
  [ -n "${body:-}" ] || { echo "Health-Endpunkt nicht erreichbar"; return 1; }
  echo "$body"
  grep -q '"ok":true' <<<"$body" && grep -q '"proxy":"wdjjj"' <<<"$body"
}

check_apex() {
  local code; code="$(curl -sS -A "$BROWSER_UA" -L "${RETRY[@]}" -o /dev/null -w '%{http_code}' "$BASE/")"
  echo "Apex: $code (erwartet 200)"; [ "$code" = "200" ]
}

check_www() {
  local loc; loc="$(curl -sS -A "$BROWSER_UA" "${RETRY[@]}" -D - -o /dev/null "$WWW/" | awk 'tolower($1)=="location:"{print $2}' | tr -d '\r')"
  echo "www location: ${loc:-(keine)} (erwartet $BASE/)"; [ "$loc" = "$BASE/" ]
}

check_post_static() {
  local code; code="$(curl -sS -A "$BROWSER_UA" "${RETRY[@]}" -o /dev/null -w '%{http_code}' -X POST "$BASE/")"
  echo "POST /: $code (erwartet 405)"; [ "$code" = "405" ]
}

check_method_api() {
  local code; code="$(curl -sS -A "$BROWSER_UA" "${RETRY[@]}" -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/health")"
  echo "DELETE /api/health: $code (erwartet 405)"; [ "$code" = "405" ]
}

check_headers() {
  local h; h="$(curl -sS -A "$BROWSER_UA" "${RETRY[@]}" -D - -o /dev/null "$BASE/")"
  echo "$h"
  grep -qi '^strict-transport-security:' <<<"$h" &&
  grep -qi '^content-security-policy:' <<<"$h" &&
  grep -qi '^x-content-type-options: nosniff' <<<"$h" &&
  grep -qi '^referrer-policy:' <<<"$h"
}

run "Health endpoint"                        check_health
run "Apex returns a successful response"     check_apex
run "WWW redirects to apex"                  check_www
run "Mutating request on static path is rejected" check_post_static
run "Disallowed method on API path is rejected"   check_method_api
run "Security headers are present"           check_headers

printf '\n== Übersicht ==\n'
failed=0
for i in "${!names[@]}"; do
  printf '%-50s %s\n' "${names[$i]}" "${results[$i]}"
  [ "${results[$i]}" = "FAIL" ] && failed=$((failed+1))
done
if [ "$failed" -gt 0 ]; then
  printf '\n%s von %s Prüfungen fehlgeschlagen.\n' "$failed" "${#names[@]}" >&2
  exit 1
fi
printf '\nAlle %s Prüfungen bestanden.\n' "${#names[@]}"
