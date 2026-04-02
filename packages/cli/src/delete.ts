import { confirm } from "@inquirer/prompts";
import { resolveApiContext, listRemoteBundles } from "./remote.js";

type RemoteBundle = {
  id: string;
  public_bundle_id: string;
  display_name: string | null;
};

export async function runDelete(args: string[]): Promise<void> {
  const bundleIdArg = args.find((a) => !a.startsWith("-"));
  if (!bundleIdArg) {
    throw new Error("Usage: ccb delete <bundleId>");
  }

  const ctx = await resolveApiContext(args);
  const apiOrigin = ctx.apiUrl.replace(/\/$/, "");

  // Resolve public_bundle_id to UUID
  const data = await listRemoteBundles(ctx);
  const bundles = ((data as Record<string, unknown>).bundles ?? []) as RemoteBundle[];
  const match = bundles.find((b) => b.public_bundle_id === bundleIdArg);
  if (!match) {
    throw new Error(`Bundle "${bundleIdArg}" not found in your remote bundles.`);
  }

  // Confirm hard delete (D-25, D-26)
  const confirmed = await confirm({
    message: `Permanently delete "${match.display_name ?? bundleIdArg}"? This cannot be undone. Local installed files are not affected.`,
    default: false,
  });

  if (!confirmed) {
    process.stdout.write("Delete cancelled.\n");
    return;
  }

  // Call DELETE /api/bundles/[uuid]
  const url = `${apiOrigin}/api/bundles/${match.id}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${ctx.token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed: ${res.status} ${text.slice(0, 400)}`);
  }

  process.stdout.write(`Deleted "${bundleIdArg}" from server.\n`);
}
