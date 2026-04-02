---
phase: 05-discovery-operational-beta
plan: 01
subsystem: database, api
tags: [supabase, postgres, rls, nextjs, bundle-tags, bundle-reports, import-count]

# Dependency graph
requires:
  - phase: 04-public-sharing-lineage
    provides: bundles table with visibility, bundle_lineage, profiles, import API
provides:
  - bundle_tags table with composite PK and RLS (public read, owner write)
  - bundle_reports table with unique reporter+bundle constraint and RLS
  - import_count column on bundles (default 0)
  - PATCH /api/bundles/[bundleId] for tag management (normalize, max 5, replace-all)
  - import_count increment in POST /api/bundles/import
affects: [05-02, 05-03, browse-api, report-api, discovery-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Replace-all tag strategy: delete then insert for atomic tag replacement
    - RLS dual-policy for bundle_tags: separate public and own policies (not combined)
    - import_count eventual consistency: read-then-write increment acceptable for beta

key-files:
  created:
    - supabase/migrations/20260402000000_phase5_discovery_ops.sql
  modified:
    - apps/web/src/app/api/bundles/[bundleId]/route.ts
    - apps/web/src/app/api/bundles/import/route.ts

key-decisions:
  - "bundle_tags uses separate table (not JSONB) for normalization and efficient tag filtering via bundle_tags_tag_name_idx"
  - "Max 5 tags enforced at API level, not DB — allows flexible future adjustment without migration"
  - "bundle_reports has no auto-action; moderation is admin-only via Supabase dashboard service role"
  - "import_count uses read-then-write pattern (not RPC) — eventual consistency acceptable for beta (D-18)"
  - "PATCH tag update uses replace-all strategy (delete + insert) for simplicity over diff-based updates"

patterns-established:
  - "Tag normalization: trim().toLowerCase() + dedup with Set before insert"
  - "PATCH handler shares ownership check pattern with DELETE (same route file)"

requirements-completed: [FND-01, OPS-01]

# Metrics
duration: 2min
completed: 2026-04-02
---

# Phase 5 Plan 1: Discovery Ops Foundation Summary

**bundle_tags and bundle_reports tables with RLS + PATCH tag management endpoint + import_count increment on import**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-02T20:27:15Z
- **Completed:** 2026-04-02T20:29:20Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Migration creates bundle_tags (composite PK, tag_name index, 4 RLS policies), bundle_reports (unique reporter+bundle, reason CHECK, 2 RLS policies), and import_count column on bundles
- PATCH /api/bundles/[bundleId] handles tag replacement with trim/lowercase/dedup normalization, max 5 enforcement, and replace-all strategy
- Import API now increments import_count on source bundle after successful lineage upsert

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration** - `b959321` (chore)
2. **Task 2: PATCH handler + import_count** - `bf8b0fe` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `supabase/migrations/20260402000000_phase5_discovery_ops.sql` - bundle_tags table, bundle_reports table, import_count column, RLS policies
- `apps/web/src/app/api/bundles/[bundleId]/route.ts` - Added PATCH handler for tag management; DELETE unchanged
- `apps/web/src/app/api/bundles/import/route.ts` - Added import_count increment in step 9; POST logic unchanged

## Decisions Made

- `bundle_tags` uses a separate normalized table (not JSONB array on bundles) to enable efficient tag-based filtering via `bundle_tags_tag_name_idx` (required for browse/search in 05-02+)
- Max 5 tags enforced at API level only — keeps DB schema flexible, matches D-08
- `bundle_reports` has no SELECT policy for public/anon — admins access reports via service role through Supabase dashboard per D-13/D-15
- `import_count` uses read-then-write increment (not Postgres RPC) — eventual consistency acceptable for beta counter per D-18
- PATCH tag update uses replace-all (delete + insert) over diff-based updates — simpler and idempotent for the replace-all UI pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - migration file added; apply to Supabase via `supabase db push` or dashboard SQL editor when deploying.

## Next Phase Readiness

- bundle_tags and bundle_reports tables ready for 05-02 browse/report API endpoints to query
- import_count data will be available for analytics/sorting in future browse endpoints
- PATCH /api/bundles/[bundleId] ready for frontend tag editor integration

---
*Phase: 05-discovery-operational-beta*
*Completed: 2026-04-02*
