#!/usr/bin/env bash
# Remote backup → restore (Phase 2). Prereqs: migrated Supabase DB, Cloudflare R2 bucket + API token,
# `npm run build`, Next app reachable at CCB_API_URL, valid user JWT.
#
# Required env:
#   CCB_API_URL        — e.g. http://localhost:3000
#   CCB_ACCESS_TOKEN   — Supabase access_token for user A
#
# Optional:
#   CCB_E2E_INTEGRATION=1 — informational; tests read this in Vitest
#   SECOND_ACCESS_TOKEN   — if set, verify list returns 403/empty for user B (best-effort)
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_ROOT="$(mktemp -d)"
WORK_DIR="$TMP_ROOT/workspace"
HOME_DIR="$TMP_ROOT/home"
CLI_JS="$ROOT_DIR/packages/cli/dist/index.js"

if [[ -z "${CCB_API_URL:-}" || -z "${CCB_ACCESS_TOKEN:-}" ]]; then
  echo "Set CCB_API_URL and CCB_ACCESS_TOKEN." >&2
  exit 2
fi

if [[ ! -f "$CLI_JS" ]]; then
  echo "Run npm run build first (missing $CLI_JS)." >&2
  exit 2
fi

mkdir -p "$WORK_DIR/payload/skills" "$HOME_DIR"
echo "remote e2e skill" > "$WORK_DIR/payload/skills/demo.md"

cd "$ROOT_DIR"
npm run build

export HOME="$HOME_DIR"
export BUNDLE_CLI_NONINTERACTIVE=1
export BUNDLE_CLI_NAME="Remote E2E"
export BUNDLE_CLI_VISIBILITY="private"
export BUNDLE_CLI_ITEMS="1"

cd "$WORK_DIR"
node "$CLI_JS" create
node "$CLI_JS" manifest validate bundle.json
node "$CLI_JS" pack --manifest bundle.json --out bundle.zip
node "$CLI_JS" lint --archive bundle.zip --manifest bundle.json

UPLOAD_JSON="$TMP_ROOT/upload.json"
node "$CLI_JS" remote upload --archive bundle.zip \
  --api-url "$CCB_API_URL" --token "$CCB_ACCESS_TOKEN" | tee "$UPLOAD_JSON"

BUNDLE_ID="$(node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); console.log(j.bundleId)" "$UPLOAD_JSON")"
SNAPSHOT_ID="$(node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); console.log(j.snapshotId)" "$UPLOAD_JSON")"

node "$CLI_JS" remote list --api-url "$CCB_API_URL" --token "$CCB_ACCESS_TOKEN"

RESTORE_ZIP="$TMP_ROOT/restored.zip"
node "$CLI_JS" remote download \
  --bundle "$BUNDLE_ID" --snapshot "$SNAPSHOT_ID" --out "$RESTORE_ZIP" \
  --api-url "$CCB_API_URL" --token "$CCB_ACCESS_TOKEN"

rm -rf "$HOME_DIR/.claude-code-bundles" || true
node "$CLI_JS" install --archive "$RESTORE_ZIP" --force
node "$CLI_JS" list

if [[ -n "${SECOND_ACCESS_TOKEN:-}" ]]; then
  CODE=0
  node "$CLI_JS" remote list --api-url "$CCB_API_URL" --token "$SECOND_ACCESS_TOKEN" \
    | tee "$TMP_ROOT/list-b.json" || CODE=$?
  # Second user may see empty bundles or 403 depending on API — do not fail closed on empty JSON.
  if grep -q "$BUNDLE_ID" "$TMP_ROOT/list-b.json" 2>/dev/null; then
    echo "SEC-01: second user listing contains first user's bundle id" >&2
    exit 3
  fi
fi

echo "OK: remote backup-restore E2E completed"
rm -rf "$TMP_ROOT"
