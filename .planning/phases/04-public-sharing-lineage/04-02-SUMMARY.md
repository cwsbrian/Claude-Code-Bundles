---
phase: 04-public-sharing-lineage
plan: 02
subsystem: api
tags: [next.js, typescript, supabase, postgres, r2, cloudflare, lineage]

# Dependency graph
requires:
  - phase: 04-01
    provides: profiles table, bundle_publish_records, root_author_id on bundle_lineage, R2 copyBundleZipObject/deleteBundleZipObjects, PATCH publish toggle
  - phase: 02-backend-private-backup
    provides: bundles/bundle_snapshots/bundle_lineage DB tables + RLS, requireUser auth, createAdminClient, R2 getBundleZipObject
provides:
  - Anonymous GET /api/bundles/public/[owner]/[slug] with published_by and originated_by attribution
  - Authenticated POST /api/bundles/import creating private copy + lineage + R2 zip copy
  - Authenticated DELETE /api/bundles/[bundleId] with DB CASCADE + R2 cleanup
affects: [04-03-cli-commands, 05-discovery-browse]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Anonymous API route: export GET without requireUser, use createAdminClient() to bypass RLS"
    - "Import flow: owner/slug lookup via profiles.github_handle -> public bundle verify -> R2 copy -> lineage upsert"
    - "Delete ordering: collect R2 keys first, delete DB rows (CASCADE), then clean R2 (non-fatal)"
    - "Lineage chain resolution: root_bundle_id/root_author_id from source lineage, fallback to source bundle/owner"

key-files:
  created:
    - apps/web/src/app/api/bundles/public/[owner]/[slug]/route.ts
    - apps/web/src/app/api/bundles/import/route.ts
    - apps/web/src/app/api/bundles/[bundleId]/route.ts
  modified: []

key-decisions:
  - "Public read uses createAdminClient (service role) not requireUser — admin client bypasses RLS to query public bundles"
  - "Import duplicate check returns 409 with overwrite=true escape hatch (mirrors Phase 3 pull conflict pattern)"
  - "Delete DB rows before R2 cleanup: orphaned R2 objects are safer than orphaned DB rows; R2 errors are non-fatal"
  - "root_author_id propagation: if source has lineage use its root_author_id, else use source bundle owner"

patterns-established:
  - "Anonymous route pattern: no requireUser, createAdminClient for DB queries, maybeSingle() for safe 404s"
  - "Contents summary extraction: getBundleZipObject -> extractManifestJsonFromZip -> parse skills/hooks/commands keys"
  - "Lineage upsert: use .upsert() on bundle_lineage to support overwrite case in import"

requirements-completed: [PUB-02, PUB-03, MOD-01]

# Metrics
duration: 3min
completed: 2026-04-02
---

# Phase 4 Plan 02: Public Read, Import, and Delete API Summary

**Anonymous public bundle GET with Published by/Originated by attribution, authenticated import creating R2-copied private bundle with lineage chain, and owner-only DELETE with DB CASCADE + R2 cleanup**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-02T00:14:38Z
- **Completed:** 2026-04-02T00:17:30Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created anonymous GET /api/bundles/public/[owner]/[slug] that resolves owner by github_handle, verifies public visibility, and returns attribution (published_by + originated_by), latest snapshot info, and contents summary extracted from R2 zip
- Created authenticated POST /api/bundles/import that takes owner/slug format, copies R2 zip to importer namespace, creates new private bundle + snapshot, and records lineage with root_author_id chain
- Created authenticated DELETE /api/bundles/[bundleId] that verifies ownership, collects R2 keys, deletes DB rows (CASCADE), then cleans R2 (non-fatal on R2 error)

## Task Commits

Each task was committed atomically:

1. **Task 1: Public bundle read API (GET, anonymous) with attribution** - `8bf4207` (feat)
2. **Task 2: Import API (POST, authenticated) with lineage and R2 copy** - `f8039af` (feat)
3. **Task 3: Delete API (DELETE, authenticated) with CASCADE + R2 cleanup** - `1e60901` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/src/app/api/bundles/public/[owner]/[slug]/route.ts` — Anonymous GET returning public bundle metadata with published_by (owner profile), originated_by (lineage root author), latest_snapshot, and contents_summary extracted from R2 zip
- `apps/web/src/app/api/bundles/import/route.ts` — Authenticated POST accepting sourceBundleId (owner/slug), creating private bundle copy with R2 zip copy and lineage record; handles duplicates with 409 + overwrite option
- `apps/web/src/app/api/bundles/[bundleId]/route.ts` — Authenticated DELETE verifying ownership, collecting snapshot keys, deleting DB rows (CASCADE), cleaning R2 objects (non-fatal)

## Decisions Made

- Followed plan specification exactly for all three tasks
- `createAdminClient()` used in public read (service role bypasses RLS) — appropriate since the endpoint enforces `visibility = 'public'` filter explicitly
- R2 cleanup after DB delete is wrapped in try/catch per research anti-pattern guidance (orphaned R2 objects are less harmful than orphaned DB rows)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all three routes implemented cleanly. TypeScript check (`tsc --noEmit`) passes. Next.js build (`npx next build` in `apps/web/`) succeeds with all three routes visible in build output.

Note: `npx nx run web:build` from repo root still fails due to pre-existing Nx worktree project-name collision (documented in Plan 04-01 SUMMARY). Workaround: use `cd apps/web && npx next build` directly.

## User Setup Required

None — no new external service configuration required. All routes use the same Supabase + R2 environment variables as prior phases.

## Next Phase Readiness

- Plan 04-03 (CLI commands): all three API endpoints are now ready for `ccb publish`, `ccb import`, `ccb unpublish`, and `ccb delete` CLI wrappers
- Phase 4 server-side API surface is complete (PUB-01 via 04-01, PUB-02/PUB-03/MOD-01 via 04-02)
- Phase 5 discovery: anonymous public read endpoint provides the foundation for future browse/search features

## Self-Check: PASSED

- FOUND: apps/web/src/app/api/bundles/public/[owner]/[slug]/route.ts
- FOUND: apps/web/src/app/api/bundles/import/route.ts
- FOUND: apps/web/src/app/api/bundles/[bundleId]/route.ts
- FOUND commit: 8bf4207 (Task 1 — public read)
- FOUND commit: f8039af (Task 2 — import)
- FOUND commit: 1e60901 (Task 3 — delete)

---
*Phase: 04-public-sharing-lineage*
*Completed: 2026-04-02*
