import { deleteBundleZipObjects } from "@/lib/r2/bundle-object-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError, requireUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ bundleId: string }> },
) {
  try {
    const user = await requireUser(request);
    const { bundleId } = await context.params;
    const admin = createAdminClient();

    // 1. Verify ownership
    const { data: bundle, error: bErr } = await admin
      .from("bundles")
      .select("id, owner_user_id")
      .eq("id", bundleId)
      .maybeSingle();

    if (bErr || !bundle || bundle.owner_user_id !== user.id) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    // 2. Collect all snapshot storage keys for R2 cleanup
    const { data: snapshots } = await admin
      .from("bundle_snapshots")
      .select("storage_object_key")
      .eq("bundle_id", bundleId);

    const storageKeys = (snapshots ?? []).map((s) => s.storage_object_key);

    // 3. Delete DB rows FIRST -- CASCADE handles snapshots, lineage, publish_records (D-25)
    //    D-27: ON DELETE SET NULL on lineage FKs -- existing imports are unaffected
    const { error: delErr } = await admin
      .from("bundles")
      .delete()
      .eq("id", bundleId);

    if (delErr) {
      return Response.json({ error: "db_error", message: delErr.message }, { status: 500 });
    }

    // 4. Then clean up R2 objects (orphaned objects are less harmful than orphaned DB rows)
    if (storageKeys.length > 0) {
      try {
        await deleteBundleZipObjects(storageKeys);
      } catch (e) {
        // Log but don't fail -- DB is already cleaned up
        console.error("R2 cleanup error (non-fatal):", e);
      }
    }

    return Response.json({ deleted: true });
  } catch (e) {
    if (e instanceof HttpError) {
      return Response.json({ error: "unauthorized", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
