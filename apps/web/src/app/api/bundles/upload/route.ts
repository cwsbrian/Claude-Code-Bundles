import {
  type BundleManifest,
  computeSnapshotIdFromZipPayload,
  extractManifestJsonFromZip,
  scanZipBufferForSecrets,
  validateManifestObject,
} from "@claude-code-bundles/core";
import { randomUUID } from "node:crypto";
import { putBundleZipObject } from "@/lib/r2/bundle-object-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError, requireUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const form = await request.formData();
    const archive = form.get("archive");
    if (!(archive instanceof File)) {
      return jsonResponse(
        { error: "invalid_request", message: 'Expected multipart field "archive" (zip file).' },
        400,
      );
    }

    const buf = Buffer.from(await archive.arrayBuffer());
    const manifestPart = form.get("manifest");
    let manifestRaw: string;
    if (manifestPart instanceof File) {
      manifestRaw = await manifestPart.text();
    } else {
      try {
        manifestRaw = extractManifestJsonFromZip(buf);
      } catch {
        return jsonResponse(
          {
            error: "manifest_required",
            message:
              'Phase 1 pack zips omit bundle.json. Upload the same `bundle.json` as an extra multipart field named "manifest".',
          },
          400,
        );
      }
    }

    let manifestJson: unknown;
    try {
      manifestJson = JSON.parse(manifestRaw) as unknown;
    } catch {
      return jsonResponse({ error: "manifest_invalid", message: "manifest JSON parse failed" }, 400);
    }

    const val = await validateManifestObject(manifestJson);
    if (!val.valid) {
      return jsonResponse({ error: "manifest_invalid", issues: val.issues }, 400);
    }

    const manifest = manifestJson as BundleManifest;

    const findings = scanZipBufferForSecrets(buf);
    if (findings.length > 0) {
      return jsonResponse(
        {
          error: "secret_scan_failed",
          message:
            "Upload rejected: high-confidence sensitive patterns detected. Remove secrets from the archive and retry.",
          findings,
        },
        400,
      );
    }

    const normalizedSnapshotHash = computeSnapshotIdFromZipPayload(buf);
    const admin = createAdminClient();

    const { data: existingBundle, error: findErr } = await admin
      .from("bundles")
      .select("id")
      .eq("owner_user_id", user.id)
      .eq("public_bundle_id", manifest.bundle_id)
      .maybeSingle();

    if (findErr) {
      console.error(findErr);
      return jsonResponse({ error: "db_error", message: findErr.message }, 500);
    }

    let bundleUuid = existingBundle?.id as string | undefined;
    if (!bundleUuid) {
      const ins = await admin
        .from("bundles")
        .insert({
          owner_user_id: user.id,
          public_bundle_id: manifest.bundle_id,
          visibility: manifest.visibility,
          display_name: manifest.name,
        })
        .select("id")
        .single();
      if (ins.error || !ins.data) {
        console.error(ins.error);
        return jsonResponse({ error: "db_error", message: ins.error?.message ?? "insert bundle" }, 500);
      }
      bundleUuid = ins.data.id as string;
    }

    const { data: existingSnap } = await admin
      .from("bundle_snapshots")
      .select("id, storage_object_key")
      .eq("bundle_id", bundleUuid)
      .eq("normalized_snapshot_hash", normalizedSnapshotHash)
      .maybeSingle();

    if (existingSnap) {
      return jsonResponse({
        bundleId: bundleUuid,
        publicBundleId: manifest.bundle_id,
        snapshotId: existingSnap.id,
        normalizedSnapshotHash,
        storageObjectKey: existingSnap.storage_object_key,
        deduped: true,
      });
    }

    const snapshotId = randomUUID();
    const objectPath = `${user.id}/${bundleUuid}/${snapshotId}.zip`;

    try {
      await putBundleZipObject(objectPath, buf);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : String(e);
      return jsonResponse({ error: "storage_upload_failed", message }, 500);
    }

    const insSnap = await admin
      .from("bundle_snapshots")
      .insert({
        id: snapshotId,
        bundle_id: bundleUuid,
        normalized_snapshot_hash: normalizedSnapshotHash,
        storage_object_key: objectPath,
        schema_version: manifest.schema_version,
      })
      .select("id, storage_object_key")
      .single();

    if (insSnap.error || !insSnap.data) {
      console.error(insSnap.error);
      return jsonResponse({ error: "db_error", message: insSnap.error?.message ?? "snapshot" }, 500);
    }

    return jsonResponse({
      bundleId: bundleUuid,
      publicBundleId: manifest.bundle_id,
      snapshotId: insSnap.data.id,
      normalizedSnapshotHash,
      storageObjectKey: insSnap.data.storage_object_key,
      deduped: false,
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return jsonResponse({ error: "unauthorized", message: e.message }, e.status);
    }
    throw e;
  }
}
