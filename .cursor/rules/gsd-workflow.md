<!-- gsd-project-start source:PROJECT.md -->
## Project

**Claude Code Bundle Platform**

Claude Code(우선)에서 쓰는 **번들(bundle)** — skills, hooks, commands, templates 등을 한 단위로 묶은 패키지 — 을 만들고, **Vercel + Supabase 백엔드**로 백업·복원·(이후) 공유까지 지원하는 오픈소스 지향 플랫폼이다. 사용자는 GitHub를 저장소로 쓰지 않아도 계정 기준으로 번들을 자산처럼 다루고, import 시 **내 계정 private 사본**이 생기며 원본과 **자동 upstream 동기화는 하지 않는다**. Cursor/Codex는 첫 단계에서 **코어 포맷 + 매핑 스펙**만 제공하고 구현은 후순위다.

**Core Value:** **한 번 정의한 작업 번들을 로컬에서 검증한 뒤, 같은 계정으로 어떤 기기에서도 같은 스냅샷으로 복원할 수 있다** — 공유·탐색은 그 다음 층으로 둔다.

### Constraints

- **Tech stack**: Vercel + Supabase 고정 — 다른 호스팅/DB로 바꾸려면 별도 의사결정.
- **Security**: 번들 내 시크릿 금지·기본 스캔; hooks 적용 전 경고·opt-in; 서비스 롤 키는 서버만.
- **Compatibility**: 코어 번들 단일 스키마; 툴별 산출물은 어댑터/스펙으로 확장.
<!-- gsd-project-end -->

<!-- gsd-stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- gsd-stack-end -->

<!-- gsd-conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- gsd-conventions-end -->

<!-- gsd-architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- gsd-architecture-end -->

<!-- gsd-workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- gsd-workflow-end -->



<!-- gsd-profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- gsd-profile-end -->
