# Plan 02-03 Summary — `ccb remote` + backup E2E

**Completed:** 2026-03-31

## Outcome

- `ccb remote upload|list|download` — multipart 필드명 서버와 정합(`archive`, `manifest`); `CCB_API_URL` / `CCB_ACCESS_TOKEN` 문서화.
- `docs/spec/cli-surface.md`에 Phase 2 remote 절 추가.
- `scripts/e2e-backup-restore.sh`: 단일 기기 create→pack→upload→list→download→install(선택적 `SECOND_ACCESS_TOKEN` SEC-01 스모크).
- `tests/remote-backup-restore.e2e.test.ts`: 통합 게이트; `api-list-download.test.ts`에서 403/404 클라이언트 동작 검증.

## Verification

- `npx nx run cli:build` — exit 0
- 스테이징에서 전체 셸 E2E는 시크릿·실행 중인 Next가 있을 때 `CCB_API_URL`·`CCB_ACCESS_TOKEN`으로 수동 실행.
