#!/usr/bin/env bash
set -euo pipefail

IN="${1:-}"
OUT="${2:-}"
[[ -n "$IN" && -n "$OUT" ]] || { echo "usage: $0 input.mp4 output-120.mp4" >&2; exit 64; }
command -v ffmpeg >/dev/null || { echo "ffmpeg missing" >&2; exit 69; }
[[ -f "$IN" ]] || { echo "input missing: $IN" >&2; exit 66; }

ffmpeg -hide_banner -y -i "$IN" \
  -vf "minterpolate=fps=120:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart "$OUT"

echo "INTERPOLATED_120FPS: $OUT"
