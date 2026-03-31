# Phase 2: Backend + private backup - Context

**Gathered:** 2026-03-31  
**Status:** Ready for planning

<domain>
## Phase Boundary

**같은 계정**으로 로컬에서 만든 번들 아카이브를 **Vercel API 경유**로 업로드하고, **Supabase**(Postgres + Storage)에 private 메타·객체를 남긴 뒤, **단일 기기**에서 목록 조회·다운로드·로컬 복원까지 증明한다.  
Phase 2는 ROADMAP·REQUIREMENTS의 **BE-01, BE-02, API-01, API-02, SEC-01** 및 설계 문서의 **Storage 쓰기는 서버만** 원칙 범위 안에서만 동작한다. **멀티 디바이스·public·import**는 Phase 3+.

</domain>

<decisions>
## Implementation Decisions

### Monorepo & Vercel 진입점

- **D-01:** Phase 2에서 Vercel 배포 단위는 **`apps/web`** 아래 **Next.js(App Router)** 로 둔다. HTTP API는 **`app/api/**/route.ts`** Route Handlers로 구현한다(설계 문서의 “Vercel 예: Next.js, API Routes”와 일치).
- **D-02:** 기존 npm 패키지 루트(`claude-code-bundles`, `ccb` CLI)는 유지한다. 워크스페이스는 **npm workspaces** 또는 **분리 `package.json`** 중 하나로 구성하되, **CLI와 API가 동일 스키마·검증 로직을 공유**할 수 있어야 한다(아래 D-12).

### 인증·권한 모델

- **D-03:** 클라이언트(브라우저·CLI)는 **Supabase Auth**로 세션을 얻고, Vercel API 호출 시 **`Authorization: Bearer <access_token>`**(또는 동등의 Supabase 세션 토큰)을 보낸다.
- **D-04:** API Route에서는 토큰으로 사용자를 검증한 뒤에만 DB/Storage 작업을 허용한다. **서버 전용** Supabase **service role** 키는 **Route Handler 서버 측에서만** 사용하며, 클라이언트 번들에 포함하지 않는다.
- **D-05:** Phase 2 범위에서 **모든 업로드·조회·다운로드는 “소유한 private 번들”에 한정**된다. `public`, 타 사용자 행 접근은 Phase 4+.

### 업로드·다운로드 계약(HTTP)

- **D-06:** 업로드는 **직접 Storage 업로드 금지** — 요청 본문은 API로만 온다(PROJECT.md 비목표와 일치). 페이로드 형식: **`multipart/form-data`** 에 단일 파일 필드(예: `archive`)로 **zip 번들 아카이브**를 받는다(Phase 1 `pack` 산출과 호환).
- **D-07:** 업로드 응답은 최소 **번들 id, 스냅샷 id(또는 버전), 정규화 스냅샷 해시, Storage 객체 키(내부용)** 를 반환할 수 있어야 한다. 필드 이름은 구현에서 고정하고 OpenAPI/문서에 적는다.
- **D-08:** 다운로드는 **인증된 소유자만** 가능하고, **서버가 Storage에서 읽어** 스트림하거나 **단기 signed URL**을 발급하는 패턴 중 하나를 택한다 — **권장: 서버 스트림**(정책·로깅 일원화). 최종 선택은 구현 단계에서 하나로 고정한다.

### DB·Storage 구조(요약 레벨)

- **D-09:** Postgres에는 REQUIREMENTS **BE-01**에 맞춰 최소 **`bundles`**, **`bundle_snapshots`**, 그리고 이후 lineage를 위해 **`bundle_lineage`**(또는 동등 관계)가 마이그레이션으로 존재해야 한다. 구체 컬럼·FK는 설계 스케치 + Phase 3 연속성을 고려해 planner가 확정한다.
- **D-10:** Storage 객체 키 네임스페이스는 **`{userId}/...`** 형태를 기본으로 하고(설계 문서 §4), **DB에 기록된 소유자**와 요청 주체가 일치할 때만 쓰기·읽기를 허용한다.
- **D-11:** 동일 번들에 대해 **동일 정규화 스냅샷 해시**가 이미 존재하면 **새 바이너리 업로드를 생략**하고 기존 스냅샷을 참조하는 **멱등** 동작을 허용한다(설계 문서 §5 “중복 정책(해시 기준)”).

### 서버 측 검증·거절 UX

