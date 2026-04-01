# Phase 4: Public sharing + lineage - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

소유자가 번들을 public으로 전환하고, 다른 사용자가 import하여 private copy + lineage를 생성하며, Published by / Originated by 출처 표기를 API 응답에 노출한다. 최소 moderation으로 소유자가 visibility를 private으로 되돌리거나 hard delete할 수 있다. Browse/검색은 Phase 5 scope.

</domain>

<decisions>
## Implementation Decisions

### Publish mechanics
- **D-01:** Publish는 **API endpoint only** — `PATCH /api/bundles/[bundleId]/publish`. CLI(`ccb publish <id>`)가 이 endpoint를 호출한다.
- **D-02:** Publishing은 **latest snapshot만** 공개한다. 과거 스냅샷은 노출하지 않는다.
- **D-03:** Design spec의 **`bundle_publish_records` 테이블을 생성**한다 — `published_at`, `published_snapshot_id`, `display_name`을 기록하여 publish 이력을 남긴다.
- **D-04:** `ccb publish <bundleId>` CLI 커맨드를 추가한다. 기존 `ccb remote/pull/status` 패턴과 일관.
- **D-05:** Publish **pre-check**: 최소 1개의 snapshot이 있어야 publish 가능. Snapshot 없는 빈 번들은 publish 거부. Secret scan은 upload 시 이미 수행했으므로 re-scan 불필요.
- **D-06:** 새 snapshot upload 후 **자동으로 public-facing snapshot이 latest로 갱신**된다. Explicit re-publish 불필요 — publish는 "이 번들은 public이다"라는 상태 토글.

### Import flow
- **D-07:** Import API는 **`POST /api/bundles/import`** — body: `{ sourceBundleId }`. 서버가 published snapshot을 복사하여 새 private bundle + lineage를 생성한다.
- **D-08:** R2 zip은 **importer의 namespace로 복사**한다 (`{importerUserId}/{newBundleId}/{snapshotId}.zip`). 원본과 독립된 사본으로 원본 삭제/비공개 전환에 영향받지 않는다.
- **D-09:** `bundle_lineage` 테이블에 **`root_author_id` 컬럼을 추가**한다 (ALTER TABLE). Import 시점에 root author를 기록하여 'Originated by'를 JOIN 없이 조회 가능. Lineage-policy.md D-04 스펙과 일치.
- **D-10:** `ccb import <owner/bundleId>` CLI 커맨드를 추가한다. Import API 호출 → 다운로드 → unpack → apply 전체 플로우를 CLI에서 수행.
- **D-11:** **Import 중복 처리**: 같은 이름의 번들이 이미 존재하면 사용자에게 **overwrite 또는 skip 선택**을 프롬프트한다. Phase 3 `ccb pull` 충돌 처리 패턴과 동일.

### Public bundle identifier
- **D-12:** Public 번들 참조 형식은 **`owner/public_bundle_id`** (예: `brian/my-cool-bundle`). GitHub repo 네이밍과 유사한 네임스페이스 방식.
- **D-13:** Owner handle은 **GitHub OAuth의 username** (`user_metadata.user_name`)을 사용한다. 별도 handle 등록 플로우 없음.

### User profiles & attribution
- **D-14:** **`public.profiles` 테이블을 생성**한다 — `user_id`, `github_handle`, `display_name`, `avatar_url`. 첫 로그인 시 OAuth metadata에서 자동 populate.
- **D-15:** 공개 표시 정보는 **display name + avatar** (email 비노출). 'Published by' 표기에 사용.
- **D-16:** 'Published by / Originated by' 표기는 **API responses only** — `GET /api/bundles/public/[owner/slug]`가 publisher + originator 정보를 JSON으로 반환. Web UI는 Phase 5. CLI(`ccb import`)에서 표시 가능.
- **D-17:** 'Originated by'(root author)는 **`bundle_lineage.root_author_id`에 저장** — import 시점에 기록. Query-time chain traversal 불필요.

### Public bundle metadata
- **D-18:** Public API 응답에 포함할 정보: bundle `display_name`, `public_bundle_id`, author(display_name + avatar), latest snapshot hash, `created_at`, **description**, **bundle contents summary** (manifest에서 추출한 skills/hooks/commands 목록).
- **D-19:** `bundles` 테이블에 **`description` 컬럼을 추가**한다. Discovery(Phase 5)에서도 활용.
- **D-20:** Bundle contents summary는 manifest의 skills/hooks/commands 목록을 추출하여 API 응답에 포함. Import 전 미리보기 역할.

