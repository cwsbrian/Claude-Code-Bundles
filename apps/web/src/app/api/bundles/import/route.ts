import { randomUUID } from "node:crypto";
import { copyBundleZipObject } from "@/lib/r2/bundle-object-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError, requireUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const sourceBundleId = body?.sourceBundleId as string | undefined;

    if (!sourceBundleId || !sourceBundleId.includes("/")) {
      return Response.json(
        { error: "invalid_request", message: "sourceBundleId must be in owner/slug format" },
        { status: 400 },
      );
    }

    const [ownerHandle, slug] = sourceBundleId.split("/", 2);
    const overwrite = body?.overwrite === true;
    const admin = createAdminClient();

    // 1. Look up source owner
    const { data: sourceProfile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("github_handle", ownerHandle)
      .maybeSingle();

    if (!sourceProfile) {
      return Response.json({ error: "not_found", message: "Owner not found" }, { status: 404 });
    }

    // 2. Find public bundle + verify public visibility
    const { data: sourceBundle } = await admin
      .from("bundles")
      .select("id, owner_user_id, public_bundle_id, display_name, description")
      .eq("owner_user_id", sourceProfile.user_id)
      .eq("public_bundle_id", slug)
      .eq("visibility", "public")
      .maybeSingle();

    if (!sourceBundle) {
      return Response.json({ error: "not_found", message: "Public bundle not found" }, { status: 404 });
    }

    // 3. Get latest snapshot
    const { data: sourceSnapshot } = await admin
      .from("bundle_snapshots")
      .select("id, normalized_snapshot_hash, storage_object_key, schema_version")
      .eq("bundle_id", sourceBundle.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sourceSnapshot) {
      return Response.json(
        { error: "no_snapshots", message: "Source bundle has no snapshots" },
        { status: 400 },
      );
    }

    // 4. Check for duplicate (D-11)
    const { data: existingBundle } = await admin
      .from("bundles")
      .select("id")
      .eq("owner_user_id", user.id)
      .eq("public_bundle_id", slug)
      .maybeSingle();

    if (existingBundle && !overwrite) {
      return Response.json(
        {
          error: "duplicate",
          existingBundleId: existingBundle.id,
          message: "Bundle with this ID already exists. Use overwrite=true to replace.",
        },
        { status: 409 },
      );
    }

    // 5. Create or reuse bundle
    let bundleUuid: string;
    if (existingBundle && overwrite) {
      bundleUuid = existingBundle.id;
      // Update metadata from source
      await admin
        .from("bundles")
        .update({
          display_name: sourceBundle.display_name,
          description: sourceBundle.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bundleUuid);
    } else {
      bundleUuid = randomUUID();
      const { error: insErr } = await admin.from("bundles").insert({
        id: bundleUuid,
        owner_user_id: user.id,
        public_bundle_id: slug,
        visibility: "private",
        display_name: sourceBundle.display_name,
        description: sourceBundle.description,
      });
      if (insErr) {
        return Response.json({ error: "db_error", message: insErr.message }, { status: 500 });
      }
    }

    // 6. Copy R2 object (D-08)
    const newSnapshotId = randomUUID();
    const destKey = `${user.id}/${bundleUuid}/${newSnapshotId}.zip`;
    await copyBundleZipObject(sourceSnapshot.storage_object_key, destKey);

    // 7. Create snapshot record
    const { error: snapErr } = await admin.from("bundle_snapshots").insert({
      id: newSnapshotId,
      bundle_id: bundleUuid,
      normalized_snapshot_hash: sourceSnapshot.normalized_snapshot_hash,
      storage_object_key: destKey,
      schema_version: sourceSnapshot.schema_version,
    });
    if (snapErr) {
      return Response.json({ error: "db_error", message: snapErr.message }, { status: 500 });
    }

    // 8. Create/update lineage (D-09, D-17)
    const { data: sourceLineage } = await admin
      .from("bundle_lineage")
      .select("root_bundle_id, root_author_id")
      .eq("bundle_id", sourceBundle.id)
      .maybeSingle();

    await admin.from("bundle_lineage").upsert({
      bundle_id: bundleUuid,
      parent_bundle_id: sourceBundle.id,
      root_bundle_id: sourceLineage?.root_bundle_id ?? sourceBundle.id,
      root_author_id: sourceLineage?.root_author_id ?? sourceBundle.owner_user_id,
      imported_snapshot_id: sourceSnapshot.id,
    });

    // 9. Increment import_count on source bundle (D-16)
    //    Non-critical counter — eventual consistency acceptable (D-18).
    //    Race condition on concurrent imports could lose a count, acceptable for beta.
    const { data: currentBundle } = await admin
      .from("bundles")
      .select("import_count")
      .eq("id", sourceBundle.id)
      .single();
    await admin
      .from("bundles")
      .update({ import_count: (currentBundle?.import_count ?? 0) + 1 })
      .eq("id", sourceBundle.id);

    return Response.json(
      {
        bundleId: bundleUuid,
        publicBundleId: slug,
        snapshotId: newSnapshotId,
        snapshotHash: sourceSnapshot.normalized_snapshot_hash,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof HttpError) {
      return Response.json({ error: "unauthorized", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
