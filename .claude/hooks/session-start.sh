#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "=== Session Start Hook ==="

# Install Python dependencies for web_scraper
if [ -f "$CLAUDE_PROJECT_DIR/web_scraper/requirements.txt" ]; then
  echo "Installing Python dependencies..."
  pip install --quiet -r "$CLAUDE_PROJECT_DIR/web_scraper/requirements.txt"
  echo "✓ Python dependencies installed"
fi

# Install flake8 for Python linting
echo "Installing linting tools..."
pip install --quiet flake8
echo "✓ flake8 installed"

echo "=== Setup complete ==="
