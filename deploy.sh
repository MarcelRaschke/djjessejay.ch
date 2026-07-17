#!/usr/bin/env bash
# Static site — no build step. This ensures the GitHub Pages custom domain
# file exists and pushes the current branch; actual deployment happens via
# static.yml once this branch is merged into main.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f CNAME ] || [ "$(cat CNAME)" != "djjessejay.ch" ]; then
    echo "djjessejay.ch" > CNAME
    git add CNAME
    git commit -s -m "Add CNAME for djjessejay.ch custom domain"
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git push -u origin "$BRANCH"

echo "Pushed '$BRANCH'. Merge the PR into main to trigger the static.yml GitHub Pages deploy."
