# Plan 02-02 Summary — Next.js bundle API

**Completed:** 2026-03-31

## Outcome

- 서버 전용 Supabase: `admin.ts`(service role), `auth.ts`(`Authorization: Bearer` + `getUser`).
- `POST /api/bundles/upload`: multipart `archive` + `manifest`(또는 zip 내 manifest), `packages/core`로 검증·서버 시크릿 스캔, **R2 `PutObject`**, 스냅샷 해시 중복 시 idempotent 응답.
- `GET /api/bundles`: 호출자 소유 번들 + nested snapshots.
- `GET /api/bundles/[bundleId]/snapshots`: 소유 번들의 스냅샷 목록.
- `GET .../snapshots/[snapshotId]/download`: 소유 검증 후 zip 스트리밍.

## Verification

- `npx nx run web:build` — exit 0
- 단위: `tests/api-upload.test.ts`(코어 해시·검증), `tests/api-list-download.test.ts`(remote 클라이언트 오류 경로)

## Notes

- 프로덕션은 **R2**(`R2_*`, `BUNDLE_STORAGE_BUCKET`)·Supabase(DB/Auth) 자격 증명 배포 필요.
