import { resolveApiContext, listRemoteBundles } from "./remote.js";

type RemoteBundle = {
  id: string;
  public_bundle_id: string;
  display_name: string | null;
  visibility: string;
};

export async function runPublish(args: string[]): Promise<void> {
  const bundleIdArg = args.find((a) => !a.startsWith("-"));
  if (!bundleIdArg) {
    throw new Error("Usage: ccb publish <bundleId>");
  }

  const ctx = await resolveApiContext(args);

  // Resolve public_bundle_id to UUID via remote list
  const data = await listRemoteBundles(ctx);
  const bundles = ((data as Record<string, unknown>).bundles ?? []) as RemoteBundle[];
  const match = bundles.find((b) => b.public_bundle_id === bundleIdArg);
  if (!match) {
    throw new Error(`Bundle "${bundleIdArg}" not found in your remote bundles.`);
  }

  if (match.visibility === "public") {
    process.stdout.write(`Bundle "${bundleIdArg}" is already public.\n`);
    return;
  }

  // Call PATCH /api/bundles/[uuid]/publish
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
    throw new Error(`Publish failed: ${res.status} ${text.slice(0, 400)}`);
  }

  const result = (await res.json()) as { visibility: string };
  process.stdout.write(`Published "${bundleIdArg}" (visibility: ${result.visibility})\n`);
}
