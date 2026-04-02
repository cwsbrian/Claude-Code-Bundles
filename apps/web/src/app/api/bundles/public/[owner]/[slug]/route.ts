import { extractManifestJsonFromZip } from "@claude-code-bundles/core";
import { getBundleZipObject } from "@/lib/r2/bundle-object-storage";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ owner: string; slug: string }> },
) {
  const { owner, slug } = await context.params;
  const admin = createAdminClient();

  // 1. Find owner by github_handle in profiles (D-13)
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .eq("github_handle", owner)
    .maybeSingle();

  if (pErr || !profile) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  // 2. Find public bundle by owner + slug (D-12)
  const { data: bundle, error: bErr } = await admin
    .from("bundles")
    .select(`
      id, public_bundle_id, display_name, description, created_at,
      bundle_snapshots (id, normalized_snapshot_hash, storage_object_key, created_at)
    `)
    .eq("owner_user_id", profile.user_id)
    .eq("public_bundle_id", slug)
    .eq("visibility", "public")
    .order("created_at", { ascending: false, referencedTable: "bundle_snapshots" })
    .maybeSingle();

  if (bErr || !bundle) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  // 3. Get latest snapshot (D-02: latest only)
  const snapshots = (bundle as any).bundle_snapshots as Array<{
    id: string;
    normalized_snapshot_hash: string;
    storage_object_key: string;
    created_at: string;
  }>;
  const latestSnapshot = snapshots?.[0];

  // 4. Extract bundle contents summary from zip manifest (D-20)
  let contentsSummary: Record<string, unknown> | null = null;
  if (latestSnapshot) {
    try {
      const zipBuf = await getBundleZipObject(latestSnapshot.storage_object_key);
      const manifestRaw = extractManifestJsonFromZip(zipBuf);
      const manifest = JSON.parse(manifestRaw);
      // Extract component listings from manifest
      contentsSummary = {
        skills: manifest.skills ? Object.keys(manifest.skills) : [],
        hooks: manifest.hooks ? Object.keys(manifest.hooks) : [],
        commands: manifest.commands ? Object.keys(manifest.commands) : [],
      };
    } catch {
      // If zip read or manifest parse fails, just omit summary
      contentsSummary = null;
    }
  }

  // 5. Check lineage for "Originated by" (D-16, D-17)
  const { data: lineage } = await admin
    .from("bundle_lineage")
    .select("root_author_id, root_bundle_id, parent_bundle_id")
    .eq("bundle_id", bundle.id)
    .maybeSingle();

  let originatedBy: { display_name: string | null; avatar_url: string | null } | null = null;
  if (lineage?.root_author_id) {
    const { data: rootProfile } = await admin
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", lineage.root_author_id)
      .maybeSingle();
    if (rootProfile) {
      originatedBy = rootProfile;
    }
  }

  // 6. Build response (D-18)
  return Response.json({
    public_bundle_id: bundle.public_bundle_id,
    display_name: bundle.display_name,
    description: bundle.description,
    created_at: bundle.created_at,
    published_by: {
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    },
    originated_by: originatedBy,
    latest_snapshot: latestSnapshot
      ? {
          id: latestSnapshot.id,
          normalized_snapshot_hash: latestSnapshot.normalized_snapshot_hash,
          created_at: latestSnapshot.created_at,
        }
      : null,
    contents_summary: contentsSummary,
  });
}
