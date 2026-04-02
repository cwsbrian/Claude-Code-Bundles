---
phase: 04-public-sharing-lineage
verified: 2026-04-01T00:00:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
---

# Phase 4: Public Sharing + Lineage Verification Report

**Phase Goal:** 공개·수입·출처 표기가 스펙과一致한다 (Public sharing, import, and attribution match the spec)
**Verified:** 2026-04-01
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DB migration creates profiles and bundle_publish_records tables, adds description and root_author_id columns | ✓ VERIFIED | `20260401000000_phase4_public_sharing.sql` lines 4–11, 48–55, 58–59 |
| 2 | RLS policies allow anonymous SELECT on public-visibility bundles and snapshots | ✓ VERIFIED | `bundles_select_public`, `bundle_snapshots_select_public`, `bundle_lineage_select_public`, `bundle_publish_records_select_public` policies in migration (lines 82–98) |
| 3 | Profiles auto-populate from OAuth metadata via DB trigger and backfill existing users | ✓ VERIFIED | `CREATE TRIGGER on_auth_user_created` (line 32) + `INSERT INTO public.profiles … FROM auth.users` backfill (lines 37–45) |
| 4 | Owner can toggle bundle visibility to public via PATCH API and a publish record is created | ✓ VERIFIED | `PATCH /api/bundles/[bundleId]/publish/route.ts` — visibility toggle line 44, `bundle_publish_records` INSERT line 62 |
| 5 | Publish pre-check rejects bundles with zero snapshots | ✓ VERIFIED | `publish/route.ts` lines 27–41: count query + 400 response with `"no_snapshots"` error |
| 6 | R2 utility supports CopyObject and DeleteObject(s) operations | ✓ VERIFIED | `bundle-object-storage.ts` exports `copyBundleZipObject` (line 70), `deleteBundleZipObject` (line 83), `deleteBundleZipObjects` (line 93) |
| 7 | Anonymous user can GET public bundle metadata by owner/slug with Published by and Originated by attribution | ✓ VERIFIED | `public/[owner]/[slug]/route.ts` — no `requireUser`, returns `published_by` and `originated_by` fields (lines 91–108) |
| 8 | Authenticated user can POST import to create a private copy of a public bundle with lineage and R2 copy | ✓ VERIFIED | `import/route.ts` — `requireUser`, `copyBundleZipObject`, `bundle_lineage` upsert with `root_author_id` (lines 113–142) |
| 9 | Authenticated owner can DELETE their bundle with DB CASCADE and R2 cleanup | ✓ VERIFIED | `[bundleId]/route.ts` — ownership check, DB delete, `deleteBundleZipObjects` (lines 33–54) |
| 10 | Import creates bundle_lineage with parent_bundle_id, root_bundle_id, root_author_id, imported_snapshot_id | ✓ VERIFIED | `import/route.ts` lines 136–142: upsert with all four lineage fields |
| 11 | ccb publish/unpublish toggles bundle visibility via PATCH API | ✓ VERIFIED | `publish.ts` + `unpublish.ts` — both resolve UUID via `listRemoteBundles`, check current state, call `PATCH .../publish` |
| 12 | ccb import performs full preview+attribution+download+apply+registry flow | ✓ VERIFIED | `import.ts` lines 26–146: anonymous preview fetch, "Published by"/"Originated by" stdout, POST import, `downloadSnapshotToFile`, `unpack`, `applyBundle`, `updateRegistry` |
| 13 | ccb delete hard-deletes bundle via DELETE API with user confirmation | ✓ VERIFIED | `delete.ts` — `confirm()` with `default: false`, message includes "Local installed files are not affected", then `DELETE /api/bundles/${match.id}` |
| 14 | All four commands wired into index.ts and appear in usage help | ✓ VERIFIED | `index.ts` lines 111–114 (printUsage), lines 322–344 (dispatch blocks for publish/unpublish/import/delete) |

