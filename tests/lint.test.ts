import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pack } from "../src/lib/pack.js";
import { lintArchive } from "../src/lib/lint.js";

async function buildArchiveFixture(visibility: "public" | "private"): Promise<{
  archivePath: string;
  manifestPath: string;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), `ccb-lint-${visibility}-`));
  const payloadDir = path.join(root, "payload");
  const manifestPath = path.join(root, "bundle.json");
  const archivePath = path.join(root, "bundle.zip");

  await mkdir(payloadDir, { recursive: true });
  await writeFile(
    path.join(payloadDir, "secrets.txt"),
    "fake token sk-ABCDEF1234567890ABCDEF1234",
    "utf8",
  );
  await writeFile(path.join(payloadDir, ".env"), "KEY=value", "utf8");
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        schema_version: "1.0.0",
        bundle_id: `lint-${visibility}`,
        name: `Lint ${visibility}`,
        visibility,
        version: "0.1.0",
        manifest_path: "bundle.json",
        payload_path: "payload",
      },
      null,
      2,
    ),
    "utf8",
  );

  await pack({ manifestPath, outArchivePath: archivePath });
  return { archivePath, manifestPath };
}

describe("lintArchive", () => {
  it("blocks public bundle when secret patterns are detected", async () => {
    const fixture = await buildArchiveFixture("public");
    const result = await lintArchive(fixture);

    expect(result.visibility).toBe("public");
    expect(result.blocking).toBe(true);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it("warns private bundle and does not block on same patterns", async () => {
    const fixture = await buildArchiveFixture("private");
    const result = await lintArchive(fixture);

    expect(result.visibility).toBe("private");
    expect(result.blocking).toBe(false);
    expect(result.findings.length).toBeGreaterThan(0);
  });
});
