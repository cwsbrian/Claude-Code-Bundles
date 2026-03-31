import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError, requireUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ bundleId: string }> },
) {
  try {
    const user = await requireUser(request);
    const { bundleId } = await context.params;
    const admin = createAdminClient();

    const { data: bundle, error: bErr } = await admin
      .from("bundles")
      .select("id")
      .eq("id", bundleId)
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (bErr || !bundle) {
      return new Response("Not found", { status: 404 });
    }

    const { data: snapshots, error: sErr } = await admin
      .from("bundle_snapshots")
      .select("id, normalized_snapshot_hash, created_at, storage_object_key, schema_version")
      .eq("bundle_id", bundleId)
      .order("created_at", { ascending: false });

    if (sErr) {
      console.error(sErr);
      return Response.json({ error: "db_error", message: sErr.message }, { status: 500 });
    }

    return Response.json({ snapshots: snapshots ?? [] });
  } catch (e) {
    if (e instanceof HttpError) {
      return Response.json({ error: "unauthorized", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
