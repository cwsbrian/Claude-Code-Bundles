---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Completed 05-01-PLAN.md
last_updated: "2026-04-02T20:30:17.306Z"
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 13
  completed_plans: 12
  percent: 91
---

# Project State

## Project Reference

See: `.planning/PROJECT.md`

**Core value:** 한 번 정의한 작업 번들을 로컬에서 검증한 뒤, 같은 계정으로 어떤 기기에서도 같은 스냅샷으로 복원할 수 있다.

**Current focus:** Phase 05 — discovery-operational-beta

## Current Position

Phase: 05
Plan: 1 of 2 complete

Status: In progress — Phase 5 plan 1 complete

Progress: `[█████████░] 92%` (12 of 13 plans complete)

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

### Roadmap Evolution

- Phase 7 added: Security hardening — 시크릿 스캔 패턴 확장 + prompt injection 감지 + 다운로드 경로 스캔 (2026-04-02)

### Blockers/Concerns

- Deployed Supabase: apply migrations; **Cloudflare R2**: create bucket + API token; wire env on Vercel before production backup.

## Session Continuity

Last session: 2026-04-02T20:30:17.303Z
Stopped at: Completed 05-01-PLAN.md

Resume: Phase 5 plan 01 complete. Next: 05-02-PLAN.md (browse/report API endpoints).

### Phase 5 Decisions (05-01)

- bundle_tags uses separate table (not JSONB) for normalization and efficient tag filtering via bundle_tags_tag_name_idx
- Max 5 tags enforced at API level only — keeps DB schema flexible, matches D-08
- bundle_reports has no public SELECT policy — admin access via service role through Supabase dashboard (D-13/D-15)
- import_count uses read-then-write increment (not Postgres RPC) — eventual consistency acceptable for beta counter (D-18)
- PATCH tag update uses replace-all strategy (delete + insert) for simplicity and idempotency
