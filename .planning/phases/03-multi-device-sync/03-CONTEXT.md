# Phase 3: Multi-device sync - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

내 private 번들을 여러 기기에서 동일 스냅샷으로 pull·복원할 수 있게 한다. 디바이스 등록·추적은 하지 않는다 — 로그인한 계정 기준으로 번들에 접근. Public 공유·import·lineage UI는 Phase 4+.

</domain>

<decisions>
## Implementation Decisions

### Device tracking policy
- **D-01:** 디바이스 등록(`devices` 테이블)과 per-device 설치 상태(`device_bundle_installs`)는 Phase 3에서 구현하지 않는다. 번들은 계정(user) 단위로 관리되며, 로그인한 어떤 기기에서든 pull 가능하다. 디바이스 수 제한 없음.
- **D-02:** SYNC-01의 "디바이스 등록" 요구사항은 축소 해석 — 계정 인증으로 기기 식별을 대체한다. 설치 상태는 로컬 레지스트리(`~/.claude/bundle-platform/registry.json`)에만 기록한다.

### Pull behavior (`ccb pull`)
- **D-03:** `ccb pull`은 top-level 커맨드로 구현한다 (`ccb remote pull`이 아님).
- **D-04:** Pull 플로우: 서버에서 내 번들 목록 조회 → 인터랙티브 리스트에서 설치할 번들 선택 → 다운로드 + unpack + apply.
- **D-05:** 이미 로컬에 동일 스냅샷 해시가 있는 번들은 "up-to-date"로 표시하고 기본 skip.

### Conflict handling (newer server snapshot)
- **D-06:** 로컬에 설치된 번들보다 서버에 새 스냅샷이 있으면 pull 시 프롬프트를 띄운다: skip 또는 overwrite 선택.
- **D-07:** 동일 해시면 skip (프롬프트 없이 자동).

### Pull failure handling
- **D-08:** 여러 번들 pull 중 하나가 실패하면 skip하고 나머지 계속 진행. 완료 후 실패 목록을 summary로 표시. 개별 재시도는 사용자가 수동으로.

### `ccb status` command
- **D-09:** `ccb status` 커맨드를 새로 추가한다. 로컬 레지스트리 vs 서버 상태를 비교하여 표시: up-to-date / newer on server / local-only.

### Auth flow (`ccb login`)
- **D-10:** `ccb login` 커맨드를 새로 추가한다. 브라우저를 열어 Supabase Auth OAuth 플로우를 진행하고, 콜백으로 받은 토큰을 로컬에 저장한다.
- **D-11:** 기존 `ccb remote` 커맨드들이 사용하는 인증(`CCB_API_URL` + token 환경변수)과 `ccb login`의 저장 토큰을 통합 — login으로 저장된 토큰이 있으면 환경변수 없이도 동작.

### Claude's Discretion
- 인터랙티브 리스트 UI 라이브러리 선택 (inquirer, prompts 등)
- 토큰 저장 위치 및 형식 (`~/.claude/bundle-platform/auth.json` 등)
- `ccb status` 출력 포맷 (테이블, 컬러 등)
- OAuth callback 서버 구현 방식 (localhost redirect 등)
- pull 시 다운로드 진행 표시 방식

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning & requirements
- `.planning/ROADMAP.md` — Phase 3 목표·성공 기준 (SYNC-01, SYNC-02)
- `.planning/REQUIREMENTS.md` — SYNC-01, SYNC-02 요구사항 원문
- `.planning/PROJECT.md` — 제품 경계, Vercel+Supabase+R2 고정, API 경유 업로드만

### Prior phase context
- `.planning/phases/02-backend-private-backup/02-CONTEXT.md` — Nx 구조, 인증 모델, API 계약, DB 스키마 의사결정
- `.planning/phases/01-spec-local-bundle-mvp/01-CONTEXT.md` — 로컬 번들·레지스트리·apply 의사결정

### Design spec
- `docs/superpowers/specs/2026-03-31-claude-code-bundle-platform-design.md` — 아키텍처, 데이터 플로, `devices`/`device_bundle_installs` 원래 설계 (Phase 3에서는 축소 적용)

### Existing schema
- `supabase/migrations/20260331120000_phase2_bundles_rls.sql` — Phase 2 DB 스키마 (bundles, bundle_snapshots, bundle_lineage + RLS)

### Existing CLI
- `packages/cli/src/remote.ts` — 기존 `ccb remote` upload/list/download 구현
- `packages/core/src/registry.ts` — 로컬 레지스트리 (`~/.claude/bundle-platform/registry.json`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/remote.ts` — `RemoteApiContext` 타입, API 호출 유틸, multipart 업로드 로직. Pull 구현 시 download 로직 재사용 가능.
- `packages/core/src/registry.ts` — 로컬 레지스트리 CRUD (`updateRegistry`, `readRegistryFile`). Status 비교 시 로컬 상태 소스.
- `packages/core/src/unpack.ts`, `packages/core/src/apply.ts` — 다운로드 후 unpack → apply 체인에 재사용.
- `apps/web/src/app/api/bundles/route.ts` — 번들 목록 API (GET). Pull에서 호출.
- `apps/web/src/app/api/bundles/[bundleId]/snapshots/[snapshotId]/download/route.ts` — 다운로드 API. Pull에서 호출.

### Established Patterns
- Nx monorepo: `apps/web` (Next.js), `packages/core` (shared), `packages/cli` (ccb bin)
- Auth: Supabase Auth Bearer token → API Route Handler에서 검증
- R2 접근: 서버만 (API 경유 다운로드)

### Integration Points
- `packages/cli` → `apps/web` API (list + download)
- `packages/cli` → `packages/core` (unpack, apply, registry)
- Supabase Auth OAuth → `ccb login` 토큰 저장 → `ccb pull`/`ccb status`에서 사용

</code_context>

<specifics>
## Specific Ideas

- `ccb pull`은 top-level — 가장 자주 쓰는 멀티디바이스 동작에 최단 경로 제공.
- 인터랙티브 리스트에서 각 번들 옆에 상태 표시 (up-to-date / newer available / not installed).
- 충돌 시 강제 덮어쓰기가 아니라 skip/overwrite 선택을 사용자에게 준다.

</specifics>

<deferred>
## Deferred Ideas

- **`devices` / `device_bundle_installs` 테이블** — 원래 설계 스펙에 있었으나 Phase 3에서는 불필요. 향후 디바이스별 분석·제한이 필요하면 별도 phase로.
- **`ccb login --token`** (headless/CI 환경) — Phase 3에서는 browser OAuth만. CI용 토큰 페이스트는 후순위.
- **Auto-retry on failure** — 현재는 skip + continue. 자동 재시도는 복잡도 대비 가치가 낮아 후순위.
- **`ccb push`** (로컬 → 서버 업로드 단축) — 현재 `ccb remote upload` 존재. 별도 논의.

</deferred>

---

*Phase: 03-multi-device-sync*
*Context gathered: 2026-04-01*
