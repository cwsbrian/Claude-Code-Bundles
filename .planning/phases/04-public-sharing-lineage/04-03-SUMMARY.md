---
phase: 04-public-sharing-lineage
plan: 03
subsystem: cli
tags: [typescript, cli, publish, import, lineage, attribution]

# Dependency graph
requires:
  - phase: 04-02
    provides: POST /api/bundles/import, DELETE /api/bundles/[bundleId], GET /api/bundles/public/[owner]/[slug]
  - phase: 04-01
    provides: PATCH /api/bundles/[bundleId]/publish, profiles table, publish_records
  - phase: 03-multi-device-sync
    provides: resolveApiContext, downloadSnapshotToFile, listRemoteBundles, pull.ts download+apply pattern
provides:
  - "ccb publish <bundleId> — toggles bundle to public via PATCH API"
  - "ccb unpublish <bundleId> — toggles bundle back to private via PATCH API"
  - "ccb import <owner/slug> — full flow: preview + attribution + API import + download + apply + registry"
  - "ccb delete <bundleId> — confirmation-gated hard delete via DELETE API"
  - "Updated CLI usage help with all four new commands"
affects: [phase-05-discovery, end-to-end-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Resolve UUID from public_bundle_id via listRemoteBundles before API calls"
    - "Already-in-state guard: skip if visibility already matches desired state"
    - "Full import flow: preview (anonymous) -> import API (authed) -> download -> unpack -> apply -> registry"
    - "409 duplicate handling with overwrite/skip confirm prompt (matches pull.ts pattern)"
    - "Confirmation-gated destructive action with default: false"

key-files:
  created:
    - packages/cli/src/publish.ts
    - packages/cli/src/unpublish.ts
    - packages/cli/src/import.ts
    - packages/cli/src/delete.ts
  modified:
    - packages/cli/src/index.ts

key-decisions:
  - "Used listRemoteBundles to resolve public_bundle_id to UUID before calling PATCH/DELETE — avoids exposing internal UUIDs to users"
  - "Imported @inquirer/prompts confirm in import.ts and delete.ts (already a dependency from pull.ts)"
  - "Used type-safe cast instead of any for API responses — avoids type errors while keeping code readable"

patterns-established:
  - "Pattern: all new CLI commands follow dynamic import dispatch — import('./xxx.js') inside if block"
  - "Pattern: idempotency guard on publish/unpublish — check current visibility before calling API"

requirements-completed: [PUB-01, PUB-02, PUB-03, MOD-01]

# Metrics
duration: 25min
completed: 2026-04-01
---

# Phase 4 Plan 03: CLI Commands for Publish, Import, Unpublish, Delete Summary

**Four new CLI commands complete the Phase 4 user-facing surface: ccb publish/unpublish (visibility toggle via PATCH), ccb import (preview with attribution + full download+apply flow), ccb delete (confirmation-gated hard delete)**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-01T17:00:00Z
- **Completed:** 2026-04-01T17:25:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- `ccb publish <bundleId>` and `ccb unpublish <bundleId>` resolve UUID from remote bundle list, guard against no-op state, then call PATCH /api/bundles/[uuid]/publish
- `ccb import <owner/slug>` fetches public bundle preview showing "Published by" and "Originated by" attribution, calls POST /api/bundles/import, handles 409 duplicate with overwrite/skip prompt, then downloads zip and runs full unpack+apply+registry update chain (matching pull.ts pattern)
- `ccb delete <bundleId>` requires explicit confirmation (default: false) before calling DELETE /api/bundles/[uuid]; message explicitly states "Local installed files are not affected"
- `index.ts` updated with four new dispatch blocks and all commands appear in usage help
- Full monorepo build (`nx run-many -t build --projects=core,cli,web`) passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Publish and Unpublish CLI commands** - `c3051af` (feat)
2. **Task 2: Import and Delete CLI commands** - `7212302` (feat)
3. **Task 3: Wire all commands into CLI entry point** - `2c22ed4` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `packages/cli/src/publish.ts` - ccb publish command: resolve UUID via list, check already-public guard, PATCH API
- `packages/cli/src/unpublish.ts` - ccb unpublish command: resolve UUID via list, check already-private guard, PATCH API (toggle)
- `packages/cli/src/import.ts` - ccb import command: public preview + attribution display + POST import API + download+unpack+apply+registry
- `packages/cli/src/delete.ts` - ccb delete command: resolve UUID via list, confirm prompt, DELETE API
- `packages/cli/src/index.ts` - Added four command dispatch blocks and updated printUsage()

## Decisions Made
- Resolved UUID from public_bundle_id via `listRemoteBundles` before making API calls — users work with human-readable IDs (e.g., `my-cool-bundle`), not UUIDs.
- Used `(data as Record<string, unknown>).bundles` cast instead of `any` to avoid TypeScript lint issues while keeping the code simple.
- `import.ts` uses anonymous fetch for public preview (no auth header), matching D-21 (anonymous public access).

## Deviations from Plan

None — plan executed exactly as written. The plan's code snippets used `(data as any)` which was changed to `(data as Record<string, unknown>)` for type safety, but this is a style improvement within the plan's intent.

## Issues Encountered
- Worktree branch was 10 commits behind `main` (missing Phase 4 API implementations from 04-01 and 04-02). Resolved via `git rebase main` before starting implementation.
- Pre-existing test failures in the worktree (3 of 13 tests): `apply-lint-e2e.test.ts` times out due to missing `tsx` binary in worktree's node_modules, and `pack-unpack.test.ts` has a golden fixture hash mismatch. These failures existed before this plan and are out of scope for this plan's changes.

## Known Stubs

None — all four commands are fully wired to real API endpoints with no placeholders.

## User Setup Required
None — all commands use existing `resolveApiContext` auth resolution (CCB_API_URL + CCB_ACCESS_TOKEN env vars or --api-url/--token flags, already documented in previous plans).

## Next Phase Readiness
- Phase 4 CLI surface is complete: all four public-sharing commands are implemented and wired
- Phase 5 (discovery/browse) can build on `ccb import` pattern and the public API infrastructure from 04-01/04-02
- The `ccb status` command (Phase 3) shows local vs remote state for owned bundles; a future enhancement could show which bundles you've imported

---
*Phase: 04-public-sharing-lineage*
*Completed: 2026-04-01*
