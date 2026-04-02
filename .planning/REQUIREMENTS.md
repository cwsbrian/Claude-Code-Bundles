# Requirements: Claude Code Bundle Platform

**Defined:** 2026-03-31  
**Core Value:** 한 번 정의한 작업 번들을 로컬에서 검증한 뒤, 같은 계정으로 어떤 기기에서도 같은 스냅샷으로 복원할 수 있다.

## v1 Requirements

### Specification & governance

- [x] **SPEC-01**: `bundle.json`(또는 동등) 스키마가 버전과 함께 문서화되어 있고 레포에 고정된다.
- [x] **SPEC-02**: Import 시 private copy 생성, upstream 자동 동기화 없음, lineage는 스냅샷 관계만 남김이 문서·정책으로 명시된다.
- [x] **SPEC-03**: 로컬·원격 CLI/API에서 사용할 명령·엔드포인트 표면(pack/unpack/apply/sync 등)이 정의된다.
- [x] **TOOL-01**: Cursor/Codex용 코어→툴별 경로·규칙 매핑 표(스펙만)가 작성된다.

### Local CLI (Claude-first)

- [x] **CLI-01**: 사용자는 CLI로 워크스페이스를 번들 아카이브로 pack 할 수 있다.
- [x] **CLI-02**: 사용자는 fixture 번들로 unpack 후 동일 스냅샷 해시(또는 명시된 동등 규칙)를 재현할 수 있다.
- [x] **CLI-03**: 사용자는 manifest에 따라 번들을 Claude Code가 소비하는 로컬 경로에 apply 할 수 있다.
- [x] **CLI-04**: 번들 콘텐츠에 대한 시크릿/위험 패턴 lint(경고 또는 차단) 초안이 동작한다.

### Backend (Vercel + Supabase)

- [x] **BE-01**: Supabase Postgres에 설계 스케치에 맞는 `bundles`, `bundle_snapshots`, `bundle_lineage` 및 관련 테이블이 마이그레이션으로 존재한다.
- [x] **BE-02**: 번들 아카이브(zip)는 **Cloudflare R2**에 보관되며 **쓰기는 서버(API)만**(S3 API 자격 증명) 수행한다.
- [x] **API-01**: 인증된 사용자는 Vercel API를 통해 번들을 업로드할 수 있고 서버는 manifest·허용 규칙을 검증한다.
- [x] **API-02**: 인증된 사용자는 자신의 private 번들 목록 조회 및 다운로드가 가능하다.
- [x] **SEC-01**: DB RLS(또는 동등)로 타인 private 메타데이터 접근이 불가하다.

### Sync & devices

- [x] **SYNC-01**: 디바이스 등록 및 `device_bundle_installs` 수준의 설치 상태가 기록될 수 있다.
- [x] **SYNC-02**: 두 번째 디바이스에서 동일 계정으로 pull하여 동일 스냅샷을 복원할 수 있다.

### Public sharing & lineage

- [x] **PUB-01**: 소유자가 번들을 public으로 전환하고 공개 스냅샷을 노출할 수 있다.
- [x] **PUB-02**: 공개 번들 import 시 요청자 계정에 **새 private bundle**이 생기고 lineage(parent/root/imported_snapshot)가 기록된다.
- [x] **PUB-03**: API 또는 최소 UI에서 **Published by / Originated by**가 일관되게 노출된다.
- [x] **MOD-01**: public 번들에 대한 최소 unpublish·숨김 경로(소유자 또는 운영 스텁)가 있다.

### Discovery & operations (roadmap 후반)

- [ ] **FND-01**: Public 번들을 태그·정렬 기준으로 browse 할 수 있다(기본 수준).
- [ ] **OPS-01**: 신고·기본 moderation 훅과 운영에 필요한 최소 관측(설치 성공 등)이 문서화·스텁 수준으로 존재한다.

## v2 Requirements

(초기 로드맵에 포함됐으나 구현 순서는 후순위로 둘 항목을 여기에도 적어 둔다.)

### Discovery & operations

- **FND-02**: 인기·추천·랭킹 등 고도화된 탐색
- **OPS-02**: analytics 대시보드, 상세 신고 처리 워크플로

## Out of Scope

| Feature | Reason |
|---------|--------|
| Import 후 원본과 실시간 동기화 | 제품 정체성·재현성 — 스펙 비목표 |
| GitHub PR·머지 협업 | 초기 비목표 |
| Cursor/Codex 풀 네이티브 exporter(초기) | 코어+스펙 우선 정책 |
| 클라이언트 직접 R2 업로드 | API 경유만 — 사용자 결정 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPEC-01 | Phase 1 | Complete |
| SPEC-02 | Phase 1 | Complete |
| SPEC-03 | Phase 1 | Complete |
| TOOL-01 | Phase 1 | Complete |
| CLI-01 | Phase 1 | Complete |
| CLI-02 | Phase 1 | Complete |
| CLI-03 | Phase 1 | Complete |
| CLI-04 | Phase 1 | Complete |
| BE-01 | Phase 2 | Complete |
| BE-02 | Phase 2 | Complete |
| API-01 | Phase 2 | Complete |
| API-02 | Phase 2 | Complete |
| SEC-01 | Phase 2 | Complete |
| SYNC-01 | Phase 3 | Complete |
| SYNC-02 | Phase 3 | Complete |
| PUB-01 | Phase 4 | Complete |
| PUB-02 | Phase 4 | Complete |
| PUB-03 | Phase 4 | Complete |
| MOD-01 | Phase 4 | Complete |
| FND-01 | Phase 5 | Pending |
| OPS-01 | Phase 5 | Pending |

**Coverage:**

- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---

*Requirements defined: 2026-03-31*  
*Last updated: 2026-03-31 — Phase 2 requirements marked complete (code + planning closure)*
