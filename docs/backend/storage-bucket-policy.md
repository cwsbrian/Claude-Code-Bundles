# Bundle object storage — Cloudflare R2 (Phase 2 — BE-02)

## Bucket (R2)

- **제품 이름**: Cloudflare **R2** — S3 호환 API. 버킷은 R2 대시보드에서 생성한다.
- 권장 버킷 이름: `bundle-archives` (또는 `BUNDLE_STORAGE_BUCKET` 환경 변수와 동일).
- **공개 익명 read/list 금지.** 번들 zip은 오직 **백엔드 API**가 서버 자격 증명으로 읽고 쓴다.

## Object keys

- 형식: `{owner_user_id}/{bundle_uuid}/{snapshot_id}.zip` — DB `bundle_snapshots.storage_object_key`와 동일해야 한다.
- 클라이언트가 접두사를 바꿔 쓰지 못하게 **업로드/다운로드는 항상 API**에서 소유권 검증 후 키를 결정한다.

## Write path

1. 브라우저·CLI는 R2에 **직접** 올리지 않는다.
2. 클라이언트 → **Vercel Route Handler** (`Authorization: Bearer` Supabase 사용자 JWT).
3. 서버: manifest 검증 + 서버 시크릿 스캔 후 **`@aws-sdk/client-s3`** 로 R2에 `PutObject`.
4. R2 자격 증명: **`R2_ACCESS_KEY_ID`**, **`R2_SECRET_ACCESS_KEY`** + **`R2_ENDPOINT`** 또는 **`R2_ACCOUNT_ID`** (엔드포인트 조합용). **서버 환경 변수만.**

## Read path

- **다운로드**: 인증된 소유자만; Route Handler가 R2에서 **`GetObject`** 후 바이너리 스트림 응답.
- Presigned URL은 초기 비사용(정책은 설계상 API 스트림 우선).

## Postgres / SEC-01

- 메타데이터(`bundles`, `bundle_snapshots`)는 **Supabase Postgres + RLS**로 타인 격리(**SEC-01**).
- R2 버킷은 계정·API 토큰으로 보호; 애플리케이션은 DB 소유권과 키 네임스페이스가 일치할 때만 객체를 다룬다.

## 환경 변수 (요약)

| 변수 | 용도 |
|------|------|
| `BUNDLE_STORAGE_BUCKET` | R2 버킷 이름 |
| `R2_ACCOUNT_ID` | (선택) `https://<id>.r2.cloudflarestorage.com` 조합 |
| `R2_ENDPOINT` | (선택) 전체 S3 API 엔드포인트 URL — 있으면 `R2_ACCOUNT_ID`보다 우선 |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API 토큰 (서버 전용) |

Supabase **`SUPABASE_SERVICE_ROLE_KEY`** 는 **Postgres(DB)** 및 Supabase Auth 연동용으로만 사용한다. R2에는 사용하지 않는다.
