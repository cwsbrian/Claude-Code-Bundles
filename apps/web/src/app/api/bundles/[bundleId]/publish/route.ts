import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError, requireUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function PATCH(
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
      .select("id, owner_user_id, visibility, display_name")
      .eq("id", bundleId)
      .maybeSingle();

    if (bErr || !bundle || bundle.owner_user_id !== user.id) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    // 2. Pre-check: at least one snapshot required (D-05)
    const { count } = await admin
      .from("bundle_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("bundle_id", bundleId);

    if (!count || count === 0) {
      return Response.json(
        {
          error: "no_snapshots",
          message:
            "Cannot publish: bundle has no snapshots. Upload at least one snapshot first.",
        },
        { status: 400 },
      );
    }

    // 3. Toggle visibility (D-24: unpublish = set back to private)
    const newVisibility = bundle.visibility === "public" ? "private" : "public";

    await admin
      .from("bundles")
      .update({ visibility: newVisibility, updated_at: new Date().toISOString() })
      .eq("id", bundleId);

    // 4. If publishing, record in bundle_publish_records (D-03)
    if (newVisibility === "public") {
      const { data: latestSnap } = await admin
        .from("bundle_snapshots")
        .select("id")
        .eq("bundle_id", bundleId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestSnap) {
        await admin.from("bundle_publish_records").insert({
          bundle_id: bundleId,
          published_snapshot_id: latestSnap.id,
          display_name: bundle.display_name,
        });
      }
    }

    return Response.json({ visibility: newVisibility });
  } catch (e) {
    if (e instanceof HttpError) {
      return Response.json({ error: "unauthorized", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
