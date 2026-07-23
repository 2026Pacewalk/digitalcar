#!/usr/bin/env bash
# Server-side deploy script for DigitalCarda.
# Called by GitHub Actions (or manually): bash deploy.sh <branch>
# Assumes: repo already cloned to $APP_DIR, .env present, Node/PM2/MySQL installed.
set -euo pipefail

BRANCH="${1:-main}"
APP_DIR="${APP_DIR:-/var/www/digitalcarda}"

echo "▶ DigitalCarda deploy — branch: $BRANCH"
cd "$APP_DIR"

echo "▶ Fetching latest code…"
git fetch --all --prune
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "▶ Installing dependencies…"
npm ci --no-audit --no-fund

echo "▶ Building (frontend + server bundle)…"
npm run build

# NOTE: DB schema changes are intentionally NOT auto-applied here to protect
# production data. After a schema change, run manually on the server:
#   npm run db:push
# (First-time data seed/import is a one-time step — see DEPLOY.md.)

echo "▶ Restarting app via PM2…"
if pm2 describe digitalcarda > /dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo "✓ Deploy complete — https://digitalcarda.in/"
