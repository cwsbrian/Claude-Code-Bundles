---
status: passed
phase: 03-multi-device-sync
source: [03-VERIFICATION.md]
started: 2026-04-01T11:15:00Z
updated: 2026-04-01T12:00:00Z
---

## Current Test

All tests passed.

## Tests

### 1. Live OAuth Login Flow
expected: Browser opens GitHub OAuth, redirects to localhost callback, token saved at ~/.claude/bundle-platform/auth.json, prints 'Logged in successfully.'
result: passed — GitHub OAuth configured in Supabase, browser opened, login succeeded, token saved.

### 2. `ccb pull` (not installed → installed)
expected: Checkbox shows remote bundles, up-to-date bundles are disabled, selecting others downloads/installs them and prints 'Pulled <id> -> <claudeRoot>'
result: passed — Selected 'test (not installed)', printed 'Pulled test -> /home/brian/.claude'

### 3. `ccb status` (up-to-date verification)
expected: Table shows correct status column for each bundle: up-to-date / newer on server / local-only / not installed
result: passed — 'not installed' shown before pull, 'up-to-date' (f1c2a989 = f1c2a989) shown after pull

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

Two bugs found and fixed during UAT:
- `runRemoteUploadCli` was not using `resolveApiContext`, so stored login token was ignored — fixed in `packages/cli/src/remote.ts`
- `pack` did not include `bundle.json` in the zip, causing `pull` to fail on unpack — fixed in `packages/core/src/pack.ts`
- `GET /api/bundles` was not ordering `bundle_snapshots` by `created_at DESC`, causing `pull` to use old snapshot — fixed in `apps/web/src/app/api/bundles/route.ts`
