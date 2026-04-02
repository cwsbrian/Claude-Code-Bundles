import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { checkbox, confirm } from "@inquirer/prompts";
import { listRegistry, updateRegistry, unpack, applyBundle, loadManifest } from "@claude-code-bundles/core";
import { resolveApiContext, listRemoteBundles, downloadSnapshotToFile } from "./remote.js";

type RemoteBundle = {
  id: string;
  public_bundle_id: string;
  display_name: string | null;
  bundle_snapshots: Array<{
    id: string;
    normalized_snapshot_hash: string;
    storage_object_key: string;
  }>;
};

type BundleChoice = {
  bundleId: string;
  snapshotId: string;
  publicBundleId: string;
  snapshotHash: string;
  status: string;
};

export async function runPull(args: string[]): Promise<void> {
  // 1. Resolve auth (D-11)
  const ctx = await resolveApiContext(args);

  const nonInteractive = !process.stdin.isTTY || args.includes("--yes") || args.includes("-y");

  // 2. Fetch remote bundles
  const data = await listRemoteBundles(ctx);
  const remoteBundles = (data as { bundles: RemoteBundle[] }).bundles ?? [];

  // 3. Load local registry
  const localEntries = await listRegistry();
  const localMap = new Map(localEntries.map((e) => [e.bundleId, e]));

  // 4. Build choices for interactive list (D-04/D-05)
  type Choice = {
    name: string;
    value: BundleChoice;
    disabled: string | false;
  };

  const choices: Choice[] = [];

  for (const rb of remoteBundles) {
    const latestSnap = rb.bundle_snapshots[0];
    if (!latestSnap) continue;

    const local = localMap.get(rb.public_bundle_id);
    let status: string;

    if (!local) {
      status = "not installed";
    } else if (local.snapshotHash === latestSnap.normalized_snapshot_hash) {
      // D-07: same hash — auto skip
      status = "up-to-date";
    } else {
      status = "newer on server";
    }

    choices.push({
      name: `${rb.display_name ?? rb.public_bundle_id} (${status})`,
      value: {
        bundleId: rb.id,
        snapshotId: latestSnap.id,
        publicBundleId: rb.public_bundle_id,
        snapshotHash: latestSnap.normalized_snapshot_hash,
        status,
      },
      disabled: status === "up-to-date" ? "up-to-date" : false,
    });
  }

  // 5. If no bundles available or all up-to-date
  const actionable = choices.filter(
    (c) => "value" in c && c.disabled === false,
  );
  if (actionable.length === 0) {
    process.stdout.write("All bundles are up-to-date.\n");
    return;
  }

  // 6. Present interactive checkbox (D-04)
  let selected: BundleChoice[];
  if (nonInteractive) {
    selected = actionable.map((c) => c.value);
  } else {
    selected = await checkbox<BundleChoice>({
      message: "Select bundles to pull:",
      choices,
    });
  }

  if (selected.length === 0) {
    process.stdout.write("No bundles selected.\n");
    return;
  }

  // 7. Download + install loop with failure handling (D-06/D-08)
  const failures: Array<{ name: string; error: string }> = [];

  for (const sel of selected) {
    try {
      // D-06: if status is "newer on server", prompt skip/overwrite
      if (sel.status === "newer on server") {
        let overwrite = true;
        if (!nonInteractive) {
          overwrite = await confirm({
            message: `${sel.publicBundleId}: Local version differs. Overwrite?`,
            default: true,
          });
        }
        if (!overwrite) {
          process.stdout.write(`Skipped ${sel.publicBundleId}\n`);
          continue;
        }
      }

      // Download to temp file
      const tempDir = await mkdtemp(path.join(os.tmpdir(), "ccb-pull-"));
      const zipPath = path.join(tempDir, "bundle.zip");
      await downloadSnapshotToFile({
        ...ctx,
        bundleId: sel.bundleId,
        snapshotId: sel.snapshotId,
        outPath: zipPath,
      });

      // Unpack
      const unpackDir = path.join(tempDir, "unpacked");
      await unpack({ archivePath: zipPath, outDir: unpackDir });

      // Apply
      const manifestPath = path.join(unpackDir, "bundle.json");
      const manifest = await loadManifest(manifestPath);
      const result = await applyBundle({ manifestPath, manifest, force: true });

      // Update registry with snapshotHash (D-05/D-07 future comparison)
      await updateRegistry({
        bundleId: manifest.bundle_id,
        snapshotId: `${manifest.bundle_id}@${manifest.version}`,
        snapshotHash: sel.snapshotHash,
        archivePath: zipPath,
        manifestSourcePath: manifestPath,
        installedPaths: result.installedPaths,
      });

      process.stdout.write(`Pulled ${sel.publicBundleId} -> ${result.claudeRoot}\n`);
    } catch (err) {
      // D-08: skip failed, continue rest
      const msg = err instanceof Error ? err.message : String(err);
      failures.push({ name: sel.publicBundleId, error: msg });
      process.stderr.write(`Failed: ${sel.publicBundleId}: ${msg}\n`);
    }
  }

  // 8. Summary (D-08)
  if (failures.length > 0) {
    process.stderr.write(`\n${failures.length} bundle(s) failed:\n`);
    for (const f of failures) {
      process.stderr.write(`  - ${f.name}: ${f.error}\n`);
    }
    process.exitCode = 1;
  }
}
