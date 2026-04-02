---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Completed 04-03-PLAN.md — Phase 4 CLI commands complete
last_updated: "2026-04-02T00:33:54.363Z"
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 11
  completed_plans: 11
  percent: 91
---

# Project State

## Project Reference

See: `.planning/PROJECT.md`

**Core value:** 한 번 정의한 작업 번들을 로컬에서 검증한 뒤, 같은 계정으로 어떤 기기에서도 같은 스냅샷으로 복원할 수 있다.

**Current focus:** Phase 04 — public-sharing-lineage

## Current Position

Phase: 06
Plan: Not started

Status: Phase complete — ready for verification

Progress: `[█████████░] 91%` (10 of 11 plans complete — Phase 1, 2, 3 fully done; Phase 4 plans 1-2/3 done)

## Verification (2026-03-31)

- `npx nx run workspace:test` — 13 tests, all passed
- `npx nx run-many -t build --projects=core,cli,web` — success

## Accumulated Context

### Phase 2 artifacts

- Summaries: `phases/02-backend-private-backup/02-01-SUMMARY.md` … `02-03-SUMMARY.md`
- Remote E2E: `scripts/e2e-backup-restore.sh` (requires live `CCB_API_URL` + token)

### Pending Todos

- Phase 3: `03-01` COMPLETE — auth-store, login, unified auth resolution done
- Phase 3: `03-02` COMPLETE — ccb pull + ccb status commands

### Phase 4 Decisions (04-02)

- Public bundle GET uses createAdminClient without requireUser — service role enforces visibility=public filter explicitly
- Import 409 duplicate check with overwrite=true escape hatch mirrors Phase 3 pull conflict pattern for consistent UX
- Delete ordering: collect R2 keys, delete DB first (CASCADE), then clean R2 non-fatally — orphaned objects safer than orphaned rows
- root_author_id propagation: if source has lineage use its root_author_id, else fallback to source bundle owner_user_id

### Phase 4 Decisions (04-01)

- Publish toggle is a single PATCH endpoint: public->private = unpublish, private->public = publish (D-24)
- bundle_publish_records records latest snapshot ID on each publish event (D-02/D-03/D-06)
- R2 CopyObjectCommand CopySource uses `/${bucket}/${key}` leading-slash format per R2 docs
- Profiles auto-populated via DB trigger on auth.users INSERT; backfill covers existing users (D-14)

### Phase 3 Decisions (03-01 + 03-02)

- Store `api_url` in auth.json alongside tokens so `ccb remote` works without env vars after login
- `resolveApiContext` made exported+async to enable reuse in pull/status commands (03-02)
- `snapshotHash` added as optional field in `RegistryEntry` for backward compat with existing registry entries
- Used rb.id (UUID) for downloadSnapshotToFile API call, public_bundle_id as registry key — matches server API and local registry conventions
- `status.ts` falls back to snapshotId when snapshotHash absent for backward compat with pre-plan-01 registry entries

### Blockers/Concerns

- Deployed Supabase: apply migrations; **Cloudflare R2**: create bucket + API token; wire env on Vercel before production backup.

## Session Continuity

Last session: 2026-04-02T00:28:13.442Z
Stopped at: Completed 04-03-PLAN.md — Phase 4 CLI commands complete

Resume: Phase 4 plans 1-2/3 complete. Next: 04-03-PLAN.md (CLI commands: ccb publish, ccb import, ccb unpublish, ccb delete).
