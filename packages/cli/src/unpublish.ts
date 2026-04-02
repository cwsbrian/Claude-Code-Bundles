import { resolveApiContext, listRemoteBundles } from "./remote.js";

type RemoteBundle = {
  id: string;
  public_bundle_id: string;
  display_name: string | null;
  visibility: string;
};

export async function runUnpublish(args: string[]): Promise<void> {
  const bundleIdArg = args.find((a) => !a.startsWith("-"));
  if (!bundleIdArg) {
    throw new Error("Usage: ccb unpublish <bundleId>");
  }

  const ctx = await resolveApiContext(args);

  // Resolve public_bundle_id to UUID
  const data = await listRemoteBundles(ctx);
  const bundles = ((data as Record<string, unknown>).bundles ?? []) as RemoteBundle[];
  const match = bundles.find((b) => b.public_bundle_id === bundleIdArg);
  if (!match) {
    throw new Error(`Bundle "${bundleIdArg}" not found in your remote bundles.`);
  }

  if (match.visibility === "private") {
    process.stdout.write(`Bundle "${bundleIdArg}" is already private.\n`);
    return;
  }

  // Call PATCH /api/bundles/[uuid]/publish (toggles back to private)
  const url = `${ctx.apiUrl.replace(/\/$/, "")}/api/bundles/${match.id}/publish`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${ctx.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Unpublish failed: ${res.status} ${text.slice(0, 400)}`);
  }

  const result = (await res.json()) as { visibility: string };
  process.stdout.write(`Unpublished "${bundleIdArg}" (visibility: ${result.visibility})\n`);
}
