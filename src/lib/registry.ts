import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type RegistryEntry = {
  bundleId: string;
  snapshotId: string;
  archivePath: string;
  manifestSourcePath: string;
  installedPaths: string[];
  installedAt: string;
};

type RegistryFile = {
  entries: RegistryEntry[];
};

// D-15/D-16 local registry path for Phase 1.
const REGISTRY_PATH = path.join(
  os.homedir(),
  ".claude",
  "bundle-platform",
  "registry.json",
);

async function readRegistryFile(): Promise<RegistryFile> {
  try {
    const raw = await readFile(REGISTRY_PATH, "utf8");
    return JSON.parse(raw) as RegistryFile;
  } catch {
    return { entries: [] };
  }
}

async function writeRegistryFile(registry: RegistryFile): Promise<void> {
  await mkdir(path.dirname(REGISTRY_PATH), { recursive: true });
  await writeFile(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export async function updateRegistry(
  entry: Omit<RegistryEntry, "installedAt">,
): Promise<void> {
  const registry = await readRegistryFile();
  const next: RegistryEntry = { ...entry, installedAt: new Date().toISOString() };
  registry.entries = registry.entries.filter((e) => e.bundleId !== next.bundleId);
  registry.entries.push(next);
  await writeRegistryFile(registry);
}

export async function listRegistry(): Promise<RegistryEntry[]> {
  const registry = await readRegistryFile();
  return [...registry.entries].sort((a, b) => a.bundleId.localeCompare(b.bundleId));
}

export function getRegistryPath(): string {
  return REGISTRY_PATH;
}
