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
#
# Weil `set -e` weg ist, muss der curl-Status von Hand weitergereicht werden.
# Ein abgebrochener Transfer (curl 18, "transfer closed with N bytes remaining")
# liefert Status und Header trotzdem vollständig aus: `-w '%{http_code}'` druckt
# dann 200, und die Header-Greps finden ihre Zeilen. Ohne Prüfung von $? meldet
# eine solche Antwort PASS, obwohl kein Transfer sauber zu Ende lief. Deshalb
# geht jeder Aufruf durch fetch_code/fetch_headers, die den Status festhalten
# und bei Transportfehler mit 1 zurückkommen — der Sammel-Runner schreibt FAIL
# und die übrigen Prüfungen laufen weiter.
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

HTTP_CODE=""
fetch_code() { # fetch_code <curl-Argumente...>; setzt HTTP_CODE
  local rc
  HTTP_CODE="$(curl -sS -A "$BROWSER_UA" "${RETRY[@]}" -o /dev/null -w '%{http_code}' "$@")"; rc=$?
  [ "$rc" -eq 0 ] && return 0
  HTTP_CODE=""
  printf '   curl-Transfer fehlgeschlagen (Status %s)\n' "$rc"
  return 1
}

HTTP_HEADERS=""
fetch_headers() { # fetch_headers <curl-Argumente...>; setzt HTTP_HEADERS
  local rc
  HTTP_HEADERS="$(curl -sS -A "$BROWSER_UA" "${RETRY[@]}" -D - -o /dev/null "$@")"; rc=$?
  [ "$rc" -eq 0 ] && return 0
  HTTP_HEADERS=""
  printf '   curl-Transfer fehlgeschlagen (Status %s)\n' "$rc"
  return 1
}

check_health() {
  local body=""
  for _ in 1 2 3 4 5 6; do
    body="$(curl -fsS -A "$HEALTH_UA" "${RETRY[@]}" "$BASE/__wdjjj/health")" && break
    body=""   # Teilantwort eines abgebrochenen Transfers nicht weiterverwenden
    sleep 10
  done
  [ -n "$body" ] || { echo "Health-Endpunkt nicht erreichbar"; return 1; }
  echo "$body"
  grep -q '"ok":true' <<<"$body" && grep -q '"proxy":"wdjjj"' <<<"$body"
}

check_apex() {
  fetch_code -L "$BASE/" || return 1
  echo "Apex: $HTTP_CODE (erwartet 200)"; [ "$HTTP_CODE" = "200" ]
}

check_www() {
  fetch_headers "$WWW/" || return 1
  local loc; loc="$(awk 'tolower($1)=="location:"{print $2}' <<<"$HTTP_HEADERS" | tr -d '\r')"
  echo "www location: ${loc:-(keine)} (erwartet $BASE/)"; [ "$loc" = "$BASE/" ]
}

check_post_static() {
  fetch_code -X POST "$BASE/" || return 1
  echo "POST /: $HTTP_CODE (erwartet 405)"; [ "$HTTP_CODE" = "405" ]
}

check_method_api() {
  fetch_code -X DELETE "$BASE/api/health" || return 1
  echo "DELETE /api/health: $HTTP_CODE (erwartet 405)"; [ "$HTTP_CODE" = "405" ]
}

check_headers() {
  fetch_headers "$BASE/" || return 1
  echo "$HTTP_HEADERS"
  grep -qi '^strict-transport-security:' <<<"$HTTP_HEADERS" &&
  grep -qi '^content-security-policy:' <<<"$HTTP_HEADERS" &&
  grep -qi '^x-content-type-options: nosniff' <<<"$HTTP_HEADERS" &&
  grep -qi '^referrer-policy:' <<<"$HTTP_HEADERS"
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
