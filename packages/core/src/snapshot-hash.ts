import { createHash } from "node:crypto";

export type SnapshotFile = {
  relativePath: string;
  content: Buffer;
};

function normalizePathForSnapshot(inputPath: string): string {
  return inputPath.replaceAll("\\", "/").normalize("NFC");
}

/**
 * D-05/D-06 normalized snapshot hash:
 * - Includes only normalized relative path + file content.
 * - Excludes mtime, zip timestamps, compression level, and OS metadata.
 */
export function computeSnapshotId(files: Iterable<SnapshotFile>): string {
  const sorted = Array.from(files).map((entry) => ({
    relativePath: normalizePathForSnapshot(entry.relativePath),
    content: entry.content,
  }));
  sorted.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));

  const hash = createHash("sha256");
  for (const entry of sorted) {
    hash.update(entry.relativePath, "utf8");
    hash.update("\0", "utf8");
    hash.update(entry.content);
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}
