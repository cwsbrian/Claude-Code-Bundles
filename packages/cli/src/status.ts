import { listRegistry } from "@claude-code-bundles/core";
import { resolveApiContext, listRemoteBundles } from "./remote.js";

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

export async function runStatus(args: string[]): Promise<void> {
  // a. Resolve auth
  const ctx = await resolveApiContext(args);

  // b. Fetch remote bundles
  const data = await listRemoteBundles(ctx);
  const remoteBundles = (data as { bundles: RemoteBundle[] }).bundles ?? [];

  // c. Load local registry
  const localEntries = await listRegistry();

  // d. Build comparison maps
  const localMap = new Map(localEntries.map((e) => [e.bundleId, e]));
  const remoteMap = new Map(remoteBundles.map((rb) => [rb.public_bundle_id, rb]));

  // Union of all bundle IDs
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

  type Row = {
    name: string;
    localHash: string;
    remoteHash: string;
    status: string;
  };

  const rows: Row[] = [];

  for (const id of allIds) {
    const local = localMap.get(id);
    const remote = remoteMap.get(id);

    const localHash = local?.snapshotHash ?? local?.snapshotId ?? null;
    const remoteHash = remote?.bundle_snapshots[0]?.normalized_snapshot_hash ?? null;

    let status: string;
    if (local && remote) {
      if (localHash && remoteHash && localHash === remoteHash) {
        status = "up-to-date";
      } else {
        status = "newer on server";
      }
    } else if (local) {
      status = "local-only";
    } else {
      status = "not installed";
    }

    const displayName =
      remote?.display_name ?? remote?.public_bundle_id ?? id;

    rows.push({
      name: displayName,
      localHash: localHash ? localHash.slice(0, 8) : "--",
      remoteHash: remoteHash ? remoteHash.slice(0, 8) : "--",
      status,
    });
  }

  // e. Print tabular output
  const COL_NAME = 26;
  const COL_HASH = 12;
  const COL_STATUS = 20;

  const header =
    "Bundle".padEnd(COL_NAME) +
    "Local".padEnd(COL_HASH) +
    "Server".padEnd(COL_HASH) +
    "Status".padEnd(COL_STATUS);

  const divider = "\u2500".repeat(COL_NAME + COL_HASH + COL_HASH + COL_STATUS);

  process.stdout.write(`${header}\n${divider}\n`);

  for (const row of rows) {
    const line =
      row.name.slice(0, COL_NAME - 1).padEnd(COL_NAME) +
      row.localHash.padEnd(COL_HASH) +
      row.remoteHash.padEnd(COL_HASH) +
      row.status.padEnd(COL_STATUS);
    process.stdout.write(`${line}\n`);
  }
}
