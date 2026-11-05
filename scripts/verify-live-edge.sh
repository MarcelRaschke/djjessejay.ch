#!/usr/bin/env bash
# Live-Assertions für den wdjjj-Edge. Braucht kein Credential.
#
# Eine Quelle für beide Aufrufer in .github/workflows/deploy-wdjjj.yml: der
# `verify`-Job prüft damit den Dauerzustand, und der Notfallpfad
# `deploy-with-token` ruft dasselbe Skript NACH dem Upload auf. Ohne das
# zweite wäre ein Notfall-Deploy grün, obwohl die Assertions nur den
# vorherigen Worker gesehen haben — die Jobs laufen nebenläufig. Wer hier
# etwas ändert, ändert es für beide; das ist der Zweck.
set -euo pipefail

BASE="${EDGE_BASE_URL:-https://djjessejay.ch}"
BROWSER_UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
HEALTH_UA="wdjjj-healthcheck/1.0 (+https://github.com/MarcelRaschke/djjessejay.ch ci smoke test)"

echo "== Worker health =="
health_ok=0
for attempt in 1 2 3 4 5 6; do
  if body="$(curl -fsS -A "$HEALTH_UA" "$BASE/__wdjjj/health")"; then
    echo "$body"
    echo "$body" | grep -q '"ok":true'
    echo "$body" | grep -q '"proxy":"wdjjj"'
    health_ok=1
    break
  fi
  sleep 10
done
if [ "$health_ok" -ne 1 ]; then
  echo "Cloudflare Worker health check failed" >&2
  exit 1
fi

echo "== Apex =="
code="$(curl -sS -A "$BROWSER_UA" -L --retry 5 --retry-delay 3 -o /dev/null -w '%{http_code}' "$BASE/")"
echo "Apex HTTP status: $code"
test "$code" = "200"

echo "== Security headers =="
headers="$(curl -sS -A "$BROWSER_UA" --retry 5 --retry-delay 3 -D - -o /dev/null "$BASE/")"
echo "$headers"
echo "$headers" | grep -qi '^strict-transport-security:'
echo "$headers" | grep -qi '^content-security-policy:'
echo "$headers" | grep -qi '^x-content-type-options: nosniff'
echo "$headers" | grep -qi '^referrer-policy:'

echo "== POST rejection =="
code="$(curl -sS -A "$BROWSER_UA" --retry 5 --retry-delay 3 -o /dev/null -w '%{http_code}' -X POST "$BASE/")"
echo "POST HTTP status: $code"
test "$code" = "405"

echo "Alle Live-Assertions bestanden."
