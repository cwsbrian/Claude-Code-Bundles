# Claude Code Bundle Platform

## What This Is

Claude Code(우선)에서 쓰는 **번들(bundle)** — skills, hooks, commands, templates 등을 한 단위로 묶은 패키지 — 을 만들고, **Vercel**(API) + **Supabase**(Auth·Postgres) + **Cloudflare R2**(번들 zip)로 백업·복원·(이후) 공유까지 지원하는 오픈소스 지향 플랫폼이다. 사용자는 GitHub를 저장소로 쓰지 않아도 계정 기준으로 번들을 자산처럼 다루고, import 시 **내 계정 private 사본**이 생기며 원본과 **자동 upstream 동기화는 하지 않는다**. Cursor/Codex는 첫 단계에서 **코어 포맷 + 매핑 스펙**만 제공하고 구현은 후순위다.

## Core Value

**한 번 정의한 작업 번들을 로컬에서 검증한 뒤, 같은 계정으로 어떤 기기에서도 같은 스냅샷으로 복원할 수 있다** — 공유·탐색은 그 다음 층으로 둔다.

## Requirements

### Validated

- [x] Phase 1 (Validated in Phase 1: Spec + local bundle MVP): `bundle.json`(또는 동등) 스키마, lineage 정책, CLI 명령 형태, Cursor/Codex mapping spec 초안이 레포에 고정되었다.
- [x] Phase 1 (Validated in Phase 1: Spec + local bundle MVP): 로컬 MVP(pack / unpack / manifest / Claude `apply` / 시크릿 lint 초안)가 서버 없이 E2E로 검증되었다.
- [x] Phase 2 (Validated in Phase 2: Backend + private backup): Supabase 마이그레이션·RLS, **R2** 객체 저장, Next.js API 업로드/목록/다운로드, `ccb remote`, 단일 기기 백업→복원 및 자동화된 검증(`nx` build/test)이 레포에 반영되었다.

### Active

- [ ] 멀티 디바이스: 내 private 번들을 다른 기기에서 동일 스냅샷으로 pull·복원할 수 있다.
- [ ] Public 공유: public 전환·공유·import 시 private copy·lineage 스냅샷·Published by / Originated by 표기가 일관된다.
- [ ] (후속) 검색·발견, moderation·analytics·UX 정교화가 로드맵 후반에 올라간다.

### Out of Scope

- 원본 작성자 번들과의 **라이브 동기화** — import 이후 독립 사본 유지가 정책.
- GitHub 스타일 PR·머지·충돌 해결 워크플로 — 초기 제품에 포함하지 않음.
- Cursor/Codex **풀 구현** — v1 전반에서 Claude 우선; 타 툴은 매핑 문서 우선.
- 클라이언트→**R2** **직접 업로드**(프리사인 등) — 업로드는 항상 API(서버) 경유.

## Context

- 실행·의사결정 문서(체크리스트): `docs/superpowers/specs/2026-03-31-claude-code-bundle-platform-design.md`
- 인프라: **Vercel** 앱/API, **Supabase** Auth·Postgres, **Cloudflare R2** 번들 zip; 객체 쓰기는 서버(API)에서만.
- 일정: **기간 고정 없음**, Phase 완료 기준으로 진행.
- 문서 독자: 본인 실행용(초기).

## Constraints

- **Tech stack**: Vercel + Supabase(Auth/DB) + **Cloudflare R2(객체)** 고정 — 다른 조합은 별도 의사결정.
- **Security**: 번들 내 시크릿 금지·기본 스캔; hooks 적용 전 경고·opt-in; 서비스 롤 키는 서버만.
- **Compatibility**: 코어 번들 단일 스키마; 툴별 산출물은 어댑터/스펙으로 확장.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vercel + Supabase + **R2** | 서버리스 API + Auth/DB + S3 호환 객체 스토어 | Phase 2: 메타는 Supabase, zip은 R2, API만 쓰기 |
| API 경유 업로드만 | 클라이언트→버킷 직접 업로드 금지 | Phase 2: R2는 Route Handler + R2 API 토큰만 |
| Import = private copy, no upstream sync | 재현성·소유 경계 명확 | Phase 4에서 구현 예정(정책은 문서 고정) |
| Claude 우선, Cursor/Codex는 spec 먼저 | 첫 오픈소스에서 검증 범위 축소 | Phase 1 유지 |
| Lineage = 스냅샷 관계 | 라이브 연결·크레딧 복잡도 회피 | DB에 `bundle_lineage` 테이블·플레이스홀더(Phase 4) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

## Current State

Phase 1–2 complete (2026-03-31): local MVP, private backup API, `ccb remote`, 그에 대한 자동화 테스트까지 반영됨. **다음 초점은 Phase 3** (multi-device sync: devices / pull).

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-03-31 — Phase 2 closure*
