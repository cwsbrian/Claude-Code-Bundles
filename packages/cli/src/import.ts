import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { confirm } from "@inquirer/prompts";
import {
  unpack,
  applyBundle,
  loadManifest,
  updateRegistry,
} from "@claude-code-bundles/core";
import { resolveApiContext, downloadSnapshotToFile } from "./remote.js";
import { installCommands } from "./setup.js";

export async function runImport(args: string[]): Promise<void> {
  const ref = args.find((a) => !a.startsWith("-"));
  if (!ref || !ref.includes("/")) {
    throw new Error(
      "Usage: ccb import <owner/bundleId>  (e.g., ccb import brian/my-cool-bundle)",
    );
  }

  const [owner, slug] = ref.split("/", 2) as [string, string];
  const ctx = await resolveApiContext(args);
  const apiOrigin = ctx.apiUrl.replace(/\/$/, "");

  // 1. Preview: fetch public bundle metadata (anonymous)
  const previewUrl = `${apiOrigin}/api/bundles/public/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}`;
  const previewRes = await fetch(previewUrl);
  if (!previewRes.ok) {
    if (previewRes.status === 404) {
      throw new Error(`Public bundle "${owner}/${slug}" not found.`);
    }
    const text = await previewRes.text();
    throw new Error(`Preview failed: ${previewRes.status} ${text.slice(0, 400)}`);
  }

  const preview = (await previewRes.json()) as {
    display_name: string | null;
    description: string | null;
    published_by: { display_name: string | null; avatar_url: string | null };
    originated_by: { display_name: string | null; avatar_url: string | null } | null;
    latest_snapshot: { id: string; normalized_snapshot_hash: string } | null;
    contents_summary: { skills: string[]; hooks: string[]; commands: string[] } | null;
  };

  // 2. Display attribution (PUB-03) and contents summary (D-20)
  process.stdout.write(`\nBundle: ${preview.display_name ?? slug}\n`);
  if (preview.description) {
    process.stdout.write(`Description: ${preview.description}\n`);
  }
  process.stdout.write(`Published by: ${preview.published_by.display_name ?? owner}\n`);
  if (preview.originated_by) {
    process.stdout.write(`Originated by: ${preview.originated_by.display_name ?? "unknown"}\n`);
  }
  if (preview.contents_summary) {
    const cs = preview.contents_summary;
    const parts: string[] = [];
    if (cs.skills.length > 0) parts.push(`skills: ${cs.skills.join(", ")}`);
    if (cs.hooks.length > 0) parts.push(`hooks: ${cs.hooks.join(", ")}`);
    if (cs.commands.length > 0) parts.push(`commands: ${cs.commands.join(", ")}`);
    if (parts.length > 0) {
      process.stdout.write(`Contents: ${parts.join(" | ")}\n`);
    }
  }

  if (!preview.latest_snapshot) {
    throw new Error("Bundle has no snapshots to import.");
  }
  process.stdout.write(`Snapshot: ${preview.latest_snapshot.normalized_snapshot_hash}\n\n`);

  // 3. Call import API (D-07)
  const importUrl = `${apiOrigin}/api/bundles/import`;
  let importRes = await fetch(importUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ctx.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sourceBundleId: `${owner}/${slug}` }),
  });

  // 4. Handle duplicate (D-11)
  if (importRes.status === 409) {
    const dupBody = (await importRes.json()) as {
      error: string;
      message: string;
      existingBundleId: string;
    };
    const overwrite = await confirm({
      message: `${dupBody.message} Overwrite existing bundle?`,
      default: false,
    });
    if (!overwrite) {
      process.stdout.write("Import skipped.\n");
      return;
    }
    // Retry with overwrite
    importRes = await fetch(importUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sourceBundleId: `${owner}/${slug}`, overwrite: true }),
    });
  }

  if (!importRes.ok) {
    const text = await importRes.text();
    throw new Error(`Import failed: ${importRes.status} ${text.slice(0, 400)}`);
  }

  const importResult = (await importRes.json()) as {
    bundleId: string;
    publicBundleId: string;
    snapshotId: string;
    snapshotHash: string;
  };

  // 5. Download the imported snapshot zip
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ccb-import-"));
  const zipPath = path.join(tempDir, "bundle.zip");
  await downloadSnapshotToFile({
    ...ctx,
    bundleId: importResult.bundleId,
    snapshotId: importResult.snapshotId,
    outPath: zipPath,
  });

  // 6. Unpack + apply (reuse pull.ts pattern)
  const unpackDir = path.join(tempDir, "unpacked");
  await unpack({ archivePath: zipPath, outDir: unpackDir });
  const manifestPath = path.join(unpackDir, "bundle.json");
  const manifest = await loadManifest(manifestPath);
  const applyResult = await applyBundle({ manifestPath, manifest, force: true });

  // 7. Update local registry
  await updateRegistry({
    bundleId: manifest.bundle_id,
    snapshotId: `${manifest.bundle_id}@${manifest.version}`,
    snapshotHash: importResult.snapshotHash,
    archivePath: zipPath,
    manifestSourcePath: manifestPath,
    installedPaths: applyResult.installedPaths,
  });

  process.stdout.write(`Imported ${owner}/${slug} -> ${applyResult.claudeRoot}\n`);

  // D-04: Auto-install command files as side-effect of import
  try {
    const installed = await installCommands(false);
    if (installed.length > 0) {
      process.stdout.write(`\nAlso installed ${installed.length} Claude Code command file(s).\n`);
      process.stdout.write("Use /bundle:import, /bundle:pull, /bundle:status, /bundle:browse in Claude Code.\n");
    }
  } catch {
    // Non-fatal: command file installation failure should not break import
  }
}
