#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_ROOT="$(mktemp -d)"
WORK_DIR="$TMP_ROOT/workspace"
HOME_DIR="$TMP_ROOT/home"

mkdir -p "$WORK_DIR/payload/skills" "$HOME_DIR"
echo "demo skill" > "$WORK_DIR/payload/skills/demo.md"

cd "$ROOT_DIR"
npm run build

export HOME="$HOME_DIR"
export BUNDLE_CLI_NONINTERACTIVE=1
export BUNDLE_CLI_NAME="E2E Bundle"
export BUNDLE_CLI_VISIBILITY="private"
export BUNDLE_CLI_ITEMS="1"

cd "$WORK_DIR"
node "$ROOT_DIR/dist/cli/index.js" create
node "$ROOT_DIR/dist/cli/index.js" manifest validate bundle.json
node "$ROOT_DIR/dist/cli/index.js" pack --manifest bundle.json --out bundle.zip
node "$ROOT_DIR/dist/cli/index.js" lint --archive bundle.zip --manifest bundle.json
node "$ROOT_DIR/dist/cli/index.js" apply --manifest bundle.json --force
node "$ROOT_DIR/dist/cli/index.js" list

echo "OK: local E2E completed"
