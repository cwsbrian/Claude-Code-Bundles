import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pack } from "../src/lib/pack.js";
import { unpack } from "../src/lib/unpack.js";
import { computeSnapshotId } from "../src/lib/snapshot-hash.js";

describe("pack and unpack", () => {
  it("snapshot hash is deterministic for fixed inputs", () => {
    const snapshot = computeSnapshotId([
      { relativePath: "a.txt", content: Buffer.from("hello", "utf8") },
      { relativePath: "nested/b.txt", content: Buffer.from("world", "utf8") },
    ]);

    expect(snapshot).toBe(
      "8b1619c01f5fdd8a650671a9ab455e0f11f74ef3c061d8fbae442b32c3b847b1",
    );
  });

  it("pack then unpack preserves normalized snapshot", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ccb-red-"));
    const sourceDir = path.join(root, "src");
    const unpackDir = path.join(root, "out");
    const archivePath = path.join(root, "bundle.zip");
    const manifestPath = path.join(root, "manifest.json");

    await mkdir(path.join(sourceDir, "nested"), { recursive: true });
    await writeFile(path.join(sourceDir, "a.txt"), "hello\n", "utf8");
    await writeFile(path.join(sourceDir, "nested", "b.txt"), "world\n", "utf8");

    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          schema_version: "1.0.0",
          bundle_id: "bundle-red",
          name: "RED",
          visibility: "private",
          version: "0.0.1",
          manifest_path: "manifest.json",
          payload_path: "src",
        },
        null,
        2,
      ),
      "utf8",
    );

    await pack({ manifestPath, outArchivePath: archivePath });
    await unpack({ archivePath, outDir: unpackDir });

    const unpackedA = await readFile(path.join(unpackDir, "a.txt"));
    const unpackedB = await readFile(path.join(unpackDir, "nested", "b.txt"));
    const unpackedHash = computeSnapshotId([
      { relativePath: "a.txt", content: unpackedA },
      { relativePath: "nested/b.txt", content: unpackedB },
    ]);

    expect(unpackedHash).toBe(
      "81a1ef9a3a503319050696a3e9b274b11525e14ce22960b691d784f4f4be23c3",
    );
  });
});
