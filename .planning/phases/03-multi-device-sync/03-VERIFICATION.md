---
phase: 03-multi-device-sync
verified: 2026-04-01T11:10:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Run `ccb login` on a real machine with a configured Supabase project"
    expected: "Browser opens GitHub OAuth, redirects to localhost callback, token saved at ~/.claude/bundle-platform/auth.json, prints 'Logged in successfully.'"
    why_human: "Requires live Supabase project with GitHub OAuth and configured redirect URL (http://127.0.0.1:*/callback). Cannot test OAuth flow without external service."
  - test: "Run `ccb pull` on a second device that has the same account logged in"
    expected: "Checkbox shows remote bundles, up-to-date bundles are disabled, selecting others downloads/installs them and prints 'Pulled <id> -> <claudeRoot>'"
    why_human: "Requires live API endpoint, real remote bundles, and a device that already has bundles installed. Cannot test interactive TUI or actual download+apply without running infrastructure."
  - test: "Run `ccb status` after installing some bundles and pushing one update from another device"
    expected: "Table shows correct status column for each bundle: up-to-date / newer on server / local-only / not installed"
    why_human: "Requires two devices, live server state, and real registry entries to produce all four states."
---

# Phase 3: Multi-Device Sync Verification Report

**Phase Goal:** 내 private 번들을 여러 기기에서 동일 스냅샷으로 맞춘다. (Sync my private bundles to the same snapshot across multiple devices.)
**Verified:** 2026-04-01T11:10:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can run `ccb login` and authenticate via browser OAuth | VERIFIED | `packages/cli/src/login.ts` exports `runLogin` with full PKCE flow; `index.ts:124` routes `command === "login"` |
| 2 | Login token is persisted locally and reused by subsequent commands | VERIFIED | `auth-store.ts` exports `saveAuth`/`loadAuth`/`clearAuth`; token stored at `~/.claude/bundle-platform/auth.json`; `remote.ts:197` calls `await loadAuth()` as tier-3 fallback |
| 3 | Existing `ccb remote` commands work with stored login token (no env vars needed) | VERIFIED | `resolveApiContext` in `remote.ts:186` is exported async with 3-tier chain (flags > env > stored); `runRemoteListCli` and `runRemoteDownloadCli` both `await resolveApiContext(args)` |
| 4 | Registry entries track snapshotHash for server comparison | VERIFIED | `registry.ts:9` adds `snapshotHash?: string` to `RegistryEntry`; `pull.ts:137` stores `snapshotHash: sel.snapshotHash` on `updateRegistry` |
| 5 | User can run `ccb pull` to interactively select and install remote bundles | VERIFIED | `pull.ts` exports `runPull`; `index.ts:306` routes `command === "pull"`; uses `checkbox` from `@inquirer/prompts` |
| 6 | Already-installed bundles with same snapshot hash are shown as up-to-date and skipped (D-05/D-07) | VERIFIED | `pull.ts:57` compares `local.snapshotHash === latestSnap.normalized_snapshot_hash`; sets `disabled: "up-to-date"` on matching choices; `pull.ts:81` early-exits if all actionable choices are zero |
| 7 | Bundles with newer server snapshot prompt skip/overwrite (D-06) | VERIFIED | `pull.ts:103` checks `sel.status === "newer on server"` and calls `confirm({message: "... Overwrite?"})` |
| 8 | Multi-bundle pull failure skips failed bundle, continues rest, shows summary (D-08) | VERIFIED | `pull.ts:98` accumulates `failures` array; catch block at `pull.ts:144` continues loop; summary printed at `pull.ts:153` with `process.exitCode = 1` |
| 9 | User can run `ccb status` to see local vs server comparison (D-09) | VERIFIED | `status.ts` exports `runStatus` with 4-state tabular output (up-to-date / newer on server / local-only / not installed); `index.ts:312` routes `command === "status"` |

**Score:** 9/9 truths verified

---

### Required Artifacts

