import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeSnapshotIdFromZipPayload,
  pack,
  validateManifestObject,
} from "@claude-code-bundles/core";

async function writeMinimalBundleFixture(root: string): Promise<{
  manifestPath: string;
  zipPath: string;
}> {
  const payloadDir = path.join(root, "payload");
  await mkdir(path.join(payloadDir, "skills"), { recursive: true });
  await writeFile(path.join(payloadDir, "skills", "demo.md"), "demo", "utf8");

  const manifestPath = path.join(root, "bundle.json");
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        schema_version: "1.0.0",
        bundle_id: "test.api.upload",
        name: "API upload test",
        visibility: "private",
        version: "0.1.0",
        manifest_path: "bundle.json",
        payload_path: "payload",
      },
      null,
      2,
    ),
    "utf8",
  );

  const zipPath = path.join(root, "out.zip");
  await pack({ manifestPath, outArchivePath: zipPath });
  return { manifestPath, zipPath };
}

describe("upload pipeline (core helpers)", () => {
  it("stable normalized snapshot hash for same zip bytes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "api-upload-"));
    const { zipPath } = await writeMinimalBundleFixture(root);
    const buf = await readFile(zipPath);
    const a = computeSnapshotIdFromZipPayload(buf);
    const b = computeSnapshotIdFromZipPayload(Buffer.from(buf));
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(8);
  });

  it("validateManifestObject rejects invalid manifests", async () => {
    const bad = await validateManifestObject({ not: "a manifest" });
    expect(bad.valid).toBe(false);
    const ok = await validateManifestObject({
      schema_version: "1.0.0",
      bundle_id: "ok.bundle",
      name: "OK",
      version: "1.0.0",
      visibility: "private",
      manifest_path: "bundle.json",
      payload_path: "payload",
    });
    expect(ok.valid).toBe(true);
  });
});
