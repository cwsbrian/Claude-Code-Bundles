import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { BundleManifest } from "./manifest-validate.js";

export type ApplyOptions = {
  manifestPath: string;
  manifest: BundleManifest;
  force: boolean;
};

export type ApplyResult = {
  bundleId: string;
  claudeRoot: string;
  installedPaths: string[];
};

const componentTargets: Record<string, string> = {
  skills: "skills",
  hooks: "hooks",
  commands: "commands",
  templates: "templates",
};

async function ensureAbsentUnlessForced(targetPath: string, force: boolean): Promise<void> {
  try {
    await stat(targetPath);
    if (!force) {
      throw new Error(
        `Target exists: ${targetPath}. Re-run with --force to overwrite.`,
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  }
}

export async function applyBundle(options: ApplyOptions): Promise<ApplyResult> {
  const claudeRoot = path.join(os.homedir(), ".claude");
  const manifestDir = path.dirname(path.resolve(options.manifestPath));
  const payloadRoot = path.resolve(manifestDir, options.manifest.payload_path);
  const installedPaths: string[] = [];

  for (const [sourceName, targetName] of Object.entries(componentTargets)) {
    const sourcePath = path.join(payloadRoot, sourceName);
    try {
      const sourceStats = await stat(sourcePath);
      if (!sourceStats.isDirectory()) {
        continue;
      }
      const targetPath = path.join(claudeRoot, targetName);
      await ensureAbsentUnlessForced(targetPath, options.force);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await cp(sourcePath, targetPath, { recursive: true, force: options.force });
      installedPaths.push(targetPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  const bundleManifestTarget = path.join(
    claudeRoot,
    "bundles",
    options.manifest.bundle_id,
    "bundle.json",
  );
  await ensureAbsentUnlessForced(bundleManifestTarget, options.force);
  await mkdir(path.dirname(bundleManifestTarget), { recursive: true });
  const manifestRaw = await readFile(options.manifestPath, "utf8");
  await writeFile(bundleManifestTarget, manifestRaw, "utf8");
  installedPaths.push(bundleManifestTarget);

  return {
    bundleId: options.manifest.bundle_id,
    claudeRoot,
    installedPaths: installedPaths.sort(),
  };
}