#### Plan 03-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/cli/src/auth-store.ts` | Token persistence (save/load/clear) | VERIFIED | 42 lines; exports `StoredAuth`, `AUTH_PATH`, `saveAuth`, `loadAuth`, `clearAuth`; path set to `~/.claude/bundle-platform/auth.json` |
| `packages/cli/src/login.ts` | OAuth PKCE login flow | VERIFIED | 96 lines; exports `runLogin`; uses `signInWithOAuth`, `exchangeCodeForSession`, `server.listen(0`, `127.0.0.1`, `import open from "open"` |
| `packages/cli/src/remote.ts` | Unified auth resolution | VERIFIED | `resolveApiContext` exported async at line 186; imports `loadAuth` from `auth-store.js`; refreshSession logic present |
| `packages/core/src/registry.ts` | RegistryEntry with snapshotHash field | VERIFIED | `snapshotHash?: string` present at line 9 |

#### Plan 03-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/cli/src/pull.ts` | Interactive pull workflow | VERIFIED | 160 lines; exports `runPull`; uses `checkbox`, `confirm`, download+unpack+applyBundle pipeline, failures accumulator |
| `packages/cli/src/status.ts` | Local vs remote status comparison | VERIFIED | 96 lines; exports `runStatus`; 4-state comparison with padded table output |
| `packages/cli/src/index.ts` | Command routing for pull and status | VERIFIED | `command === "pull"` at line 306; `command === "status"` at line 312; `login`/`logout` routed at lines 124/145 |

---

### Key Link Verification

#### Plan 03-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `login.ts` | `auth-store.ts` | `saveAuth` call after OAuth exchange | WIRED | `login.ts:87` calls `await saveAuth({...session, api_url, supabase_url, supabase_anon_key})` |
| `remote.ts` | `auth-store.ts` | `loadAuth` fallback in `resolveApiContext` | WIRED | `remote.ts:3` imports `{ loadAuth, saveAuth }`; `remote.ts:197` calls `await loadAuth()` |
| `index.ts` | `login.ts` | command routing for 'login' | WIRED | `index.ts:124-143` routes `command === "login"` and dynamically imports `./login.js` then calls `login.runLogin(...)` |

#### Plan 03-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `pull.ts` | `remote.ts` | `resolveApiContext` + `listRemoteBundles` + `downloadSnapshotToFile` | WIRED | `pull.ts:6` imports all three; `pull.ts:29,32,117` call each respectively |
| `pull.ts` | `core/registry.ts` | `listRegistry` for local state comparison | WIRED | `pull.ts:5` imports `listRegistry`; `pull.ts:36` calls `await listRegistry()` |
| `pull.ts` | `@claude-code-bundles/core` | `unpack` + `applyBundle` + `updateRegistry` pipeline | WIRED | `pull.ts:5` imports all three; called at lines 126, 131, 134 respectively |
| `status.ts` | `remote.ts` | `resolveApiContext` + `listRemoteBundles` | WIRED | `status.ts:2` imports both; `status.ts:17,20` call each |
| `index.ts` | `pull.ts` | dynamic import on 'pull' command | WIRED | `index.ts:306-309` routes `command === "pull"`, imports `./pull.js`, calls `pull.runPull(args)` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `pull.ts` | `remoteBundles` | `listRemoteBundles(ctx)` — HTTP GET `/api/bundles` | Yes — live API call, not hardcoded | FLOWING |
| `pull.ts` | `localEntries` | `listRegistry()` — reads `~/.claude/bundle-platform/registry.json` | Yes — real file I/O | FLOWING |
| `status.ts` | `remoteBundles` | `listRemoteBundles(ctx)` — HTTP GET `/api/bundles` | Yes — live API call | FLOWING |
| `status.ts` | `localEntries` | `listRegistry()` — reads registry file | Yes — real file I/O | FLOWING |
| `auth-store.ts` | `StoredAuth` | `readFile(AUTH_PATH)` + `JSON.parse` | Yes — real disk read | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CLI build succeeds | `npx nx run cli:build` | Exit 0; 2/2 tasks from cache | PASS |
| Core build succeeds | `npx nx run core:build` (implicit dep) | Satisfied by cli:build | PASS |
| All 13 existing tests pass | `npx nx run workspace:test` | 6 test files, 13 tests, all green | PASS |
| `ccb pull` is routed | `grep "command === \"pull\"" packages/cli/src/index.ts` | Line 306 found | PASS |
| `ccb status` is routed | `grep "command === \"status\"" packages/cli/src/index.ts` | Line 312 found | PASS |
| `ccb login` is routed | `grep "command === \"login\"" packages/cli/src/index.ts` | Line 124 found | PASS |
| `ccb logout` is routed | `grep "command === \"logout\"" packages/cli/src/index.ts` | Line 145 found | PASS |
| New deps in package.json | `grep @supabase/open/@inquirer` | `@supabase/supabase-js@^2.101.1`, `@inquirer/prompts@^8.3.2`, `open@^11.0.0` all present | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SYNC-01 | 03-01-PLAN | 디바이스 등록 및 설치 상태 기록: account-based auth, stored token, registry snapshotHash | SATISFIED | `auth-store.ts` + `login.ts` + `resolveApiContext` 3-tier auth + `RegistryEntry.snapshotHash` field all implemented and wired |
| SYNC-02 | 03-02-PLAN | 두 번째 디바이스에서 동일 계정으로 pull하여 동일 스냅샷 복원 | SATISFIED | `pull.ts` with hash-based skip (D-05/D-07), conflict prompt (D-06), failure skip+continue (D-08); `status.ts` with 4-state comparison (D-09) |

