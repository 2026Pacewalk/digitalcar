#!/usr/bin/env bash
# Server-side deploy script for DigitalCarda.
# Called by GitHub Actions (or manually): bash deploy.sh <branch>
# Assumes: repo already cloned to $APP_DIR, .env present, Node/PM2/MySQL installed.
set -euo pipefail

BRANCH="${1:-main}"
APP_DIR="${APP_DIR:-/var/www/digitalcarda}"

# Report exactly where a failure happened (shows up clearly in the Actions log).
trap 'echo "✗ Deploy FAILED at line $LINENO — last command: [$BASH_COMMAND]" >&2' ERR

# ── Make node/npm/pm2 reachable even in a non-interactive SSH shell ──────────
# GitHub Actions runs this over SSH, which does NOT load nvm (it's guarded to
# interactive shells), so without this the script can die at `npm ci`.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true; fi
if ! command -v node >/dev/null 2>&1 && [ -d "$NVM_DIR/versions/node" ]; then
  NODE_BIN="$(ls -d "$NVM_DIR"/versions/node/*/bin 2>/dev/null | sort -V | tail -1 || true)"
  [ -n "${NODE_BIN:-}" ] && export PATH="$NODE_BIN:$PATH"
fi
export PATH="$PATH:/usr/local/bin:/usr/bin:$HOME/.local/bin"

echo "▶ DigitalCarda deploy — branch: $BRANCH"
for cmd in git node npm pm2; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "✗ '$cmd' not found on PATH — cannot deploy. PATH=$PATH" >&2; exit 1; }
done
echo "▶ Toolchain: node $(node -v), npm $(npm -v), pm2 $(pm2 -v)"

cd "$APP_DIR"

echo "▶ Fetching latest code…"
git fetch --all --prune
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
echo "▶ Now at: $(git log --oneline -1)"

echo "▶ Installing dependencies…"
npm ci --no-audit --no-fund

echo "▶ Building (frontend + server bundle)…"
npm run build

# ── Ensure a persistent JWT signing key (never a public default) ─────────────
# Generated once and appended to .env, so sessions stay stable across restarts.
if ! grep -q '^JWT_SECRET=' .env 2>/dev/null; then
  echo "▶ Generating a persistent JWT_SECRET…"
  SECRET="$(openssl rand -hex 48 2>/dev/null || node -e 'console.log(require("crypto").randomBytes(48).toString("hex"))')"
  printf '\nJWT_SECRET=%s\n' "$SECRET" >> .env
fi

# ── Additive DB migration + first-time catalogue seed ────────────────────────
# 100% additive & idempotent: CREATE TABLE IF NOT EXISTS for the new tables, and
# a catalogue seed that self-skips once products exist. Runs BEFORE the restart
# so if anything fails the deploy aborts (set -e) and the OLD app keeps serving —
# no downtime, no half-migrated state. No existing table or row is ever touched.
echo "▶ Applying additive schema migration…"
node db/migrate-live.mjs
echo "▶ Seeding catalogue (first deploy only)…"
node db/golive-seed.mjs

echo "▶ Restarting app via PM2…"
if pm2 describe digitalcarda > /dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo "✓ Deploy complete — https://digitalcarda.in/  ($(git rev-parse --short HEAD))"
