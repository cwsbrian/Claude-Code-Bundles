# Phase 1: Spec + local bundle MVP - Context

**Gathered:** 2026-03-31  
**Status:** Ready for planning

<domain>
## Phase Boundary

서버 없이 **스펙(스키마·정책·매핑 문서) 고정**과 **로컬 CLI(pack/unpack/apply/install/list/lint/manifest validate)** 로 번들 재현성을 증명한다.  
Phase 1 완료 기준은 ROADMAP의 성공 기준(문서만으로 구현 가능, golden fixture 동등성, apply 후 Claude Code 소비 경로 생성, 시크릿 lint 동작)을 따른다.

</domain>

<decisions>
## Implementation Decisions

### Bundle schema versioning (`bundle.json`)

- **D-01:** `schema_version` 시작값은 `1.0.0` 이다.
- **D-02:** **major 불일치**면 읽기/처리 실패(종료 코드 비 0).
- **D-03:** **minor/patch 불일치**는 계속 진행하되 경고를 출력한다.

### Lineage 필드(문서·매니페스트에 포함)

- **D-04:** Phase 1 문서에 다음 lineage 식별자를 **필드로 명시**한다:  
  `origin_bundle_id`, `origin_snapshot_id`, `imported_at`, `root_bundle_id`, `root_author_id`, `parent_bundle_id`.

### Pack / unpack 동등성(Phase 1 golden fixture)

- **D-05:** “동일 스냅샷”은 **정규화된 해시(또는 동등 규칙)가 동일**함으로 정의한다(아카이브 바이트 단위 동일은 요구하지 않음).
- **D-06:** 정규화 규칙: **경로+파일 내용**은 비교 대상. **mtime, zip 헤더 타임스탬프, 압축 레벨, OS 메타데이터**는 비교에서 제외한다.

### `apply` 대상 및 충돌 정책

- **D-07:** `apply`의 대상 루트는 **사용자 전역 `~/.claude/...` 계층**으로 고정한다(프로젝트 워크스페이스가 아님).
- **D-08:** 기본: 대상 경로 충돌 시 실패. **`--force`일 때만** 덮어쓴다.

### 시크릿 / 위험 패턴 lint

- **D-09:** 시크릿·위험 패턴 검사는 **로컬 스크립트/CLI 엔진만** 수행한다. **Claude Code·LLM에 번들 원문을 읽혀 검사하지 않는다**(유출 경로 차단).
- **D-10:** high confidence로 판정된 민감 정보:  
  - 번들 **`visibility: public`** 이면 **차단**(실패).  
  - **`visibility: private`** 이면 **경고만** 출력하고 진행 허용.
- **D-11:** 스캔 범위는 manifest에만 한정하지 않고, **아카이브에 실제 포함된 전체 항목**을 대상으로 하며, **고위험 파일명/패턴**(예: `.env`, `*.pem`, `id_rsa`, `credentials.json` 등 — 최종 목록은 구현에서 규칙 세트로 정의)도 적용한다.

### CLI 명령 표면(Phase 1)

- **D-12:** Phase 1 공식 명령: `create`, `pack`, `unpack`, `apply`, `install`, `list`, `lint`, `manifest validate`.
- **D-13:** 사용자 플로우: **`create`로 매니페스트를 만들기 전에는 일반 사용자 관점에서 `pack` 진행이 불가**해야 한다. `pack`은 유효한 매니페스트가 없으면 실패하고 안내 메시지를 출력한다. (자동화/테스트를 위해 동일 매니페스트 파일을 CI에서 직접 재사용하는 것은 허용 — “수동으로 빈 번들을 pack”만 막으면 됨.)
- **D-14:** `create`는 **터미널 기반 멀티스텝(순차 프롬프트/선택)** 으로 구현한다. (라디오/체크박스 UI는 CLI에서 숫자/멀티선택으로 표현.)
- **D-15:** Phase 1에서 `install`의 입력은 **로컬 번들 아카이브(또는 로컬 정의된 번들 경로)** 로 한정한다. 성공 시 `~/.claude/...`에 적용하고 **로컬 설치 레지스트리**를 갱신한다.
- **D-16:** Phase 1에서 `list`는 **로컬 레지스트리에 등록된 번들**과 **현재 설치 스냅샷/상태**를 보여준다.

### Claude's Discretion

- 정확한 레지스트리 파일 경로·스키마, 해시 트리 계산 세부(파일 정렬 규칙 등), high confidence 규칙 세트의 구체 패턴 목록, `manifest validate` 오류 메시지 포맷.

### Folded Todos

(해당 없음)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning & requirements

- `.planning/ROADMAP.md` — Phase 1 범위·성공 기준·요구사항 ID 매핑
- `.planning/REQUIREMENTS.md` — SPEC/CLI 요구사항(SPEC-01~03, TOOL-01, CLI-01~04)
- `.planning/PROJECT.md` — 제품 경계, 제약(Vercel+Supabase, Claude 우선), 시크릿 정책 요지

### Design spec

- `docs/superpowers/specs/2026-03-31-claude-code-bundle-platform-design.md` — 플랫폼 설계·데이터 플로우·보안·테스트 전략 요지

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- (없음) 현재 레포는 `.planning/` 및 `docs/` 중심으로 초기화된 상태이며 애플리케이션 소스 트리는 아직 없다.

### Established Patterns

- GSD 산출물: ROADMAP / REQUIREMENTS / PROJECT 가 단일 추적 문서로 존재한다.

### Integration Points

- 향후 CLI는 사용자 머신의 `~/.claude/` 및 로컬 레지스트리 파일에 연결된다.

</code_context>

<specifics>
## Specific Ideas

- `create` UX는 이름 입력 → visibility 선택 → skills/hooks 등 포함 항목 선택 순서를 염두에 둔다.
- 시크릿 검사는 AI/채팅이 아니라 **로컬 실행 스크립트**만.

</specifics>

<deferred>
## Deferred Ideas

다음은 **Phase 1 범위를 넘는다**(계정·원격·URL). Phase 2+ 에서 백엔드/인증과 함께 정의한다.

- **원격 계정에 연결된 내 번들 목록**을 `list`에 합치기.
- **`install` 시 내 계정에 이미 있는 번들이면 URL 없이 설치**.
- **타인 번들 설치 시 URL(또는 공개 ID) 필요** 흐름.

### Reviewed Todos (not folded)

(해당 없음)

</deferred>

---

*Phase: 01-spec-local-bundle-mvp*  
*Context gathered: 2026-03-31*
