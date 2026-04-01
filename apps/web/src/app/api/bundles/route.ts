import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError, requireUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const admin = createAdminClient();

    const { data: bundles, error } = await admin
      .from("bundles")
      .select(
        `
        id,
        public_bundle_id,
        visibility,
        display_name,
        updated_at,
        bundle_snapshots (
          id,
          normalized_snapshot_hash,
          created_at,
          storage_object_key
        )
      `,
      )
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false, referencedTable: "bundle_snapshots" });

    if (error) {
      console.error(error);
      return Response.json({ error: "db_error", message: error.message }, { status: 500 });
    }

    return Response.json({ bundles: bundles ?? [] });
  } catch (e) {
    if (e instanceof HttpError) {
      return Response.json({ error: "unauthorized", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
