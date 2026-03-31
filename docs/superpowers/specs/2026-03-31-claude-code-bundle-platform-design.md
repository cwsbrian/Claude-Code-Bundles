# Claude Code Bundle Platform — 설계·로드맵 스펙

**문서 목적**: 본인 실행용 체크리스트. 구현은 이 스펙 승인 후 `writing-plans` 단계에서 세분화한다.

**고정 결정 사항**

| 항목 | 결정 |
|------|------|
| 문서 독자 | 본인 실행용 (체크리스트 중심) |
| 일정 | 기간 고정 없음, Phase 완료 기준 |
| 인프라 | **Vercel** (API) + **Supabase** (Auth, Postgres) + **Cloudflare R2** (번들 바이너리, S3 호환) |
| 멀티 AI 툴 | **Claude 우선 구현**, Cursor/Codex는 **mapping spec만** 우선 제공 |
| R2 / 객체 업로드 | **직접 업로드(프리사인 URL 등) 없음** — API 경유 업로드만 |

---

## 1. 제품 경계와 성공 기준

**1차 목표**: AI 코딩 환경에서 재사용 가능한 작업 번들을 **계정 자산**으로 저장·복원한다.

**성공 기준 (Phase 단위로 검증)**

1. 로컬에서 bundle pack/unpack 및 Claude 적용이 재현 가능하다.
2. Supabase(Postgres)에 번들 메타가 기록되고 zip은 R2에 저장되며, 동일 계정으로 다른 디바이스에서 복원된다.
3. Public 번들 import 시 **private copy**가 생기고, lineage가 스냅샷 기준으로 남는다.
4. Public 노출 시 **Published by / Originated by** 표기가 일관된다.

**비목표 (초기)**

- 원본 작성자와의 **자동 upstream 동기화**
- GitHub 스타일 PR·머지 협업
- Cursor/Codex용 **완전 독립 구현** (초기에는 스펙만)

---

## 2. 아키텍처

| 레이어 | 기술 | 역할 |
|--------|------|------|
| 진입점 | **Vercel** (예: Next.js, API Routes) | 인증 연동, 업로드/다운로드 API, 웹 UI(선택) |
| 상태 | **Supabase** (Auth, Postgres) | 사용자, 번들 메타, lineage, 디바이스 설치 상태 |
| 오브젝트 | **Cloudflare R2** (S3 API) | 번들 zip 아카이브 (**쓰기·읽기는 서버/API만**) |
| 로컬 | **Bundle CLI** (Claude 우선) | pack / unpack / apply / sync pull·push |

**포맷 전략**

- **코어**: `bundle.json`(또는 동등) 단일 스키마.
- **Claude**: 실제 pack/apply 구현.
- **Cursor/Codex**: 코어 → 각 툴 디렉터리/규칙 매핑을 **문서(spec)** 로 정의; 구현은 후속 Phase.

**핵심 정책 (원본 설계 문서와 동일)**

- Bundle = 배포 단위이자 동기화 단위.
- Import = **소유권 복사** (내 계정 private 번들 신규 행).
- **No automatic upstream sync** after import.
- Lineage = import/publish **스냅샷** 관계, 라이브 연결 아님.

---

## 3. 데이터 플로우

1. **작성 → 백업**: 로컬 `pack` → API로 업로드 → 서버 검증 후 **R2**에 저장 + DB에 스냅샷/해시/메타 기록.
2. **복원**: 로그인 → 내 private 목록 조회 → `sync pull` → unpack → `apply` (Claude 경로).
3. **Public 가져오기**: 공개 번들 조회 → `import` → **새 private bundle** + `bundle_lineage` (parent, root, imported_snapshot_id) → 이후 (2)와 동일.
4. **멀티툴**: 다운로드 산출물은 항상 **코어 번들**; Cursor/Codex 적용은 스펙상 변환 규칙만 정의.

---

