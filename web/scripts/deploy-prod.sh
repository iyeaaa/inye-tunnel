#!/bin/bash
# Production build and deploy script for InyeTunnel launchd daemon
# Usage: ./scripts/deploy-prod.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_LABEL="kr.mo.ai.inyetunnel"

cd "$WEB_DIR"

echo "=== InyeTunnel Production Deploy ==="

# 1. Ensure native modules
echo "[1/4] Ensuring native modules..."
node scripts/ensure-native-modules.js 2>/dev/null || true

# 2. Build server bundle
echo "[2/4] Building server..."
node -e "
const esbuild = require('esbuild');
esbuild.build({
  entryPoints: ['src/server/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/vibetunnel-cli.js',
  external: ['node-pty', 'fsevents', 'authenticate-pam'],
  sourcemap: true,
  define: { 'process.env.NODE_ENV': '\"production\"' },
}).then(() => console.log('Server build done'));
"

# 3. Build client bundle
echo "[3/4] Building client..."
node -e "
const esbuild = require('esbuild');
const { prodOptions } = require('./scripts/esbuild-config.js');
const opts = { ...prodOptions, plugins: [] };
esbuild.build({
  ...opts,
  entryPoints: ['src/client/app-entry.ts'],
  outfile: 'public/bundle/client-bundle.js',
}).then(() => console.log('Client build done'));
"

# 4. Restart daemon
echo "[4/4] Restarting daemon..."
launchctl kickstart -k "gui/$(id -u)/$PLIST_LABEL" 2>/dev/null || {
  echo "Daemon not loaded, loading..."
  launchctl load ~/Library/LaunchAgents/${PLIST_LABEL}.plist
}

sleep 2

# Verify
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:4020/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "=== Deploy complete! Server running at http://localhost:4020/ ==="
else
  echo ""
  echo "=== WARNING: Server not responding (HTTP $HTTP_CODE) ==="
  echo "Check logs: tail -f ~/.vibetunnel/inyetunnel.error.log"
fi
