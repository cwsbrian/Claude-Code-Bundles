import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";

export type UnpackOptions = {
  archivePath: string;
  outDir: string;
};

export async function unpack(options: UnpackOptions): Promise<void> {
  const zip = new AdmZip(options.archivePath);
  const entries = zip
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .sort((a, b) => a.entryName.localeCompare(b.entryName));

  for (const entry of entries) {
    const outPath = path.join(options.outDir, entry.entryName);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, entry.getData());
  }
}