### Public access & RLS
- **D-21:** Public 번들 조회는 **anonymous (인증 없이) 가능**하다. `GET /api/bundles/public/[owner/slug]`는 auth 불필요. Import는 인증 필요 (private copy 생성).
- **D-22:** RLS 정책 확장: `bundles`와 `bundle_snapshots`에 `visibility = 'public'`인 행에 대한 **anonymous SELECT** 정책 추가.
- **D-23:** Public 번들 목록(browse) API는 **Phase 4에서 제공하지 않는다** — 특정 bundle ID로만 조회 가능. Browse는 Phase 5 scope (FND-01).

### Unpublish & moderation
- **D-24:** "Unpublish"라는 별도 개념은 없다 — visibility를 `private`으로 되돌리면 public API에서 접근 불가. `ccb unpublish <id>` CLI 커맨드는 이 토글을 수행.
- **D-25:** 삭제는 **hard delete** — DB rows(CASCADE) + R2 objects 완전 삭제. Soft delete 없음. `ccb delete <id>` CLI 커맨드 추가.
- **D-26:** 삭제 시 **이미 install된 로컬 파일(`~/.claude/...`)은 건드리지 않는다**. Bundle은 패키징/배포 계층이고, apply된 파일은 독립적으로 존재.
- **D-27:** 삭제 시 **기존 import(독립 사본)는 영향받지 않는다**. Import는 별도 R2 object + DB rows를 가지므로 원본 삭제와 무관. Lineage record의 parent/root ID는 historical reference로 유지 (dangling FK 허용 — ON DELETE SET NULL).
- **D-28:** Moderation은 **owner-only** — Phase 4에서 admin/operator 역할 없음. Owner가 visibility 토글 또는 삭제로 관리. MOD-01 충족.

### Claude's Discretion
- `bundle_publish_records` 세부 컬럼 및 인덱스 설계
- `profiles` 테이블의 정확한 스키마 및 populate 트리거/로직
- API response JSON 필드 네이밍
- CLI output 포맷 (ccb publish/import/unpublish/delete)
- RLS 정책 세부 SQL
- `description` 컬럼의 길이 제한 및 기본값
- Bundle contents summary 추출 로직 세부

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning & requirements
- `.planning/ROADMAP.md` — Phase 4 목표·성공 기준 (PUB-01, PUB-02, PUB-03, MOD-01)
- `.planning/REQUIREMENTS.md` — PUB-01~03, MOD-01 요구사항 원문
- `.planning/PROJECT.md` — Import = private copy 정책, API 경유 업로드만, Vercel+Supabase+R2 고정

### Prior phase context
- `.planning/phases/01-spec-local-bundle-mvp/01-CONTEXT.md` — Lineage 필드 정의 (D-04), 시크릿 스캔 정책
- `.planning/phases/02-backend-private-backup/02-CONTEXT.md` — Nx 구조, 인증 모델, API 계약, DB 스키마, RLS
- `.planning/phases/03-multi-device-sync/03-CONTEXT.md` — ccb login OAuth, pull 충돌 처리 패턴, 인터랙티브 CLI 패턴

### Design spec
- `docs/superpowers/specs/2026-03-31-claude-code-bundle-platform-design.md` — 아키텍처, bundle_publish_records 스케치 (§8), lineage 데이터 모델, public moderation 방향

### Lineage & schema specs
- `docs/spec/lineage-policy.md` — Import = private copy, lineage 필드 인벤토리 (origin_bundle_id 등)
- `docs/spec/bundle-json.md` — Normative manifest (contents summary 추출 원본)
- `schemas/bundle-1.0.0.schema.json` — Machine-readable schema
- `supabase/migrations/20260331120000_phase2_bundles_rls.sql` — 현재 DB 스키마 (bundles, bundle_snapshots, bundle_lineage + RLS) — Phase 4 마이그레이션의 기반

