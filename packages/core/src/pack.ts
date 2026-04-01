import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";

export type PackOptions = {
  manifestPath: string;
  outArchivePath: string;
};

type ManifestForPack = {
  payload_path: string;
};

async function collectFiles(rootDir: string, currentDir: string): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const all: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      all.push(...(await collectFiles(rootDir, absolutePath)));
      continue;
    }
    if (entry.isFile()) {
      all.push(path.relative(rootDir, absolutePath));
    }
  }

  return all;
}

export async function pack(options: PackOptions): Promise<void> {
  const manifestRaw = await readFile(options.manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw) as ManifestForPack;
  const manifestDir = path.dirname(options.manifestPath);
  const payloadRoot = path.resolve(manifestDir, manifest.payload_path);
  const outArchiveAbs = path.resolve(options.outArchivePath);
  const manifestAbs = path.resolve(options.manifestPath);

  const payloadStats = await stat(payloadRoot);
  if (!payloadStats.isDirectory()) {
    throw new Error(`payload_path must point to a directory: ${payloadRoot}`);
  }

  const zip = new AdmZip();
  const relativePaths = await collectFiles(payloadRoot, payloadRoot);

  zip.addFile("bundle.json", Buffer.from(manifestRaw, "utf8"));

  for (const relativePath of relativePaths.sort()) {
    const absolutePath = path.resolve(payloadRoot, relativePath);
    if (absolutePath === manifestAbs || absolutePath === outArchiveAbs) {
      continue;
    }
    const content = await readFile(absolutePath);
    zip.addFile(relativePath.replaceAll(path.sep, "/"), content);
  }

  await mkdir(path.dirname(outArchiveAbs), { recursive: true });
  await writeFile(outArchiveAbs, zip.toBuffer());
}
