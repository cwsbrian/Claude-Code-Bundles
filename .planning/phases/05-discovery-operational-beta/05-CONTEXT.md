# Phase 5: Discovery + operational beta - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Public 번들을 태그·정렬 기준으로 browse할 수 있는 API를 제공하고, 신고·기본 moderation 스텁·운영 관측 포인트를 갖춘 베타 수준으로 다듬는다. Web UI는 이 Phase에 포함하지 않는다 — API-first. CLI에서도 browse API를 소비할 수 있다.

</domain>

<decisions>
## Implementation Decisions

### Browse API
- **D-01:** `GET /api/bundles/public` 리스트 엔드포인트를 추가한다. Web UI 없이 API only.
- **D-02:** 정렬 옵션: `recent` (created_at desc, 기본값), `popular` (import_count desc), `alphabetical` (display_name asc).
- **D-03:** 커서 기반 페이지네이션. 커서는 마지막으로 본 ID + sort value 조합. `?cursor=...&limit=20` 형태.
- **D-04:** 리스팅 응답은 경량 형태: `id`, `public_bundle_id`, `display_name`, `description`, `published_by` (display_name + avatar), `tags`, `created_at`, `import_count`. 상세는 기존 `GET /api/bundles/public/[owner]/[slug]` 엔드포인트 사용.
- **D-05:** 태그 기반 필터링 지원: `?tag=productivity` 등.

### Tagging System
- **D-06:** Free-form 태그 방식. 작성자가 자유롭게 태그를 지정한다. 사전 정의된 카테고리 없음.
- **D-07:** 태그는 언제든 수정 가능. Publish 시점에 태그가 필수가 아님.
- **D-08:** 번들당 최대 5개 태그 제한.
- **D-09:** 태그 관리는 기존 번들 업데이트 API에 통합: `PATCH /api/bundles/[id]`에 `tags` 배열 필드 추가. 별도 태그 엔드포인트 없음.
- **D-10:** DB 구조: `bundle_tags` 테이블 (bundle_id, tag_name) 또는 bundles 테이블에 tags 배열 컬럼 — Claude 재량.

### Reporting & Moderation
- **D-11:** `POST /api/bundles/[id]/report` 엔드포인트. 인증된 사용자만 신고 가능.
- **D-12:** 신고 사유: enum (`malicious`, `spam`, `inappropriate`, `other`) + 선택적 description 텍스트.
- **D-13:** `bundle_reports` 테이블에 저장. 자동 조치 없음 — 운영자가 Supabase 대시보드에서 직접 조회·처리.
- **D-14:** 중복 방지: `(reporter_user_id, bundle_id)` UNIQUE 제약. 이미 신고한 번들에 대해 409 반환.
- **D-15:** Admin API나 review workflow는 Phase 5에 포함하지 않음 (v2 scope).

### Observability
- **D-16:** `bundles` 테이블에 `import_count` integer 컬럼 추가 (기본값 0). Import API 핸들러에서 원자적 증가.
- **D-17:** `GET /api/health` 엔드포인트 추가. `{ status: 'ok', timestamp }` 반환. DB 연결 확인 포함.
- **D-18:** Download count, daily aggregates 등 고도화 메트릭은 v2 (OPS-02) scope.

### Claude's Discretion
- `bundle_tags` 테이블 vs tags 배열 컬럼 선택
- 커서 인코딩 방식 (base64, opaque string 등)
- 태그 정규화 (lowercase, trim 등)
- Health endpoint의 DB check 구현 방식
- Report reason enum의 DB 구현 (check constraint vs enum type)
- Browse API의 기본 limit 값
- CLI browse 커맨드 추가 여부 및 출력 포맷

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning & requirements
- `.planning/ROADMAP.md` — Phase 5 목표·성공 기준 (FND-01, OPS-01)
- `.planning/REQUIREMENTS.md` — FND-01, OPS-01 요구사항 원문
- `.planning/PROJECT.md` — API 경유 업로드만, Vercel+Supabase+R2 고정

### Prior phase context
- `.planning/phases/04-public-sharing-lineage/04-CONTEXT.md` — Public bundle API 설계 (D-18~D-23), profiles 테이블 (D-14), description 컬럼 (D-19), anonymous access (D-21), browse deferred to Phase 5 (D-23)
- `.planning/phases/02-backend-private-backup/02-CONTEXT.md` — Nx monorepo 구조 (D-01), Supabase Auth + RLS (D-03~D-05)

### Design spec
- `docs/superpowers/specs/2026-03-31-claude-code-bundle-platform-design.md` — 전체 플랫폼 설계 스케치

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/app/api/bundles/public/[owner]/[slug]/route.ts` — 단일 public 번들 상세 API. 응답 형태·profiles JOIN·lineage 조회 패턴 참조.
- `apps/web/src/app/api/bundles/route.ts` — Private 번들 목록 API. Supabase query + 정렬 패턴 재사용 가능.
- `apps/web/src/app/api/bundles/import/route.ts` — Import API. import_count 증가 로직 추가 지점.
- `apps/web/src/lib/supabase/admin.ts` — `createAdminClient` 유틸.
- `apps/web/src/lib/supabase/auth.ts` — `requireUser`, `HttpError` 유틸.

### Established Patterns
- Route Handler: Next.js App Router `route.ts` 파일. `createAdminClient()` + `requireUser(request)` 패턴.
- DB 쿼리: Supabase JS client `.from().select().eq()` 체인.
- RLS: 기존 정책이 owner_user_id 기반 private access + visibility='public' anonymous SELECT 지원.

### Integration Points
- Browse API: `apps/web/src/app/api/bundles/public/route.ts` (새 파일)
- Report API: `apps/web/src/app/api/bundles/[bundleId]/report/route.ts` (새 파일)
- Health API: `apps/web/src/app/api/health/route.ts` (새 파일)
- Tags: `PATCH /api/bundles/[bundleId]` 기존 엔드포인트 확장
- Import count: `apps/web/src/app/api/bundles/import/route.ts` 수정
- DB migrations: Supabase migration 파일 추가 (bundle_tags, bundle_reports, import_count 컬럼)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- Web UI for bundle browsing — future phase or v2
- Full-text search (tsvector) — v2 when bundle count justifies it
- Admin API for report review — v2 (OPS-02)
- Download count tracking — v2 (OPS-02)
- Daily aggregate analytics — v2 (OPS-02)
- Auto-hide on N reports threshold — v2, needs manual review workflow first

</deferred>

---

*Phase: 05-discovery-operational-beta*
*Context gathered: 2026-04-02*
