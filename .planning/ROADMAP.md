# Roadmap: Claude Code Bundle Platform

## Overview

설계 스펙을 단일 출처로 두고, **로컬 번들 MVP → Supabase 메타 + R2 백업 → 멀티 디바이스 → 공개·lineage → 탐색·운영 베타** 순으로 쌓는다. Phase 수는 coarse 설정에 맞춰 **5개 실행 Phase**로 묶었고(스펙의 Phase 0–6을 병합), 완료는 일정이 아니라 **Phase별 완료 기준**으로 판단한다.

## Phases

- [x] **Phase 1: Spec + local bundle MVP** — 스키마·정책·매핑 문서 고정 + Claude용 pack/unpack/apply/lint, 서버 없이 E2E
- [x] **Phase 2: Backend + private backup** — Supabase 스키마·RLS, **R2**에 zip(서버만 쓰기), Vercel API 업로드/다운로드
- [ ] **Phase 3: Multi-device sync** — 디바이스·설치 상태, pull로 동일 스냅샷 복원
- [ ] **Phase 4: Public sharing + lineage** — public 전환, import→private copy, Published by / Originated by, 최소 moderation
- [ ] **Phase 5: Discovery + operational beta** — 기본 browse, 신고/운영 스텁·관측

## Phase Details

### Phase 1: Spec + local bundle MVP

**Goal:** 서버 없이 번들의 핵심 가치(재현 가능한 pack/apply)를 증명한다.

**Depends on:** Nothing (first phase)

**Requirements:** SPEC-01, SPEC-02, SPEC-03, TOOL-01, CLI-01, CLI-02, CLI-03, CLI-04

**Success Criteria** (what must be TRUE):

1. 문서만 보고도 동일한 `bundle.json` 스키마와 lineage 정책을 구현할 수 있다.
2. Golden fixture로 pack→unpack 후 스냅샷 동등성(해시 또는 명시 규칙)이 검증된다.
3. `apply` 후 Claude Code가 기대하는 로컬 레이아웃이 생성된다.
4. 시크릿 lint가 의도된 샘플에 대해 경고 또는 차단을 일으킨다.

**Plans:** 3 plans

Plans:

- [x] [01-01-PLAN.md](phases/01-spec-local-bundle-mvp/01-01-PLAN.md) — 스키마·정책·CLI·툴 매핑 문서 고정 및 schema_version 정책 (SPEC-01–03, TOOL-01)
- [x] [01-02-PLAN.md](phases/01-spec-local-bundle-mvp/01-02-PLAN.md) — pack/unpack + 정규화 스냅샷 해시 + golden fixture (CLI-01, CLI-02)
- [x] [01-03-PLAN.md](phases/01-spec-local-bundle-mvp/01-03-PLAN.md) — apply/install/list/lint/create + 로컬 E2E (CLI-03, CLI-04)

### Phase 2: Backend + private backup

**Goal:** 같은 계정으로 번들을 서버에 백업하고 한 기기에서 복원한다.

**Depends on:** Phase 1

**Requirements:** BE-01, BE-02, API-01, API-02, SEC-01

**Success Criteria**:

1. 인증된 사용자만 업로드·자신의 private 목록 조회가 가능하다.
2. 업로드는 API 경유만 되며 **R2**에 아카이브가 저장된다.
3. manifest 검증 실패 시 거부와 수정 가이드가 반환된다.
4. RLS(또는 동등)로 타인 private 메타에 접근할 수 없다.

**Plans:** 3 plans (Nx monorepo + backend; see `02-CONTEXT.md`)

Plans:

- [x] [02-01-PLAN.md](phases/02-backend-private-backup/02-01-PLAN.md) — Nx + `packages/core`/`packages/cli` 이전 + Supabase 마이그레이션·**R2 정책 문서**·RLS (BE-01, BE-02, SEC-01)
- [x] [02-02-PLAN.md](phases/02-backend-private-backup/02-02-PLAN.md) — `apps/web` 업로드/목록/다운로드 API + manifest·서버 스캔 (API-01, API-02)
- [x] [02-03-PLAN.md](phases/02-backend-private-backup/02-03-PLAN.md) — `ccb remote` + 단일 기기 백업→복원 E2E + SEC-01 부정 경로

### Phase 3: Multi-device sync

**Goal:** 내 private 번들을 여러 기기에서 동일 스냅샷으로 맞춘다.

**Depends on:** Phase 2

**Requirements:** SYNC-01, SYNC-02

**Success Criteria**:

1. 계정 인증(`ccb login`)으로 기기를 식별하고, 로컬 레지스트리에 설치 상태가 기록된다.
2. 기기 A에서 백업한 스냅샷을 기기 B에서 `ccb pull`로 동일하게 복원한다.

**Plans:** 2 plans

Plans:

- [ ] [03-01-PLAN.md](phases/03-multi-device-sync/03-01-PLAN.md) — `ccb login` OAuth PKCE + auth-store + 통합 인증 해석 + 레지스트리 snapshotHash (SYNC-01)
- [ ] [03-02-PLAN.md](phases/03-multi-device-sync/03-02-PLAN.md) — `ccb pull` 인터랙티브 동기화 + `ccb status` 비교 (SYNC-02)

### Phase 4: Public sharing + lineage

**Goal:** 공개·수입·출처 표기가 스펙과一致한다.

**Depends on:** Phase 3

**Requirements:** PUB-01, PUB-02, PUB-03, MOD-01

**Success Criteria**:

1. public 전환 및 공유 링크(또는 ID)로 조회 가능하다.
2. import 시 새 private bundle과 lineage 스냅샷이 생성된다.
3. Published by / Originated by가 사용자에게 보인다.
4. 최소 unpublish/숨김이 가능하다.

**Plans:** TBD

Plans:

- [ ] 04-01: publish/import API 및 lineage 저장
- [ ] 04-02: 최소 노출(웹 또는 CLI) + moderation 스텁

### Phase 5: Discovery + operational beta

**Goal:** public 탐색과 운영 가능한 베타 수준으로 다듬는다.

**Depends on:** Phase 4

**Requirements:** FND-01, OPS-01

**Success Criteria**:

1. 태그·정렬 기준으로 public 번들을 browse 할 수 있다.
2. 신고·운영 경로가 문서와 코드에 스텁으로 존재하고 관측 포인트가 정의된다.

**Plans:** TBD

Plans:

- [ ] 05-01: browse API·최소 UI(선택)
- [ ] 05-02: 신고·기본 운영·관측

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Spec + local MVP | 3/3 | Complete | 2026-03-31 |
| 2. Backend + backup | 3/3 | Complete | 2026-03-31 |
| 3. Multi-device | 0/2 | Planned | - |
| 4. Public + lineage | 0/2 | Not started | - |
| 5. Discovery + beta | 0/2 | Not started | - |