**Score:** 14/14 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260401000000_phase4_public_sharing.sql` | Phase 4 DB schema: 2 tables, 2 ALTER, trigger, backfill, 9 RLS policies | ✓ VERIFIED | 99 lines; contains all required DDL |
| `apps/web/src/lib/r2/bundle-object-storage.ts` | Exports copyBundleZipObject, deleteBundleZipObject, deleteBundleZipObjects | ✓ VERIFIED | All three functions exported with real S3 SDK calls |
| `apps/web/src/app/api/bundles/[bundleId]/publish/route.ts` | PATCH endpoint for publish/unpublish toggle | ✓ VERIFIED | 77 lines, full ownership+precheck+toggle+record implementation |
| `apps/web/src/app/api/bundles/public/[owner]/[slug]/route.ts` | Anonymous GET for public bundle metadata + attribution | ✓ VERIFIED | 109 lines, no requireUser, published_by+originated_by+contents_summary |
| `apps/web/src/app/api/bundles/import/route.ts` | Authenticated POST for importing public bundles | ✓ VERIFIED | 159 lines, full flow with lineage upsert |
| `apps/web/src/app/api/bundles/[bundleId]/route.ts` | Authenticated DELETE for hard-deleting own bundles | ✓ VERIFIED | 63 lines, DB-first delete then R2 cleanup (non-fatal) |
| `packages/cli/src/publish.ts` | ccb publish command | ✓ VERIFIED | Exports `runPublish`, calls PATCH API |
| `packages/cli/src/import.ts` | ccb import with download+unpack+apply+registry | ✓ VERIFIED | Full flow including attribution display |
| `packages/cli/src/unpublish.ts` | ccb unpublish command | ✓ VERIFIED | Exports `runUnpublish`, same PATCH API as publish |
| `packages/cli/src/delete.ts` | ccb delete with confirmation prompt | ✓ VERIFIED | `confirm()` with `default: false`, calls DELETE API |
| `packages/cli/src/index.ts` | Updated CLI entry with all four new commands | ✓ VERIFIED | Lines 111–114 usage, lines 322–344 dispatch |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `publish/route.ts` | `bundles` table | `admin.from("bundles").update({ visibility })` | ✓ WIRED | Line 47 |
| `publish/route.ts` | `bundle_publish_records` table | `admin.from("bundle_publish_records").insert(...)` | ✓ WIRED | Line 62 |
| `public/[owner]/[slug]/route.ts` | `profiles` table | `.from("profiles").eq("github_handle", owner)` | ✓ WIRED | Line 18 |
| `import/route.ts` | `bundle-object-storage.ts` | `copyBundleZipObject(...)` call | ✓ WIRED | Import line 2, call line 115 |
| `import/route.ts` | `bundle_lineage` table | `.upsert({ ..., root_author_id })` | ✓ WIRED | Line 136–142 |
| `[bundleId]/route.ts` | `bundle-object-storage.ts` | `deleteBundleZipObjects(storageKeys)` | ✓ WIRED | Import line 1, call line 49 |
| `publish.ts` (CLI) | `PATCH /api/bundles/[bundleId]/publish` | `fetch(url, { method: "PATCH", headers: Bearer })` | ✓ WIRED | Lines 32–38 |
| `import.ts` (CLI) | `POST /api/bundles/import` | `fetch(importUrl, { method: "POST", Bearer })` | ✓ WIRED | Lines 71–79 |
| `import.ts` (CLI) | `GET /api/bundles/public/[owner]/[slug]` | `fetch(previewUrl)` — anonymous, no auth header | ✓ WIRED | Lines 26–27 |
| `delete.ts` (CLI) | `DELETE /api/bundles/[bundleId]` | `fetch(url, { method: "DELETE", Bearer })` | ✓ WIRED | Lines 38–43 |
| `index.ts` (CLI) | `publish.ts, import.ts, unpublish.ts, delete.ts` | dynamic `import("./xxx.js")` dispatch | ✓ WIRED | Lines 323, 329, 335, 341 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `public/[owner]/[slug]/route.ts` | `profile`, `bundle`, `lineage` | `admin.from("profiles")`, `admin.from("bundles")`, `admin.from("bundle_lineage")` | DB queries with `.eq()` filters | ✓ FLOWING |
| `import/route.ts` | `sourceProfile`, `sourceBundle`, `sourceSnapshot` | Supabase admin queries on real tables | Real DB queries with visibility + ownership checks | ✓ FLOWING |
| `[bundleId]/route.ts` | `snapshots` (for R2 keys) | `admin.from("bundle_snapshots").select("storage_object_key")` | Real DB query | ✓ FLOWING |
| `publish.ts` (CLI) | `bundles` (for UUID resolution) | `listRemoteBundles(ctx)` → `GET /api/bundles` | Real API call | ✓ FLOWING |
| `import.ts` (CLI) | `preview`, `importResult` | fetch to real API endpoints | Real HTTP responses | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CLI TypeScript compiles without errors | `cd packages/cli && npx tsc --noEmit` | Exit 0, no output | ✓ PASS |
| Web app TypeScript compiles without errors | `cd apps/web && npx tsc --noEmit` | Exit 0, no output | ✓ PASS |
| CLI help shows all four new commands | `node packages/cli/dist/index.js` | publish, unpublish, import, delete all in output | ✓ PASS |
| CLI dist builds with all four new command modules | `cd packages/cli && npx tsc` | dist/publish.js, dist/import.js, dist/unpublish.js, dist/delete.js created | ✓ PASS |
| All 9 phase commits verified in git log | `git log --oneline \| grep <hashes>` | All 9 hashes found (5cc44a0 through 2c22ed4) | ✓ PASS |

**Note on stale dist:** The pre-existing `packages/cli/dist/` at verification time was compiled at 12:37 (before source changes at 17:28), due to the documented Nx worktree project-name collision preventing `npx nx run cli:build`. Running `cd packages/cli && npx tsc` directly compiles cleanly and produces all four new `.js` files. This is a known infrastructure issue, not a code defect.

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| PUB-01 | 04-01, 04-03 | 소유자가 번들을 public으로 전환하고 공개 스냅샷을 노출할 수 있다 | ✓ SATISFIED | `PATCH /api/bundles/[bundleId]/publish` + `ccb publish` command; visibility toggle + publish record creation verified |
| PUB-02 | 04-02, 04-03 | 공개 번들 import 시 요청자 계정에 새 private bundle이 생기고 lineage가 기록된다 | ✓ SATISFIED | `POST /api/bundles/import` creates private bundle + R2 copy + lineage upsert with `root_author_id`; `ccb import` CLI wires full flow |
| PUB-03 | 04-02, 04-03 | API 또는 최소 UI에서 Published by / Originated by가 일관되게 노출된다 | ✓ SATISFIED | `GET /api/bundles/public/[owner]/[slug]` returns `published_by` + `originated_by`; `ccb import` displays both to stdout before apply |
| MOD-01 | 04-02, 04-03 | public 번들에 대한 최소 unpublish·숨김 경로(소유자 또는 운영 스텁)가 있다 | ✓ SATISFIED | `PATCH /api/bundles/[bundleId]/publish` toggles back to private (unpublish path) + `DELETE /api/bundles/[bundleId]` for hard delete; `ccb unpublish` and `ccb delete` CLI commands |

All 4 requirements satisfied. No orphaned requirements detected — all IDs declared in plan frontmatter match REQUIREMENTS.md entries and are covered by verified artifacts.

---

### Anti-Patterns Found

No blockers or warnings detected. Scan results:

| File | Pattern Checked | Result |
|------|-----------------|--------|
| All 11 phase-4 files | TODO, FIXME, XXX, HACK, PLACEHOLDER | None found |
| All 11 phase-4 files | `return null`, `return []`, `return {}` | None found |
| `[bundleId]/route.ts` | `console.error` | Line 52 — intentional non-fatal R2 cleanup log, not a stub |
| `import/route.ts` | Empty returns | Early validation returns are real error responses (400, 404, 409, 500), not stubs |

---

### Human Verification Required

#### 1. End-to-End Publish Flow

**Test:** Log in via `ccb login`, upload a bundle snapshot, then run `ccb publish <bundleId>`. Fetch `GET /api/bundles/public/{githubHandle}/{bundleId}` anonymously.
**Expected:** Response includes `published_by` with your GitHub display name, `latest_snapshot` with the correct hash, `contents_summary` with real skills/hooks/commands.
**Why human:** Requires a live Supabase instance with the Phase 4 migration applied and a real GitHub OAuth session; R2 must be configured.

#### 2. End-to-End Import with Attribution

**Test:** As a second user, run `ccb import <owner>/<bundleId>` for the bundle published above.
**Expected:** Terminal displays "Published by: [owner display name]", optionally "Originated by" if lineage exists, then downloads and applies bundle files to `~/.claude/`.
**Why human:** Requires two distinct user accounts, live DB, live R2, and a real OAuth-populated `profiles` row.

#### 3. Unpublish Restores Private Visibility

**Test:** Run `ccb unpublish <bundleId>` on a public bundle. Then attempt `GET /api/bundles/public/{handle}/{slug}` anonymously.
**Expected:** ccb unpublish outputs `(visibility: private)`. The anonymous GET returns 404.
**Why human:** Requires live Supabase to verify the RLS policy enforces visibility=private correctly.

#### 4. Delete Cascade Verification

**Test:** Run `ccb delete <bundleId>` (confirm prompt), then verify in Supabase dashboard that bundle_snapshots, bundle_lineage, and bundle_publish_records rows are gone, and the R2 object is absent.
**Expected:** `{ deleted: true }`, all related rows cascaded, R2 object removed.
**Why human:** Requires live Supabase + R2 to verify cascade and storage cleanup.

---

### Gaps Summary

No gaps. All 14 must-have truths verified, all 11 artifacts substantive and wired, all 4 key requirements satisfied. The sole operational note is the pre-existing Nx worktree project-name collision that prevents `npx nx run cli:build` from the repo root — this is documented in Plans 04-01 and 04-03 SUMMARYs and worked around by running `tsc` directly in `packages/cli/`.

---

_Verified: 2026-04-01_
_Verifier: Claude (gsd-verifier)_
