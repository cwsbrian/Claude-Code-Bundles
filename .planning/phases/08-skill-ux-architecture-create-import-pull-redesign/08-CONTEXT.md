# Phase 8: Skill UX Architecture — create, import, pull redesign - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning
**Source:** PRD Express Path (docs/superpowers/specs/2026-04-03-skill-ux-architecture-design.md)

<domain>
## Phase Boundary

CLI(`ccb`)를 순수 실행 엔진으로 단순화하고, 모든 사용자 인터랙션을 Claude Code 스킬로 이동한다. 구체적으로:

1. `bundle:create` — AskUserQuestion 최소화 (이름 인자 시 1턴, 없으면 2턴), CLI wizard 제거
2. `bundle:import` — dry-run preview + 유저 확인 후 설치 (prompt injection 방어)
3. `bundle:pull` — status diff 보여주고 확인 후 동기화

`~/.claude/`에 파일을 쓰는 모든 커맨드는 스킬이 UX 담당.

</domain>

<decisions>
## Implementation Decisions

### 아키텍처 원칙
- **D-01:** CLI = 실행 엔진. Interactive prompt 없음. 모든 입력은 플래그.
- **D-02:** 스킬 = UX 레이어. AskUserQuestion, 확인, 파일 미리보기 담당.
- **D-03:** AI는 번들 파일 내용을 해석하지 않는다. 코드블록으로 유저에게 노출, 판단은 유저.

### 커맨드 티어
- **D-04:** 스킬 필수: create, import, pull (`~/.claude/`에 쓰기, 유저 판단 필요)
- **D-05:** CLI 가능: browse, status, list, pack, unpack, lint (읽기 전용/기술적)
- **D-06:** CLI 전용: login, logout, setup (브라우저/시스템 접근)

### bundle:create 플로우
- **D-07:** 이름이 커맨드 인자로 제공되면 → AskUserQuestion(visibility, components) 1번 → CLI 실행 (1턴)
- **D-08:** 이름 없으면 → plain text로 이름 질문 → AskUserQuestion(visibility, components) → CLI 실행 (2턴)
- **D-09:** AskUserQuestion components는 multiSelect: true, options: skills/hooks/commands/templates
- **D-10:** create-wizard.ts의 TTY readline wizard 제거. 플래그 전용 경로만 유지.

### bundle:import 플로우
- **D-11:** `ccb import owner/slug --dry-run` 신규 플래그 추가 — 파일 목록만 출력, 설치 안 함
- **D-12:** 스킬이 dry-run 출력을 코드블록으로 유저에게 보여줌 (AI 해석 없이)
- **D-13:** AskUserQuestion: "설치할까요?" → 승인 시 `ccb import owner/slug --yes`, 거절 시 abort
- **D-14:** owner/slug 없으면 `ccb remote list` 실행 후 AskUserQuestion으로 선택

### bundle:pull 플로우
- **D-15:** pull은 내 번들만 (낯선 파일 위험 없음) → 파일 레벨 미리보기 불필요
- **D-16:** `ccb status` 먼저 실행 → 변경 없으면 "최신 상태" 종료
- **D-17:** 변경 있으면 변경될 번들 목록 보여줌 → AskUserQuestion: "동기화할까요?" → `ccb pull --yes`

### 스킬 파일 위치
- **D-18:** 모든 스킬 파일은 `packages/cli/commands/bundle/`에 위치 (npm 패키지 포함, Phase 6에서 확립)
- **D-19:** create.md 신규, import.md 수정, pull.md 수정

### Claude's Discretion
- create.md에서 components 선택 없을 때 기본값 처리 (all vs none)
- dry-run 출력 포맷 (파일 경로 목록, JSON, tree 등)
- import --dry-run에서 서버사이드 private copy 생성 타이밍 (dry-run 시 생성 안 함 권장)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design spec (source of truth)
- `docs/superpowers/specs/2026-04-03-skill-ux-architecture-design.md` — 승인된 설계 문서 (플로우, CLI 변경사항 전체)

### Phase 6 패턴 (스킬 파일 형식)
- `.planning/phases/06-claude-code-integration/06-CONTEXT.md` — 스킬 파일 설계 결정 (D-01~D-13), commands/ 디렉토리 구조
- `.planning/phases/06-claude-code-integration/06-02-PLAN.md` — import.md, pull.md 원본 작성 패턴
- `packages/cli/commands/bundle/import.md` — 현재 import.md (수정 대상)
- `packages/cli/commands/bundle/pull.md` — 현재 pull.md (수정 대상)

### CLI 소스
- `packages/core/src/create-wizard.ts` — TTY wizard 제거 대상
- `packages/cli/src/index.ts` — --dry-run 플래그 추가 위치
- `packages/cli/src/import.ts` — import dry-run 로직 추가 위치

### 기존 커맨드 파일 패턴
- `.claude/commands/bundle/create.md` — 현재 create.md (교체 대상, 로컬 설치본)

</canonical_refs>

<specifics>
## Specific Ideas

- `ccb import --dry-run`은 파일 목록을 stdout으로 출력하고 exit code 0으로 종료. 서버사이드 private copy 생성 없음.
- dry-run 출력 예시:
  ```
  Files to be installed:
    ~/.claude/commands/bundle/foo.md
    ~/.claude/skills/foo/bar.md
  ```
- create.md에서 이름 없을 때 plain text 질문 예시: "번들 이름이 뭐예요?"
- import.md에서 파일 목록은 ``` ``` 코드블록으로 감싸서 AI가 지시문으로 해석 못 하게 함

</specifics>

<deferred>
## Deferred Ideas

- **플러그인 단위 번들** — 설치된 플러그인(gsd, superpowers) 목록으로 컴포넌트 선택. 스키마 v2 또는 별도 phase.
- **보안 스캔** — 결정론적 패턴 매칭으로 secrets/prompt injection 감지. Phase 7.
- **bundle:publish 스킬** — Phase 6 CONTEXT에서 이미 deferred.

</deferred>

---

*Phase: 08-skill-ux-architecture-create-import-pull-redesign*
*Context gathered: 2026-04-03 via PRD Express Path*
