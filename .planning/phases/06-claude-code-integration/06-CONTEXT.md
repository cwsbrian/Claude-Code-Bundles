# Phase 6: Claude Code integration - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

`ccb` CLI 없이 Claude Code 안에서 `/bundle:*` slash command로 번들 기능을 사용한다. 진입점은 `npx` one-liner — 최초 실행 시 ccb + Claude Code 커맨드 파일을 설치하고 import까지 한번에 처리. 이후부터 `/bundle:import`, `/bundle:pull`, `/bundle:status`, `/bundle:browse`를 Claude Code에서 사용 가능.

업로드/publish는 툴(Claude Code 또는 다른 툴)에서 시작하는 것이 메인. CLI는 import/pull/status 정도만 담당.

</domain>

<decisions>
## Implementation Decisions

### 구현 메커니즘
- **D-01:** 실행 메커니즘은 **Claude Code slash command + Bash tool로 npx ccb 호출**. skill 파일 내에서 `Bash` tool로 `npx @claude-code-bundles/cli <subcommand>` 실행.
- **D-02:** 플랫폼 감지: Claude Code 컨텍스트에서 실행 시 자동으로 Claude Code 경로 사용. 아닌 경우 인터랙티브 선택 프롬프트 (`Claude Code / Cursor / Codex / 기타`). `--tool` 플래그로도 명시 가능.

### Cold-start Bootstrap
- **D-03:** **진입점은 `npx` 터미널 one-liner**. Claude Code에 `~/.claude/commands/bundle/` 파일이 없으면 `/bundle:*` 인식 불가 — 파일을 먼저 설치해야 함.
- **D-04:** `ccb import owner/bundle-id` 실행 시 (또는 `npx @claude-code-bundles/cli import`):
  1. auth.json 없으면 자동으로 `ccb login` (OAuth 브라우저 플로우)
  2. `~/.claude/commands/bundle/` 파일 없으면 자동 설치 (사이드이펙트)
  3. bundle import + apply
  - 즉, cold-start 사용자도 npx one-liner 하나로 전부 완료.
- **D-05:** 번들 공유 시 제공하는 명령어: `npx @claude-code-bundles/cli import owner/bundle-id` (npx 방식). Claude Code 커맨드 파일 설치 포함.

### 커맨드 파일 위치 및 소스
- **D-06:** Claude Code 커맨드 파일(`import.md`, `pull.md`, `status.md`, `browse.md`)은 **npm 패키지에 포함**. `ccb import` 실행 시 패키지 내 파일을 `~/.claude/commands/bundle/`에 복사.
- **D-07:** 커맨드 파일 네이밍: `.claude/commands/bundle/import.md` → `/bundle:import`. 이하 동일 패턴.

### 커맨드 구조
- **D-08:** Phase 6에서 구현할 커맨드:
  - `/bundle:import [owner/id]` — ID 지정 시 바로 import. 인자 없으면 내 번들 목록 표시 후 선택. import = 서버 private copy 생성 + apply.
  - `/bundle:pull` — 내 원격 번들 동기화 (ccb pull과 동일)
  - `/bundle:status` — 로컬 vs 서버 비교
  - `/bundle:browse` — 공개 번들 탐색 (Phase 5 browse API 활용)
- **D-09:** 커맨드는 Claude에게 Bash로 npx ccb subcommand를 실행하도록 지시하는 프롬프트 파일. 기존 `.claude/commands/gsd/` 파일 구조와 동일한 패턴.

### 인증 플로우
- **D-10:** skill 실행 시 auth.json 먼저 확인 (`~/.claude/bundle-platform/auth.json`). 없으면 Bash로 `npx ccb login` 자동 실행 (브라우저 OAuth 포함). 완료 후 원래 작업 계속.
- **D-11:** 환경변수 대체 허용: `CCB_TOKEN` + `CCB_API_URL`이 있으면 auth.json 없어도 동작.

### CLI 범위 조정 (Phase 6 관점)
- **D-12:** CLI(`ccb`)는 slim — import, pull, status, setup(commands 설치)만. publish/upload는 Claude Code skill이 메인.
- **D-13:** `ccb setup` 커맨드 추가: `~/.claude/commands/bundle/` 파일만 설치, import 없이. 이미 ccb 있는 사용자가 커맨드 파일만 설치할 때.

