---
phase: 03-multi-device-sync
plan: 01
subsystem: auth
tags: [oauth, pkce, supabase, supabase-js, cli-auth, token-storage, registry]

# Dependency graph
requires:
  - phase: 02-backend-private-backup
    provides: ccb remote commands, RemoteApiContext, listRemoteBundles, downloadSnapshotToFile

provides:
  - auth-store.ts with saveAuth/loadAuth/clearAuth/StoredAuth for persistent token storage
  - login.ts with PKCE OAuth flow via localhost ephemeral HTTP callback server
  - resolveApiContext exported async with 3-tier auth (flags > env > stored token + refresh)
  - RegistryEntry.snapshotHash optional field for hash-based skip logic
  - ccb login and ccb logout commands routed in CLI

affects: [03-02-PLAN, pull, status]

# Tech tracking
tech-stack:
  added: ["@supabase/supabase-js@^2.101.1", "@inquirer/prompts@^8.3.2", "open@^11.0.0"]
  patterns:
    - "Ephemeral localhost HTTP server on port 0 (OS-assigned) for OAuth callback"
    - "3-tier auth resolution: CLI flags > env vars > stored token"
    - "Token refresh via supabase.auth.refreshSession before expiry"

key-files:
  created:
    - packages/cli/src/auth-store.ts
    - packages/cli/src/login.ts
  modified:
    - packages/cli/src/remote.ts
    - packages/cli/src/index.ts
    - packages/core/src/registry.ts
    - packages/cli/package.json

key-decisions:
  - "Store api_url in auth.json alongside tokens so ccb remote works without env vars after login"
  - "Use open@^11.0.0 (ESM-only) matching project type=module; avoid v8 CJS version"
  - "resolveApiContext made exported+async to enable reuse in pull/status commands (plan 02)"
  - "snapshotHash as optional field for backward compat with existing registry entries"

patterns-established:
  - "Pattern: OAuth PKCE via localhost server — spin up http.createServer(), listen(0), read port from address(), open browser, await callback, exchange code, close server"
  - "Pattern: 3-tier auth — check flags, check env, check loadAuth() with expiry+refresh logic"

requirements-completed: [SYNC-01]

# Metrics
duration: 3min
completed: 2026-04-01
---

# Phase 3 Plan 01: CLI Auth Infrastructure Summary

**PKCE OAuth login flow via localhost callback server, persistent token storage in auth.json, and unified 3-tier auth resolution for all ccb remote commands**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-01T17:57:39Z
- **Completed:** 2026-04-01T18:00:17Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created `auth-store.ts` exporting `saveAuth`/`loadAuth`/`clearAuth`/`StoredAuth` with token persisted at `~/.claude/bundle-platform/auth.json`
- Created `login.ts` implementing full PKCE OAuth flow: ephemeral http server on OS-assigned port, GitHub OAuth via Supabase, browser auto-open, code exchange, token save
- Updated `resolveApiContext` in `remote.ts` to be exported+async with 3-tier auth (flags > env > stored token) including automatic token refresh on expiry
- Added `snapshotHash?: string` to `RegistryEntry` type in `registry.ts` for D-05/D-07 hash-based skip logic
- Routed `ccb login` and `ccb logout` commands in `index.ts`
- All 13 existing tests pass with no regressions

## Task Commits

1. **Task 1: Auth store + login command + dependencies** - `c4d7713` (feat)
2. **Task 2: Unified auth resolution + registry snapshotHash + command routing** - `26fce31` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/cli/src/auth-store.ts` - Token persistence (save/load/clear) with StoredAuth type
- `packages/cli/src/login.ts` - PKCE OAuth flow with ephemeral localhost callback server
- `packages/cli/src/remote.ts` - resolveApiContext now exported async with 3-tier auth + token refresh
- `packages/cli/src/index.ts` - Added login/logout command routing and updated printUsage
- `packages/core/src/registry.ts` - RegistryEntry type extended with optional snapshotHash field
- `packages/cli/package.json` - Added @supabase/supabase-js, @inquirer/prompts, open@^11 dependencies

## Decisions Made

- Used `open@^11.0.0` (ESM-only) to match the project's `"type": "module"` setting; v8 would have been CJS
- Stored `api_url` in auth.json during login so subsequent `ccb remote` commands work without CCB_API_URL env var
- Made `resolveApiContext` exported so pull/status commands (plan 02) can reuse the same auth resolution
- Kept `snapshotHash` optional (`?:`) for backward compatibility with existing registry.json entries

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Upgraded open from installed v8 to v11**
- **Found during:** Task 1 (dependency installation)
- **Issue:** `npm install open` resolved to v8.4.2 (CJS) instead of the v11.x (ESM) specified in research
- **Fix:** Re-ran `npm install open@^11.0.0` to get the ESM-only version matching project's `"type": "module"`
- **Files modified:** packages/cli/package.json, package-lock.json
- **Verification:** package.json shows `"open": "^11.0.0"`
- **Committed in:** c4d7713 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** Essential fix — wrong open version would cause ESM/CJS conflicts at runtime.

## Issues Encountered

None beyond the open version fix above.

## User Setup Required

`ccb login` requires the user to configure their Supabase project's Authentication > URL Configuration > Redirect URLs to include `http://127.0.0.1:*/callback` (wildcard port pattern). If wildcard is not supported, a fixed port may need to be used.

## Next Phase Readiness

- Plan 03-02 can now implement `ccb pull` and `ccb status` by importing `resolveApiContext` from `remote.ts`
- `snapshotHash` field in `RegistryEntry` is ready for pull to populate during download+install
- `loadAuth()` available for pull/status to use stored token without requiring env vars

---
*Phase: 03-multi-device-sync*
*Completed: 2026-04-01*
