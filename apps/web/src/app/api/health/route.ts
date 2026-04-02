import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const admin = createAdminClient();
    // Simple DB connectivity check — count a lightweight table
    const { error } = await admin.from("profiles").select("user_id", { count: "exact", head: true });

    if (error) {
      return Response.json(
        { status: "degraded", timestamp, db: "error", detail: error.message },
        { status: 503 },
      );
    }

    return Response.json({ status: "ok", timestamp, db: "connected" });
  } catch (e) {
    return Response.json(
      { status: "error", timestamp, detail: e instanceof Error ? e.message : "unknown" },
      { status: 503 },
    );
  }
}