### Claude's Discretion
- 커맨드 파일 내 프롬프트 세부 문구
- `ccb import`의 commands 설치 시 기존 파일 덮어쓰기 정책 (`--force` 여부)
- `/bundle:browse` 출력 포맷 (테이블, 리스트 등)
- ccb 패키지 내 커맨드 파일 디렉토리 구조

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning & requirements
- `.planning/ROADMAP.md` — Phase 6 목표·성공 기준
- `.planning/PROJECT.md` — Claude 우선, Cursor/Codex는 매핑 스펙 우선 정책

### Prior phase context
- `.planning/phases/03-multi-device-sync/03-CONTEXT.md` — auth 플로우 (D-10~D-11), resolveApiContext, auth.json 위치
- `.planning/phases/01-spec-local-bundle-mvp/01-CONTEXT.md` — apply 대상 루트 `~/.claude/` (D-07), CLI 명령 표면

### Existing patterns
- `.claude/commands/gsd/execute-phase.md` — Claude Code slash command 파일 형식 (YAML frontmatter + markdown body 패턴)
- `packages/cli/src/index.ts` — ccb CLI 진입점, 현재 명령어 목록
- `packages/cli/src/auth-store.ts` — AUTH_PATH 위치, loadAuth/saveAuth 패턴
- `packages/cli/src/pull.ts` — resolveApiContext, 인터랙티브 번들 선택 패턴

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/auth-store.ts` — `loadAuth()`, `saveAuth()`, `AUTH_PATH`. Phase 6도 그대로 사용.
- `packages/cli/src/pull.ts` — 번들 목록 조회 + 인터랙티브 선택 로직. `/bundle:import` 인자 없을 때 재사용.
- `packages/cli/src/import.ts` — bundle import + apply 전체 플로우. `/bundle:import owner/id` 핵심 로직.
- `packages/cli/src/status.ts` — 로컬 vs 서버 비교. `/bundle:status` 재사용.
- `packages/cli/src/remote.ts` — `resolveApiContext`, `listRemoteBundles`, `downloadSnapshotToFile`.

### Established Patterns
- `.claude/commands/gsd/*.md` — slash command 파일 형식: YAML frontmatter (`name`, `description`, `allowed-tools`) + markdown body (Claude에게 주는 지시문).
- `ccb` CLI: `npm run build` → `dist/index.js`. `packages/cli/package.json`의 `bin.ccb`.

### Integration Points
- `packages/cli/src/index.ts` — `setup` 서브커맨드 추가 위치.
- `packages/cli/src/` — `setup.ts` 신규 파일 추가.
- 커맨드 파일 소스 디렉토리: `packages/cli/src/commands/bundle/` (신규 생성) → npm 패키지에 포함.
- 설치 대상: `~/.claude/commands/bundle/`.

</code_context>

<specifics>
## Specific Ideas

- 번들 공유 시 README에 제공할 one-liner: `npx @claude-code-bundles/cli import {owner}/{bundle-id}`
- 이 명령어 하나로: ccb 실행 → auth (없으면 login) → commands 설치 → import+apply 완료

</specifics>

<deferred>
## Deferred Ideas

### 번들 단위 재정의 (중요 — 향후 스키마 설계 시 반영 필요)
번들의 기본 단위가 개별 skill이 아니라 **plugin** 이 되어야 한다는 방향성. Plugin A + Plugin B를 하나의 번들로 묶을 수 있어야 함. 현재 구조(단일 제작자 번들)는 namespace 충돌 이슈 있음. 스키마 v2 또는 별도 phase에서 다뤄야 할 아키텍처 결정.

### /bundle:publish
툴에서 업로드/publish가 메인이라고 결정됐으나, `/bundle:publish` 커맨드 구체 설계는 Phase 6 이후.

### Cursor, Codex 경로 매핑
Phase 6에서 플랫폼 감지(Claude Code vs 기타) stub만. Cursor/Codex 실제 경로 매핑은 후속 phase.

### MCP server 방식 통합
`claude mcp add bundle npx @claude-code-bundles/mcp-server` 방식 — slash command보다 더 깊은 통합. 자연어 요청도 가능. 검토 가치 있으나 Phase 6 범위 아님.

</deferred>

---

*Phase: 06-claude-code-integration*
*Context gathered: 2026-04-02*