No orphaned requirements — REQUIREMENTS.md maps both SYNC-01 and SYNC-02 to Phase 3, and both are claimed and implemented.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/cli/src/index.ts` | 229 | `updateRegistry` called with `archivePath: ""` in `apply` command | Info | Pre-existing from Phase 1; not introduced in Phase 3; does not affect pull/sync path |

No stubs, placeholder returns, TODO/FIXME, or empty handlers found in Phase 3 artifacts (`auth-store.ts`, `login.ts`, `pull.ts`, `status.ts`, modified sections of `remote.ts` and `index.ts`).

---

### Human Verification Required

#### 1. Live OAuth Login Flow

**Test:** Run `ccb login --supabase-url <url> --supabase-anon-key <key> --api-url <url>` on a machine with browser access, where the Supabase project has `http://127.0.0.1:*/callback` in its OAuth redirect allowlist.
**Expected:** Browser opens GitHub OAuth, user authorizes, browser redirects to localhost, CLI prints "Logged in successfully." and `~/.claude/bundle-platform/auth.json` is created with valid token fields.
**Why human:** Requires a live Supabase project with GitHub OAuth configured and a real browser interaction. Cannot mock the OAuth callback exchange.

#### 2. Cross-Device Pull Workflow

**Test:** On Device A, run `ccb remote upload` to push a bundle. On Device B (same account, `ccb login` already done), run `ccb pull`.
**Expected:** Bundle appears in checkbox as "not installed" or "newer on server", user selects it, CLI downloads and installs, registry on Device B now contains the bundle with matching `snapshotHash`.
**Why human:** Requires two physical devices, live API endpoint, real storage backend, and the full download+unpack+apply pipeline to produce files on disk.

#### 3. Status 4-State Table Accuracy

**Test:** Create a scenario with all four states: (a) bundle installed with matching hash, (b) bundle installed but server has newer snapshot, (c) bundle installed but deleted from server, (d) bundle on server not installed locally. Run `ccb status`.
**Expected:** Table accurately shows up-to-date / newer on server / local-only / not installed for each bundle.
**Why human:** Requires crafted state across local registry and live server. Cannot simulate without running infrastructure.

---

### Gaps Summary

No gaps. All 9 observable truths are verified. All 7 required artifacts exist, are substantive, and are fully wired. Both SYNC-01 and SYNC-02 requirements are satisfied. The build passes and all 13 tests are green.

The only outstanding items are three human-verification scenarios requiring a live Supabase project, a browser, and multi-device infrastructure — these are expected for an interactive auth and sync feature and do not indicate implementation gaps.

---

_Verified: 2026-04-01T11:10:00Z_
_Verifier: Claude (gsd-verifier)_
