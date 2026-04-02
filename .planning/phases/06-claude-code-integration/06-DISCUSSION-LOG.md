# Phase 6: Claude Code integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 06-claude-code-integration
**Areas discussed:** 구현 메커니즘, 인증 플로우, 커맨드 구조, ccb 의존성 정책

---

## 구현 메커니즘

| Option | Description | Selected |
|--------|-------------|----------|
| Claude가 Bash로 npx ccb 호출 | skill이 Bash tool로 npx @claude-code-bundles/cli 실행 | ✓ |
| Claude가 Bash로 node 직접 호출 | 로컬 설치 버전 직접 실행 | |
| Claude가 직접 HTTP API 호출 | curl/fetch로 서버 직접 호출 | |

**User's choice:** npx ccb 호출
**Notes:** 사용자가 "Claude Code에서 처음부터 install 할 수도 있어"라고 언급. CLI는 slim(import/pull/status만), publish/upload는 툴에서 메인으로 결정.

| Option | Description | Selected |
|--------|-------------|----------|
| /bundle skill + bootstrap 둘 다 | slash commands + npx one-liner bootstrap | ✓ |
| /bundle skill만 | slash commands만 | |
| Bootstrap one-liner + 플랫폼 인식 | npx one-liner가 메인 | |

**User's choice:** 둘 다

| Option | Description | Selected |
|--------|-------------|----------|
| 자동 감지 시도 + fallback 선택 | Claude Code 감지 시 자동, 아니면 선택 프롬프트 | ✓ |
| 항상 명시적 선택 | 매번 툴 선택 프롬프트 | |
| Phase 6에서는 Claude Code stub만 | Claude Code만, 기타 툴 나중에 | |

**User's choice:** 자동 감지 + fallback

---

## 인증 플로우

| Option | Description | Selected |
|--------|-------------|----------|
| auth.json → 없으면 npx ccb login 자동 실행 | 자동 처리 | ✓ |
| auth.json → 없으면 안내 후 종료 | 수동 실행 안내 | |
| skill 안에서 미니 로그인 플로우 | 별도 인증 메커니즘 | |

**User's choice:** auth.json 확인 → 없으면 npx ccb login 자동 실행
**Notes:** 사용자가 "스킬에서는 로그인이 힘들어? npx 호출못해?"라고 확인. Bash tool로 npx 호출 가능하므로 브라우저 OAuth 포함 전체 플로우 가능.

---

## 커맨드 구조

| Option | Description | Selected |
|--------|-------------|----------|
| /bundle:install, /bundle:pull, /bundle:status | 콜론 구분 별도 커맨드 | ✓ (import로 변경) |
| args로 하나의 /bundle | 단일 커맨드에 서브커맨드 | |
| 추가 커맨드 포함 | publish, browse 등 포함 | |

**User's choice:** 콜론 구분 구조 (`/bundle:import`, `/bundle:pull`, `/bundle:status`, `/bundle:browse`)
**Notes:** install → import로 이름 변경. "/bundle:install 아무것도 안치면 나의 번들목록이 나오고 선택하게 해줘. public bundle 목록은 browse 같은걸로 하자"

---

## ccb 의존성 정책 / Cold-start Bootstrap

**핵심 문제 논의:**
사용자: "만약 아무 설치도 안한 사람이 클로드 코드에서 import를 하려고 시도하면 어떻게 처리해야 될까?"
→ `/bundle:*` 커맨드 파일이 없으면 Claude Code가 인식 못함
→ 진입점은 반드시 터미널 npx

| Option | Description | Selected |
|--------|-------------|----------|
| npx + slash commands | npx one-liner → commands 설치 → /bundle:* 사용 | ✓ |
| npx + MCP server | MCP 방식으로 더 깊은 통합 | |
| npx만 | Claude Code 통합 없음 | |

**User's choice:** npx + slash commands

**추가 논의 — 번들 단위:**
사용자: "번들로 묶는 단위는 스킬 하나하나보다도 플러그인들이 될 거야. Plugin A, Plugin B를 하나의 번들로 묶는게 가능하게 되있냐는거지"
→ 현재 구조상 가능하나 namespace 충돌 이슈 있음. Phase 6 범위 아니지만 deferred idea로 기록.

---

## Claude's Discretion

- 커맨드 파일 내 프롬프트 세부 문구
- ccb import의 commands 설치 시 덮어쓰기 정책
- /bundle:browse 출력 포맷
- ccb 패키지 내 커맨드 파일 디렉토리 구조

## Deferred Ideas

- 번들 단위 = plugin 재정의 (스키마 v2)
- /bundle:publish 커맨드
- Cursor/Codex 경로 매핑
- MCP server 방식 통합