## 4. 에러 처리·보안·운영

**에러**

- 업로드: manifest/허용 파일 위반 → 거부 + 수정 가이드.
- 동기화: 네트워크 재시도; 동일 스냅샷이면 skip; 불일치 시 초기에는 **pull 우안** 등 단순 정책.

**보안**

- 번들 내 시크릿 금지: lint + 서버 단 기본 스캔.
- hooks 등: 설치 전 경고·opt-in.
- Public moderation: Phase 4에서 최소; 초기 **private 기본**.

**Object storage (확정: R2)**

- 브라우저·CLI 모두 **API 경유**로만 업로드 (R2 presign 없음).
- 서버가 검증 후 **R2 `PutObject`**. 경로 규칙(예: `userId/...`) + 요청 주체와 DB 소유권 일치 검증.

---

## 5. 테스트·검증 전략

| 영역 | 최소 검증 |
|------|-----------|
| 로컬 CLI | golden fixture 번들로 pack→unpack 바이트/해시 일치, `apply` 후 예상 경로 존재 |
| API | 인증 없이 업로드 불가, 타인 번들 접근 불가, import 시 새 owner 행 생성 |
| 스냅샷 | 동일 내용 재업로드 시 중복 정책(해시 기준) 명시 후 동작 확인 |
| 복원 | 두 디바이스 시나리오: A에서 push 후 B에서 pull 동일 스냅샷 |
| Lineage | import 체인 저장·UI/API 필드 Published by / Originated by |

자동화는 Phase 1부터 **CLI 단위 테스트 + API 통합 테스트(스테이징 Supabase + R2)** 를 목표로 둔다.

---

## 6. 구현 로드맵 (Phase 완료 기준)

원본 설계 Phase에 맞추되, 인프라·업로드 방식·멀티툴 스펙만 본 문서로 보강한다.

| Phase | 목표 | 포함 범위 | 완료 기준 |
|-------|------|-----------|-----------|
| **0** | 스펙 고정 | `bundle.json` 스키마, lineage 정책, CLI 명령 모양, Cursor/Codex mapping spec 초안 | 설계 문서 승인 |
| **1** | 로컬 번들러 MVP | pack/unpack/manifest, Claude `apply`, 시크릿 lint 초안 | 서버 없이 E2E 설치 검증 |
| **2** | 기본 백엔드 | Supabase 스키마, R2 객체 저장, Vercel API 업로드/다운로드, private 백업 | 내 번들 백업·단일 기기 복원 |
| **3** | 디바이스 동기화 | device/install 상태, pull/push 정책 | 멀티 디바이스 동일 스냅샷 복원 |
| **4** | Public sharing | public 전환, 공유 링크, lineage 노출, 최소 moderation | marketplace 기초 |
| **5** | 검색/발견 | 태그, 정렬, browse | public 탐색 |
| **6** | 정교화 | 신고, analytics, 설치 성공률, UX | 운영 가능 beta |

**실행 순서 (권장)**

1. manifest + local install target 구조 확정  
2. 로컬 pack/unpack CLI  
3. 계정 기반 private backup API (Vercel → Supabase 메타 + R2 바이너리)  
4. 멀티 디바이스 restore 안정화 후 public 오픈  
5. 검색·랭킹·analytics는 후순위  

**아직 연 Phase 0에서 닫을 결정**

- manifest에 포함할 파일 타입·훅 범위  
- 플러그인/CLI bootstrap 한 줄 명령 형태  
- public moderation 기준  
- 동일 snapshot R2/객체 dedupe 여부  
- current snapshot 생성 시점(파일 해시 집합 규칙)

---

## 7. 내가 준비할 것 (Vercel / Supabase / Cloudflare R2 / 공통)

한 번에 모아 둔 **준비물 체크리스트**. 값은 비밀이므로 레포에 커밋하지 말고 `.env.local` 등에만 둔다.

### Vercel

