#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VIDEO="$ROOT/video"
SHOT="${1:-}"
BACKEND="${2:-ltx2}"

case "$SHOT" in
  01) NAME="frequency-lock" ;;
  02) NAME="awakening" ;;
  03) NAME="break-seal" ;;
  04) NAME="materialization" ;;
  05) NAME="performance" ;;
  06) NAME="portal" ;;
  *) echo "usage: $0 {01|02|03|04|05|06} {ltx2|hunyuancustom}" >&2; exit 64 ;;
esac

case "$BACKEND" in
  ltx2|hunyuancustom) ;;
  *) echo "unsupported backend: $BACKEND" >&2; exit 64 ;;
esac

PROMPT="$VIDEO/prompts/shot-$SHOT-$NAME.md"
NEG="$VIDEO/prompts/negative-prompt.txt"
LOCK="$VIDEO/character/CHARACTER_LOCK.md"
ADAPTER="$VIDEO/workflows/$BACKEND/generate.sh"
JOBDIR="$VIDEO/output/jobs/shot-$SHOT"
mkdir -p "$JOBDIR"

python3 - "$PROMPT" "$NEG" "$LOCK" "$BACKEND" "$SHOT" "$JOBDIR/job.json" <<'PY'
import datetime
import hashlib
import json
import pathlib
import sys

prompt, neg, lock, backend, shot, out = sys.argv[1:7]

def sha256(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()

job = {
    "schema": "djjessejay.video.job/v1",
    "shot": shot,
    "backend": backend,
    "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "prompt_file": str(pathlib.Path(prompt)),
    "prompt_sha256": sha256(prompt),
    "negative_prompt_file": str(pathlib.Path(neg)),
    "negative_prompt_sha256": sha256(neg),
    "character_lock_file": str(pathlib.Path(lock)),
    "character_lock_sha256": sha256(lock),
    "status": "compiled"
}
pathlib.Path(out).write_text(json.dumps(job, indent=2) + "\n", encoding="utf-8")
PY

echo "compiled: $JOBDIR/job.json"
if [[ -x "$ADAPTER" ]]; then
  exec "$ADAPTER" "$PROMPT" "$NEG" "$JOBDIR"
fi

echo "GENERATION_BACKEND_MISSING: no executable adapter at $ADAPTER" >&2
echo "Job compiled successfully; no render was claimed." >&2
exit 78
