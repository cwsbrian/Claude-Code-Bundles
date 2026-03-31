import { getBundleZipObject } from "@/lib/r2/bundle-object-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError, requireUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ bundleId: string; snapshotId: string }> },
) {
  try {
    const user = await requireUser(request);
    const { bundleId, snapshotId } = await context.params;

    const admin = createAdminClient();

    const { data: bundle, error: bErr } = await admin
      .from("bundles")
      .select("id, owner_user_id")
      .eq("id", bundleId)
      .maybeSingle();

    if (bErr || !bundle || bundle.owner_user_id !== user.id) {
      return new Response("Not found", { status: 404 });
    }

    const { data: snap, error: sErr } = await admin
      .from("bundle_snapshots")
      .select("id, storage_object_key, bundle_id")
      .eq("id", snapshotId)
      .eq("bundle_id", bundleId)
      .maybeSingle();

    if (sErr || !snap) {
      return new Response("Not found", { status: 404 });
    }

    let buf: Buffer;
    try {
      buf = await getBundleZipObject(snap.storage_object_key);
    } catch (e) {
      console.error(e);
      return new Response("Storage error", { status: 500 });
    }

    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="bundle-${snapshotId}.zip"`,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return Response.json({ error: "unauthorized", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