- [ ] Vercel 계정, **팀/프로젝트 이름** 결정  
- [ ] 이 레포(또는 생성할 앱)와 연결한 **Vercel Project**  
- [ ] 배포 브랜치·프리뷰 정책(개인이면 기본값으로 충분)  
- [ ] 환경 변수 슬롯 확보: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, **서버 전용** `SUPABASE_SERVICE_ROLE_KEY` (Postgres/API — **클라이언트 번들에 넣지 않음**)  
- [ ] **R2**: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT` 또는 `R2_ACCOUNT_ID`, `BUNDLE_STORAGE_BUCKET` (**서버 전용**)  
- [ ] (선택) 커스텀 도메인, JWT/쿠키 도메인 정합성

### Supabase

- [ ] 프로젝트 생성 region 선택  
- [ ] **Auth**: 사용할 로그인 방식 (이메일, OAuth 제공자)  
- [ ] **Database**: Phase 2+용 테이블 마이그레이션(또는 SQL) — `bundles`, `bundle_snapshots`, `bundle_lineage`, `devices`, `device_bundle_installs` 등 본 스펙 §8 엔터티 참고  
- [ ] **RLS**: 최소한 “본인 행만 읽기”는 DB에 적용  
- [ ] 연결 문자열·anon key·service role key를 Vercel 환경 변수에 등록  

### Cloudflare R2

- [ ] R2 버킷 생성 (`BUNDLE_STORAGE_BUCKET`와 동일 이름 권장)  
- [ ] S3 API용 **R2 API 토큰** 발급 → 액세스 키 / 시크릿을 Vercel 서버 환경 변수에 등록  
- [ ] 직접 브라우저 업로드 금지 유지 — **API만** `PutObject`/`GetObject`

### 공통·레포

- [ ] **로컬 CLI** 저장소 구조(모노레포 vs 분리) 결정  
- [ ] **Open source** 라이선스(MIT 등), `CONTRIBUTING`은 나중에 추가 가능  
- [ ] 시크릿: API 키·서비스 롤 키는 **절대** 번들 콘텐츠에 포함하지 않음

### Cursor / Codex (현 단계)

- [ ] 각 툴의 **설정/스킬/규칙 디렉터리** 공식 문서 링크를 스펙 부록에 모음  
- [ ] “코어 번들 조각 → 툴별 경로” 표만 유지해도 Phase 0 종료로 충분

---

## 8. 참고: 데이터 모델 스케치 (원본 문서)

| 엔터티 | 핵심 필드 |
|--------|-----------|
| `bundles` | bundle_id, owner_user_id, visibility, current_snapshot_id |
| `bundle_snapshots` | snapshot_id, bundle_id, hash, manifest blob/path, storage_path |
| `bundle_lineage` | bundle_id, parent_bundle_id, root_bundle_id, root_author_id, imported_snapshot_id |
| `bundle_publish_records` | bundle_id, published_at, published_snapshot_id, display_name |
| `devices` | device_id, user_id, platform, last_seen_at |
| `device_bundle_installs` | device_id, bundle_id, installed_snapshot_id, install_state |
| `bundle_assets` | snapshot_id, asset_path, checksum, size |

세부 컬럼·인덱스는 Phase 2 시작 시 스키마 설계서로 확정한다.

---

## 9. 스펙 자체 점검 (요약)

- Placeholder: Phase 0 결정 사항은 §6 표에 명시됨 — 구현 전 반드시 채움.  
- 모순 없음: 직접 업로드 제외와 “API 경유” 일치.  
- 범위: 단일 구현 플랜에 적합; Cursor/Codex은 스펙 트랙만 초기 포함.  
- 모호함 완화: 업로드는 항상 서버 단일 경로로 고정.

---

**다음 단계**: 이 파일을 검토한 뒤 변경 요청이 없으면 `writing-plans` 스킬로 구현 플랜을 작성한다.
