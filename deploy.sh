#!/usr/bin/env bash
# Deploy djjessejay.ch to the custom origin server (Option 2: custom server + Cloudflare proxy).
#
# Builds the static site, prunes large/legacy files, and syncs the result to the
# origin server via rsync over SSH. Cloudflare (proxied A record) serves the site
# to visitors with DDoS protection, caching and SSL termination.
#
# Required environment variables:
#   DEPLOY_USER   SSH user on the origin server
#   DEPLOY_HOST   Origin server hostname or IP (default: 185.101.158.113)
#   DEPLOY_PATH   Document root on the origin server
#
# Optional environment variables:
#   DEPLOY_PORT   SSH port (default: 22)
#   SSH_KEY        Path to a private SSH key (default: agent / ~/.ssh)
#   RSYNC_DELETE   Set to "1" to delete remote files not present locally (default: 1)
#
# Usage:
#   DEPLOY_USER=deploy DEPLOY_PATH=/var/www/djjessejay.ch ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

# --- Configuration ----------------------------------------------------------
DEPLOY_HOST="${DEPLOY_HOST:-185.101.158.113}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
RSYNC_DELETE="${RSYNC_DELETE:-1}"
SSH_KEY="${SSH_KEY:-}"

: "${DEPLOY_USER:?DEPLOY_USER is required (SSH user on the origin server)}"
: "${DEPLOY_PATH:?DEPLOY_PATH is required (document root on the origin server)}"

# --- Build CSS (Tailwind) ---------------------------------------------------
if [ -f package.json ] && node -e "process.exit(('build:css' in (require('./package.json').scripts||{})) ? 0 : 1)"; then
    echo "→ Building CSS with Tailwind"
    npm run build:css
fi

# --- Staging directory ------------------------------------------------------
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "→ Staging site in $STAGE"
rsync -a --exclude='.git/' --exclude='node_modules/' \
    --exclude='.github/' --exclude='.env' --exclude='.env.*' \
    ./ "$STAGE/"

# --- Prune large / legacy files (mirrors static.yml) ------------------------
echo "→ Pruning large and legacy files"
# Database dumps (SQL/XML archives)
rm -f "$STAGE"/*.sql "$STAGE"/*.xml
# Video files (large legacy assets)
rm -f "$STAGE"/*.mov "$STAGE"/*.mp4 "$STAGE"/*.webm
# Flash files (non-functional)
rm -f "$STAGE"/*.swf
# Old HTML versions (not needed for deploy)
rm -f "$STAGE"/home.html "$STAGE"/home.htm
# Web scraper utility (not site content)
rm -rf "$STAGE"/web_scraper
# Markdown docs and license (not served, just metadata)
rm -f "$STAGE"/*.md "$STAGE"/CONTRIBUTING.md "$STAGE"/CODE_OF_CONDUCT.md "$STAGE"/LICENSE
# Legacy files
rm -f "$STAGE"/michi.swf "$STAGE"/get_flashplayer_88_31.gif
# Deployment artefacts (never served)
rm -f "$STAGE"/deploy.sh "$STAGE"/verify_dns.sh

# The CNAME file is a GitHub Pages artefact and must not be deployed to the
# custom server — remove it if it was checked in.
rm -f "$STAGE"/CNAME

# --- rsync to origin --------------------------------------------------------
SSH_OPTS=(-p "$DEPLOY_PORT")
if [ -n "$SSH_KEY" ]; then
    SSH_OPTS+=(-i "$SSH_KEY")
fi
SSH_OPTS+=( -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 )

DELETE_FLAG="--delete"
if [ "$RSYNC_DELETE" != "1" ]; then
    DELETE_FLAG=""
fi

echo "→ Syncing to ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH} (port ${DEPLOY_PORT})"
rsync -az --checksum $DELETE_FLAG \
    -e "ssh ${SSH_OPTS[*]}" \
    "$STAGE/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "✓ Deployed to ${DEPLOY_HOST}:${DEPLOY_PATH}"
echo "  Cloudflare (proxied) serves visitors from this origin."
echo "  Verify: https://djjessejay.ch/"
