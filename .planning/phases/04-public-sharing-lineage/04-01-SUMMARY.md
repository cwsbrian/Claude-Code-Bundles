---
phase: 04-public-sharing-lineage
plan: 01
subsystem: database, api, infra
tags: [supabase, postgres, rls, r2, s3, next.js, typescript]

# Dependency graph
requires:
  - phase: 02-backend-private-backup
    provides: bundles/bundle_snapshots/bundle_lineage DB tables + RLS, R2 put/get operations, requireUser auth pattern
  - phase: 03-multi-device-sync
    provides: ccb pull/status patterns, resolveApiContext, snapshotHash registry
provides:
  - profiles table with OAuth auto-populate trigger and backfill
  - bundle_publish_records table for publish history
  - description column on bundles, root_author_id column on bundle_lineage
  - Anonymous SELECT RLS policies for public-visibility bundles/snapshots/lineage/publish_records
  - R2 copyBundleZipObject, deleteBundleZipObject, deleteBundleZipObjects utilities
  - PATCH /api/bundles/[bundleId]/publish toggle endpoint with ownership check + snapshot pre-check
affects: [04-02-import-lineage, 04-03-cli-commands, 05-discovery-browse]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DB migration: new tables + ALTER TABLE + trigger + backfill + RLS in one migration file"
    - "RLS dual-policy: private owner-only policy + public anonymous visibility policy coexist"
    - "R2 CopyObjectCommand with CopySource: /${bucket}/${key} leading-slash format"
    - "Publish toggle: single PATCH endpoint handles both publish and unpublish (D-24)"

key-files:
  created:
    - supabase/migrations/20260401000000_phase4_public_sharing.sql
    - apps/web/src/app/api/bundles/[bundleId]/publish/route.ts
  modified:
    - apps/web/src/lib/r2/bundle-object-storage.ts

key-decisions:
  - "Publish toggle is a single PATCH endpoint (D-24): public->private = unpublish, private->public = publish"
  - "bundle_publish_records records latest snapshot ID on each publish event, not on update (D-02/D-06)"
  - "CopySource uses /${bucket}/${key} leading-slash format per R2 docs pitfall"
  - "Profiles auto-populated via DB trigger on auth.users INSERT; backfill covers existing users"

patterns-established:
  - "PATCH visibility toggle pattern: check ownership, pre-check state, toggle, side-effect on change direction"
  - "RLS public read: TO anon, authenticated USING (visibility = 'public') layered on top of owner policies"

requirements-completed: [PUB-01]

# Metrics
duration: 7min
completed: 2026-04-02
---

# Phase 4 Plan 01: DB Foundation + R2 Extensions + Publish API Summary

**Supabase migration adds profiles table, publish_records, public-read RLS + R2 copy/delete ops, and a PATCH publish toggle enforcing ownership, snapshot pre-check, and lineage recording**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-02T00:07:10Z
- **Completed:** 2026-04-02T00:14:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created Phase 4 DB migration with 2 new tables (profiles, bundle_publish_records), 2 ALTER TABLE additions (description, root_author_id), GitHub OAuth trigger + backfill, and 8 RLS policies covering anonymous public-read access
- Extended R2 utility module with copy (single), delete (single), and delete (batch) operations using existing S3Client singleton — no new dependencies needed
- Implemented PATCH /api/bundles/[bundleId]/publish with auth, ownership verification, no-snapshot pre-check, visibility toggle, and publish history recording; Next.js build passes

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration — profiles, publish_records, RLS, trigger + backfill** - `5cc44a0` (feat)
2. **Task 2: Extend R2 utilities with copy and delete operations** - `696c809` (feat)
3. **Task 3: Publish/Unpublish toggle API endpoint (PATCH)** - `0fb45e4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `supabase/migrations/20260401000000_phase4_public_sharing.sql` — Phase 4 DB migration: profiles, bundle_publish_records, ALTER TABLE bundles/bundle_lineage, 8 RLS policies, trigger + backfill
- `apps/web/src/lib/r2/bundle-object-storage.ts` — Added copyBundleZipObject, deleteBundleZipObject, deleteBundleZipObjects exports
- `apps/web/src/app/api/bundles/[bundleId]/publish/route.ts` — PATCH endpoint for publish/unpublish toggle

## Decisions Made

- Followed plan specification exactly for all three tasks
- CopySource in R2 CopyObjectCommand uses `/${bucket}/${key}` leading-slash format (per RESEARCH.md Pitfall 1)
- Both publish and unpublish use the same PATCH endpoint per D-24; no separate unpublish endpoint needed

## Deviations from Plan

None — plan executed exactly as written.

Note: `npx nx run web:build` fails due to a pre-existing worktree project-name collision (projects defined in both worktree and main repo). Verified build instead via `cd apps/web && npx next build` which succeeds and shows new publish route. This is a known pre-existing issue unrelated to Plan 04-01 changes.

## Issues Encountered

- Pre-existing: `npx nx run web:build` cannot run from repo root due to Nx detecting duplicate project names from the `.claude/worktrees/` subdirectory. Worked around by running `npx next build` directly in `apps/web/`. TypeScript type check (`tsc --noEmit`) also passes cleanly.

## User Setup Required

None — migration SQL is ready to apply. Supabase migration apply still requires a running Supabase instance (existing blocker from Phase 2).

## Next Phase Readiness

- Plan 04-02 (import flow): R2 copyBundleZipObject and bundle_lineage.root_author_id column are ready; POST /api/bundles/import can be implemented
- Plan 04-03 (CLI commands): PATCH /api/bundles/[bundleId]/publish endpoint is ready for `ccb publish` and `ccb unpublish` CLI wrappers
- Profiles table with trigger ready for attribution in Plan 04-02/03 public bundle read endpoint

## Self-Check: PASSED

- FOUND: supabase/migrations/20260401000000_phase4_public_sharing.sql
- FOUND: apps/web/src/lib/r2/bundle-object-storage.ts
- FOUND: apps/web/src/app/api/bundles/[bundleId]/publish/route.ts
- FOUND: .planning/phases/04-public-sharing-lineage/04-01-SUMMARY.md
- FOUND commit: 5cc44a0 (Task 1 — DB migration)
- FOUND commit: 696c809 (Task 2 — R2 utilities)
- FOUND commit: 0fb45e4 (Task 3 — publish route)

---
*Phase: 04-public-sharing-lineage*
*Completed: 2026-04-02*
