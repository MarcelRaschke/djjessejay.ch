#!/usr/bin/env bash
# Shared Pages cleanup. Run only in a disposable checkout after building CSS.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f -- *.sql *.xml
rm -f -- *.mov *.mp4 *.webm
rm -f -- *.swf
rm -f -- home.html home.htm
rm -rf -- web_scraper
rm -f -- *.md CONTRIBUTING.md CODE_OF_CONDUCT.md LICENSE
rm -f -- michi.swf get_flashplayer_88_31.gif
rm -rf -- node_modules
