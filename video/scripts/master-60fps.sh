#!/usr/bin/env bash
set -euo pipefail

IN="${1:-}"
OUT="${2:-}"
[[ -n "$IN" && -n "$OUT" ]] || { echo "usage: $0 input.mp4 master-60.mp4" >&2; exit 64; }
command -v ffmpeg >/dev/null || { echo "ffmpeg missing" >&2; exit 69; }
[[ -f "$IN" ]] || { echo "input missing: $IN" >&2; exit 66; }

ffmpeg -hide_banner -y -i "$IN" \
  -vf "fps=60,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart "$OUT"

echo "MASTER_1080P60: $OUT"
