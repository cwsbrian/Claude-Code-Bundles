import { describe, expect, it } from "vitest";

/**
 * Full backup → restore against a live API needs secrets. Set:
 *   CCB_E2E_INTEGRATION=1  CCB_API_URL=...  CCB_ACCESS_TOKEN=...
 * then run `bash scripts/e2e-backup-restore.sh`.
 * SEC-01 client error handling is covered in `api-list-download.test.ts`.
 */
describe("remote backup / restore (e2e gate)", () => {
  it("when CCB_E2E_INTEGRATION=1, API URL and token must be set", () => {
    if (process.env.CCB_E2E_INTEGRATION === "1") {
      expect(process.env.CCB_API_URL).toBeTruthy();
      expect(process.env.CCB_ACCESS_TOKEN).toBeTruthy();
    }
  });
});
