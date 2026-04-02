import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError, requireUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ bundleId: string }> },
) {
  try {
    const user = await requireUser(request);
    const { bundleId } = await context.params;
    const body = await request.json();
    const admin = createAdminClient();

    // 1. Validate reason
    const validReasons = ["malicious", "spam", "inappropriate", "other"];
    const reason = body?.reason as string | undefined;
    if (!reason || !validReasons.includes(reason)) {
      return Response.json(
        {
          error: "invalid_reason",
          message: "Reason must be one of: malicious, spam, inappropriate, other",
        },
        { status: 400 },
      );
    }
    const description = typeof body?.description === "string" ? body.description.slice(0, 1000) : null;

    // 2. Verify bundle exists and is public
    const { data: bundle } = await admin
      .from("bundles")
      .select("id")
      .eq("id", bundleId)
      .eq("visibility", "public")
      .maybeSingle();

    if (!bundle) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    // 3. Insert report (unique constraint catches duplicates)
    const { error: insErr } = await admin.from("bundle_reports").insert({
      bundle_id: bundleId,
      reporter_user_id: user.id,
      reason,
      description,
    });

    if (insErr) {
      // Check for unique violation (duplicate report) — Postgres code 23505
      if (insErr.code === "23505") {
        return Response.json(
          { error: "duplicate_report", message: "You have already reported this bundle" },
          { status: 409 },
        );
      }
      return Response.json({ error: "db_error", message: insErr.message }, { status: 500 });
    }

    return Response.json({ reported: true }, { status: 201 });
  } catch (e) {
    if (e instanceof HttpError) {
      return Response.json({ error: "unauthorized", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