- **D-12:** API는 업로드 시 **Phase 1과 동일한 `bundle.json` 스키마**(예: `schemas/bundle-1.0.0.schema.json`)로 **manifest 내용을 검증**한다. 구현은 **기존 `src/lib/manifest-validate.ts` 로직을 공유**하는 것을 1순위로 한다(복불 복제 시 동기화 주석 필수).
- **D-13:** 아카이브 내부에 대한 **서버 측 기본 시크릿 스캔**을 수행한다(설계 §4). Phase 1 로컬 lint(D-09~D-11)와 정합되게, **high-confidence 민감 정보는 업로드 항상 거절**(Phase 2에서는 **visibility 무관**하게 서버에서 차단 — 운영 단순화); 응답 본문에 **수정 가이드** 문구를 포함한다(API-01).
- **D-14:** manifest/스키마/스캔 실패 시 **HTTP 4xx** + 구조화된 에러(필드·코드)를 반환한다.

### RLS / SEC-01

- **D-15:** **RLS(또는 동등한 서버 측 강제)** 로 **타인의 private 번들 메타·스냅샷 행 조회·수정이 불가**해야 한다. 서비스 롤 우회는 **오직 신뢰된 서버 코드**에서만.

### CLI와의 연동(Phase 2 최소)

- **D-16:** Phase 2 완료 시점에 **로컬 CLI에서 인증 세션을 사용해 API로 업로드**할 수 있는 경로가 있어야 한다(설계 데이터 플로 “pack → API 업로드”). 서브커맨드 이름은 **`ccb`(또는 `ccb remote`) 하위**로 두되, 정확한 이름·플래그는 PLAN에서 확정한다.

### Claude's Discretion

- Next.js·Supabase 클라이언트 라이브러리 버전, 마이그레이션 도구(supabase CLI vs prisma 등), 통합 테스트 러너에서 스테이징 프로젝트 시드 방법, 다운로드 구현(스트림 vs signed URL), 에러 JSON 스키마 세부 필드.

### Folded Todos

(해당 없음)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning & requirements

- `.planning/ROADMAP.md` — Phase 2 목표·성공 기준·요구사항 ID(BE-01~02, API-01~02, SEC-01)
- `.planning/REQUIREMENTS.md` — 백엔드/API/보안 요구사항 원문
- `.planning/PROJECT.md` — Vercel+Supabase 고정, API 경유 업로드만, 비목표

### Phase 1 & 스키마

- `.planning/phases/01-spec-local-bundle-mvp/01-CONTEXT.md` — 로컬 번들·lint·스냅샷 해시 의사결정
- `docs/spec/bundle-json.md` — normative manifest
- `schemas/bundle-1.0.0.schema.json` — machine-readable schema
- `docs/spec/lineage-policy.md` — lineage 필드(Phase 2 테이블 설계 시 참조)
- `src/lib/manifest-validate.ts` — 서버 검증 공유 1선 후보
- `src/lib/snapshot-hash.ts` — 스냅샷 id/멱등 정책(D-11)과 정합

### Design spec

- `docs/superpowers/specs/2026-03-31-claude-code-bundle-platform-design.md` — 아키텍처, 데이터 플로, Storage 정책, 테스트 방향

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/cli/index.ts` 및 `src/lib/*` — Phase 1 **pack/unpack**, **manifest 검증**, **스냅샷 해시**, **lint 규칙 개념**; Phase 2 API·업로드 파이프라인이 같은 규칙을 재사용해야 한다.
- `schemas/bundle-1.0.0.schema.json` — 서버 manifest 검증의 단일 기준.

### Established Patterns

- TypeScript + Vitest + Node `type: module` 단일 패키지; Phase 2에서 monorepo로 확장 시 타입스크립트 경로·빌드 일관성 유지.

### Integration Points

- 향후 CLI `upload`/`remote` 명령이 **Vercel `apps/web` API** 를 호출.
- Supabase Auth 세션 ↔ API Bearer 검증 ↔ service role로 Storage/DB.

</code_context>

<specifics>
## Specific Ideas

- 업로드 실패 메시지는 설계 문서의 “**거부 + 수정 가이드**” 스타일을 따른다(사용자가 고칠 수 있는 액션 위주).

</specifics>

<deferred>
## Deferred Ideas

- **멀티 디바이스** `device_bundle_installs`, pull 정책 — Phase 3 (**SYNC-01/02**).
- **Public / import / lineage UI** — Phase 4+.
- **클라이언트 직접 Storage 업로드(프리사인)** — PROJECT 비목표 유지.

### Reviewed Todos (not folded)

(해당 없음)

</deferred>

---

*Phase: 02-backend-private-backup*  
*Context gathered: 2026-03-31*