### Existing code
- `apps/web/src/app/api/bundles/route.ts` — 번들 목록 API (owner-only GET 패턴)
- `apps/web/src/app/api/bundles/upload/route.ts` — 업로드 API (manifest 검증, secret scan, R2 저장 패턴)
- `apps/web/src/app/api/bundles/[bundleId]/snapshots/[snapshotId]/download/route.ts` — 다운로드 API (R2 스트림 패턴)
- `packages/cli/src/remote.ts` — RemoteApiContext, API 호출 유틸
- `packages/cli/src/pull.ts` — 인터랙티브 선택 + 충돌 처리 패턴 (import에서 재사용)
- `packages/cli/src/login.ts` — OAuth 로그인 플로우
- `packages/core/src/registry.ts` — 로컬 레지스트리 CRUD

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/pull.ts` — 인터랙티브 번들 선택 + 충돌 처리(skip/overwrite) 패턴. Import 중복 처리에 재사용 가능.
- `packages/cli/src/remote.ts` — `RemoteApiContext` 타입, 인증된 API 호출 유틸. Publish/import/unpublish/delete CLI 커맨드에서 재사용.
- `apps/web/src/app/api/bundles/upload/route.ts` — Manifest 검증, R2 저장, DB 입력 패턴. Import API(서버 측 복사)에서 유사 패턴 적용.
- `packages/core/src/unpack.ts`, `packages/core/src/apply.ts` — Import 후 로컬 apply 체인.
- `apps/web/src/lib/supabase/auth.ts` — `requireUser()` 인증 패턴. Anonymous 읽기 + 인증된 쓰기 분리 구현 시 참고.

### Established Patterns
- Nx monorepo: `apps/web` (Next.js Route Handlers), `packages/core` (shared), `packages/cli` (ccb bin)
- Auth: Supabase Auth Bearer token → API Route Handler `requireUser()` 검증
- R2 접근: 서버만 (API 경유), `putBundleZipObject()` / `getBundleZipObject()` 유틸
- CLI: top-level subcommand 패턴 (pull, status, login) + inquirer 인터랙티브 프롬프트
- DB: Supabase admin client (`createAdminClient()`), RLS 기본 적용

### Integration Points
- `packages/cli` → 새 API endpoints (publish, import, unpublish, delete)
- `apps/web` API → `packages/core` (manifest 파싱, contents summary 추출)
- 새 `profiles` 테이블 → OAuth 로그인 시 populate → public API attribution 응답
- Phase 4 마이그레이션 → Phase 2 스키마 위에 ALTER TABLE + 새 테이블 + 새 RLS

</code_context>

<specifics>
## Specific Ideas

- `ccb import brian/my-cool-bundle` 형태의 GitHub-like 네이밍 — 직관적이고 공유하기 쉬움.
- Import 중복 시 overwrite/skip 선택 — Phase 3 `ccb pull` 충돌 처리와 동일한 UX 패턴 유지.
- Bundle contents summary로 import 전 미리보기 — 어떤 skills/hooks/commands가 포함됐는지 확인 가능.
- "Unpublish"는 별도 개념이 아니라 visibility를 private으로 돌리는 것 — 삭제와 구분.
- 삭제는 번들 패키징만 제거, 이미 apply된 로컬 파일은 건드리지 않음.

</specifics>

<deferred>
## Deferred Ideas

- **Import count / stats** — Phase 5 discovery에서 인기도 지표로 활용. Phase 4에서는 추적하지 않음.
- **Public 번들 목록(browse) API** — Phase 5 scope (FND-01). Phase 4는 특정 ID 조회만.
- **Admin/operator moderation** — Phase 4는 owner-only. 운영자 역할은 Phase 5+ (OPS-01).
- **Soft delete** — Phase 4는 hard delete. 향후 compliance/audit 필요 시 재논의.
- **User-chosen handle (커스텀)** — GitHub username 대신 자체 handle 등록. Phase 4에서는 OAuth username만.
- **Re-scan on publish** — Upload 시 이미 secret scan 수행. Publish 시 재스캔은 불필요로 결정.
- **Import auto-retry** — Phase 3 pull과 동일하게 skip + continue. 자동 재시도는 후순위.
- **Web UI for publish/import** — Phase 4는 API + CLI only. Web dashboard는 Phase 5+.

</deferred>

---

*Phase: 04-public-sharing-lineage*
*Context gathered: 2026-04-01*
