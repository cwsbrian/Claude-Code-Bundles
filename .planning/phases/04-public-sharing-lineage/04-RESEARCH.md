# Phase 4: Public sharing + lineage - Research

**Researched:** 2026-04-01
**Domain:** Public bundle publishing, import/lineage, attribution, moderation (Supabase + R2 + Next.js API + CLI)
**Confidence:** HIGH

## Summary

Phase 4 transforms private bundles into a shareable ecosystem. The core work spans four areas: (1) DB schema additions (profiles table, bundle_publish_records table, ALTER TABLE for description and root_author_id columns, new RLS policies for anonymous read), (2) four new API endpoints (publish toggle, public bundle read, import, delete), (3) four new CLI commands (publish, import, unpublish, delete), and (4) R2 object copy/delete operations.

The existing codebase is well-structured for this. The Nx monorepo pattern (`apps/web` for API, `packages/cli` for CLI, `packages/core` for shared logic) is established. All new APIs follow the existing `requireUser()` + `createAdminClient()` pattern for authenticated endpoints, and a new unauthenticated pattern for public reads. R2 operations use `@aws-sdk/client-s3` which already includes `CopyObjectCommand` and `DeleteObjectCommand`. The CLI uses `@inquirer/prompts` for interactive flows. The `pull.ts` pattern (download + unpack + apply + registry update) is directly reusable for import.

**Primary recommendation:** Split into two plans: (1) DB migration + publish/import/delete API endpoints + R2 copy/delete operations, (2) CLI commands (publish/import/unpublish/delete) + public bundle read endpoint with attribution.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Publish is API endpoint only -- `PATCH /api/bundles/[bundleId]/publish`. CLI calls this endpoint.
- **D-02:** Publishing exposes latest snapshot only. Past snapshots are not exposed.
- **D-03:** Create `bundle_publish_records` table -- `published_at`, `published_snapshot_id`, `display_name` for publish history.
- **D-04:** Add `ccb publish <bundleId>` CLI command. Consistent with existing `ccb remote/pull/status` pattern.
- **D-05:** Publish pre-check: at least 1 snapshot required. Empty bundles rejected. No re-scan needed (upload already scanned).
- **D-06:** After new snapshot upload, public-facing snapshot auto-updates to latest. No explicit re-publish needed -- publish is a state toggle.
- **D-07:** Import API is `POST /api/bundles/import` -- body: `{ sourceBundleId }`. Server copies published snapshot to new private bundle + lineage.
- **D-08:** R2 zip is copied to importer's namespace (`{importerUserId}/{newBundleId}/{snapshotId}.zip`). Independent copy unaffected by original deletion/unpublish.
- **D-09:** Add `root_author_id` column to `bundle_lineage` (ALTER TABLE). Records root author at import time for 'Originated by' without JOIN traversal.
- **D-10:** Add `ccb import <owner/bundleId>` CLI command. Full flow: API call -> download -> unpack -> apply.
- **D-11:** Import duplicate handling: if bundle with same name exists, prompt overwrite or skip. Same UX pattern as Phase 3 `ccb pull`.
- **D-12:** Public bundle reference format: `owner/public_bundle_id` (e.g., `brian/my-cool-bundle`). GitHub-like namespace.
- **D-13:** Owner handle uses GitHub OAuth username (`user_metadata.user_name`). No custom handle registration.
- **D-14:** Create `public.profiles` table -- `user_id`, `github_handle`, `display_name`, `avatar_url`. Auto-populated from OAuth metadata on first login.
- **D-15:** Public display info: display name + avatar (no email). Used for 'Published by'.
- **D-16:** 'Published by / Originated by' is API responses only -- `GET /api/bundles/public/[owner/slug]` returns publisher + originator as JSON. Web UI is Phase 5. CLI can display.
- **D-17:** 'Originated by' (root author) stored in `bundle_lineage.root_author_id` -- recorded at import time. No query-time chain traversal.
- **D-18:** Public API response includes: bundle `display_name`, `public_bundle_id`, author (display_name + avatar), latest snapshot hash, `created_at`, `description`, bundle contents summary.
- **D-19:** Add `description` column to `bundles` table. Also used by Phase 5 discovery.
- **D-20:** Bundle contents summary extracted from manifest's skills/hooks/commands listing. Pre-import preview.
- **D-21:** Public bundle read is anonymous (no auth). `GET /api/bundles/public/[owner/slug]` requires no auth. Import requires auth (creates private copy).
- **D-22:** RLS policy extension: add anonymous SELECT for `visibility = 'public'` rows on `bundles` and `bundle_snapshots`.
- **D-23:** No browse/list API in Phase 4 -- single bundle lookup by ID only. Browse is Phase 5.
- **D-24:** No separate "unpublish" concept -- set visibility back to `private`. `ccb unpublish <id>` CLI toggles this.
- **D-25:** Delete is hard delete -- DB rows (CASCADE) + R2 objects fully removed. No soft delete.
- **D-26:** Delete does not touch locally installed files (`~/.claude/...`). Bundle is packaging/distribution layer.
- **D-27:** Delete does not affect existing imports (independent copies). Lineage record parent/root IDs remain as historical reference (dangling FK allowed -- ON DELETE SET NULL).
- **D-28:** Moderation is owner-only in Phase 4. No admin/operator role. Owner manages via visibility toggle or delete.

### Claude's Discretion
- `bundle_publish_records` detailed column and index design
- `profiles` table exact schema and populate trigger/logic
- API response JSON field naming
- CLI output format (ccb publish/import/unpublish/delete)
- RLS policy detail SQL
- `description` column length limit and default
- Bundle contents summary extraction logic details

### Deferred Ideas (OUT OF SCOPE)
- Import count / stats (Phase 5 discovery)
- Public bundle list/browse API (Phase 5, FND-01)
- Admin/operator moderation (Phase 5+, OPS-01)
- Soft delete (future compliance/audit)
- User-chosen custom handle (Phase 4 uses OAuth username)
- Re-scan on publish (upload already scanned)
- Import auto-retry (skip + continue only)
- Web UI for publish/import (Phase 4 is API + CLI only)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PUB-01 | Owner can switch bundle to public and expose public snapshot | D-01 publish toggle API, D-03 publish_records table, D-05 pre-check, D-06 auto-update, DB migration + RLS for public visibility |
| PUB-02 | Public bundle import creates new private bundle with lineage (parent/root/imported_snapshot) | D-07 import API, D-08 R2 copy, D-09 root_author_id, D-17 lineage storage, R2 CopyObjectCommand pattern |
| PUB-03 | API (or minimal UI) consistently exposes Published by / Originated by | D-14 profiles table, D-15 display info, D-16 public read endpoint, D-18 response shape, D-20 contents summary |
| MOD-01 | Minimum unpublish/hide path exists (owner or operator stub) | D-24 visibility toggle, D-25 hard delete, D-28 owner-only moderation, DeleteObjectCommand + CASCADE delete pattern |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@aws-sdk/client-s3` | 3.1021.0 | R2 object operations (Get/Put/Copy/Delete) | Already used for R2; CopyObjectCommand and DeleteObjectCommand available |
| `@supabase/supabase-js` | 2.101.1 | Auth + Postgres (admin client for API, anon client for auth) | Already used across web and CLI |
| `next` | 15.2.4 | API Route Handlers | Already used |
| `@inquirer/prompts` | 8.3.2 | Interactive CLI prompts (confirm, checkbox) | Already used in pull.ts for conflict resolution |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@claude-code-bundles/core` | workspace | Manifest validation, unpack, apply, registry | Import flow: unpack + apply + registry update |
| `open` | 11.x | Open browser | Already in CLI for login; not needed for Phase 4 |

### No New Dependencies Required
Phase 4 requires no new npm packages. All functionality is achievable with the existing stack:
- R2 copy: `CopyObjectCommand` from `@aws-sdk/client-s3`
- R2 delete: `DeleteObjectCommand` / `DeleteObjectsCommand` from `@aws-sdk/client-s3`
- Interactive prompts: `@inquirer/prompts` (confirm, checkbox)
- Manifest parsing: `@claude-code-bundles/core` (extractManifestJsonFromZip, loadManifest)

## Architecture Patterns

### New API Routes Structure
```
apps/web/src/app/api/bundles/
  [bundleId]/
    publish/
      route.ts          # PATCH: toggle visibility to public + record in bundle_publish_records
    route.ts            # DELETE: hard delete bundle + R2 objects (new)
    snapshots/[snapshotId]/download/route.ts  # existing
  import/
    route.ts            # POST: import public bundle -> new private copy
  public/
    [owner]/
      [slug]/
        route.ts        # GET: anonymous read of public bundle metadata + attribution
  route.ts              # existing: GET list own bundles
  upload/route.ts       # existing: POST upload
```

### New CLI Commands Structure
```
packages/cli/src/
  publish.ts            # ccb publish <bundleId> -- calls PATCH /api/bundles/[id]/publish
  import.ts             # ccb import <owner/slug> -- calls POST /api/bundles/import + download + unpack + apply
  unpublish.ts          # ccb unpublish <bundleId> -- calls PATCH /api/bundles/[id]/publish (toggle off)
  delete.ts             # ccb delete <bundleId> -- calls DELETE /api/bundles/[id]
  index.ts              # Add new subcommands
```

### DB Migration Structure
```
supabase/migrations/
  20260331120000_phase2_bundles_rls.sql    # existing
  20260401000000_phase4_public_sharing.sql # new: profiles, publish_records, ALTER TABLE, RLS
```

### Pattern 1: Anonymous Public Read (new pattern)
**What:** API route that does NOT call `requireUser()` for GET, uses admin client to query public data.
**When to use:** Public bundle metadata endpoint.
**Example:**
```typescript
// apps/web/src/app/api/bundles/public/[owner]/[slug]/route.ts
export async function GET(
  request: Request,
  context: { params: Promise<{ owner: string; slug: string }> },
) {
  const { owner, slug } = await context.params;
  const admin = createAdminClient();

  // Find owner by github_handle in profiles
  const { data: profile } = await admin
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .eq("github_handle", owner)
    .single();

  if (!profile) return Response.json({ error: "not_found" }, { status: 404 });

  // Find public bundle
  const { data: bundle } = await admin
    .from("bundles")
    .select(`
      id, public_bundle_id, display_name, description, created_at,
      bundle_snapshots (id, normalized_snapshot_hash, storage_object_key, created_at)
    `)
    .eq("owner_user_id", profile.user_id)
    .eq("public_bundle_id", slug)
    .eq("visibility", "public")
    .order("created_at", { ascending: false, referencedTable: "bundle_snapshots" })
    .single();

  if (!bundle) return Response.json({ error: "not_found" }, { status: 404 });

  // Attribution: publisher + originator (if lineage exists)
  // ...return JSON with display_name, avatar_url, contents_summary
}
```

### Pattern 2: R2 Object Copy for Import (new pattern)
**What:** Server-side copy of R2 zip from source namespace to importer namespace.
**When to use:** Import API.
**Example:**
```typescript
// Using CopyObjectCommand from @aws-sdk/client-s3
import { CopyObjectCommand } from "@aws-sdk/client-s3";

export async function copyBundleZipObject(sourceKey: string, destKey: string): Promise<void> {
  const s3 = getS3Client();
  const bucket = getBundleBucketName();
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${sourceKey}`,
      Key: destKey,
      ContentType: "application/zip",
    }),
  );
}
```

### Pattern 3: R2 Object Delete for Hard Delete (new pattern)
**What:** Delete all R2 objects for a bundle when hard-deleting.
**When to use:** Delete API.
**Example:**
```typescript
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";

export async function deleteBundleZipObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const s3 = getS3Client();
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: getBundleBucketName(),
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}
```

### Pattern 4: Profiles Populate on Login (new pattern)
**What:** Upsert `profiles` row from OAuth metadata when user authenticates.
**When to use:** Either as a DB trigger on `auth.users` INSERT/UPDATE, or in `requireUser()` middleware.
**Recommended approach:** DB trigger function that runs on `auth.users` INSERT. This catches all login methods and keeps profile creation atomic with user creation.
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, github_handle, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'user_name',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'user_name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    github_handle = EXCLUDED.github_handle,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
**Alternative approach:** API-side upsert in `requireUser()` or a dedicated middleware. This avoids DB triggers but requires changes to the auth module. The trigger approach is cleaner and more reliable -- it fires regardless of which API endpoint creates the user.

### Pattern 5: CLI Command with Owner/Slug Argument (new pattern)
**What:** Parse `owner/slug` argument from CLI positional args.
**When to use:** `ccb import brian/my-cool-bundle`
**Example:**
```typescript
export async function runImport(args: string[]): Promise<void> {
  const ref = args[0]; // "brian/my-cool-bundle"
  if (!ref || !ref.includes("/")) {
    throw new Error("Usage: ccb import <owner/bundleId>");
  }
  const [owner, slug] = ref.split("/", 2);
  // Call POST /api/bundles/import with { sourceBundleRef: `${owner}/${slug}` }
  // ...then download, unpack, apply (reuse pull.ts pattern)
}
```

### Anti-Patterns to Avoid
- **Querying lineage chain at runtime for 'Originated by':** Store `root_author_id` at import time (D-09/D-17). Never traverse parent chain to find root.
- **Re-implementing download+unpack+apply:** Reuse the exact pattern from `pull.ts` for the import flow.
- **Using `auth.uid()` in public read RLS policies:** For anonymous access, the policy must NOT rely on `auth.uid()`. Use `visibility = 'public'` condition with `TO anon, authenticated`.
- **Exposing user email in public API:** Only `display_name` and `avatar_url` (D-15).
- **Deleting R2 objects before DB rows:** Delete DB rows first (CASCADE handles relations), then clean up R2. If R2 cleanup fails, orphaned objects are less harmful than orphaned DB rows.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| R2 object copy | Manual download + re-upload | `CopyObjectCommand` from `@aws-sdk/client-s3` | Server-side copy is atomic, no bandwidth waste, handles large files |
| R2 bulk delete | Loop of individual DeleteObject calls | `DeleteObjectsCommand` (batch up to 1000 keys) | Single API call, handles partial failures gracefully |
| OAuth profile extraction | Custom GitHub API call | Supabase `auth.users.raw_user_meta_data` via DB trigger | Data already exists from OAuth login flow |
| Interactive CLI conflict resolution | Custom prompt logic | `@inquirer/prompts` confirm/checkbox (existing pattern in pull.ts) | Already used, consistent UX |
| Bundle contents summary | Custom manifest parser | `extractManifestJsonFromZip` from `@claude-code-bundles/core` + JSON walk | Already has the zip extraction; just walk the manifest keys |

**Key insight:** Phase 4 is primarily integration work connecting existing patterns. The download+unpack+apply chain exists in `pull.ts`, the R2 operations exist in `bundle-object-storage.ts`, the CLI command pattern exists in `index.ts`. The new work is connecting these patterns to new endpoints and adding DB schema for public visibility + profiles + publish records.

## Common Pitfalls

### Pitfall 1: R2 CopySource Format
**What goes wrong:** `CopyObjectCommand` requires `CopySource` in the format `bucket/key` (with leading slash on the key), not just the key.
**Why it happens:** Different S3-compatible stores have subtly different CopySource format requirements.
**How to avoid:** Use `CopySource: \`${bucket}/${sourceKey}\`` format. Cloudflare R2 docs confirm this requires a leading slash on the source parameter.
**Warning signs:** 403 or NoSuchKey errors during import despite source object existing.

### Pitfall 2: RLS Policy Conflicts with Existing Owner-Only Policies
**What goes wrong:** Adding a new `SELECT` policy for public visibility while the existing `bundles_select_own` policy uses `auth.uid() = owner_user_id` can cause unexpected behavior. When using anon key (no auth), `auth.uid()` returns NULL, so the owner policy never matches -- but the new public policy should.
**Why it happens:** PostgreSQL RLS evaluates policies with OR logic for same-operation policies. Multiple SELECT policies are fine -- any matching policy grants access.
**How to avoid:** Add a separate policy specifically for public reads: `CREATE POLICY "bundles_select_public" ON public.bundles FOR SELECT TO anon, authenticated USING (visibility = 'public');`. This correctly ORs with the existing owner policy.
**Warning signs:** 403 errors when accessing public bundles without auth token.

### Pitfall 3: Dangling Foreign Keys After Source Bundle Deletion
**What goes wrong:** If the original (source) bundle is deleted, `bundle_lineage.parent_bundle_id` and `root_bundle_id` become dangling references.
**Why it happens:** Import creates lineage referencing the source bundle. Source can be deleted later.
**How to avoid:** Already handled by D-27: `ON DELETE SET NULL` is the existing FK constraint. After deletion, lineage records have NULL parent/root IDs. The `root_author_id` (stored directly, not as FK) survives deletion.
**Warning signs:** Foreign key violation errors during delete if not using SET NULL.

### Pitfall 4: Race Condition in Publish + Upload
**What goes wrong:** User publishes a bundle, then immediately uploads a new snapshot. D-06 says the public-facing snapshot auto-updates. If the publish API caches the snapshot ID, it may serve stale data.
**Why it happens:** The design treats publish as a visibility toggle, not a snapshot pin.
**How to avoid:** The public read API should always query the latest snapshot (ORDER BY created_at DESC LIMIT 1) rather than storing a "current public snapshot ID". The `bundle_publish_records` table records publish history but does not control which snapshot is served.
**Warning signs:** Public API returns old snapshot after new upload.

### Pitfall 5: Import Creates Duplicate Bundle Names
**What goes wrong:** User imports "cool-bundle" but already has a local bundle named "cool-bundle".
**Why it happens:** `public_bundle_id` has a UNIQUE constraint per owner. Import needs to handle name collisions.
**How to avoid:** D-11 specifies overwrite or skip prompt. Server-side: check if `(owner_user_id, public_bundle_id)` already exists. If yes, CLI prompts user. If user chooses overwrite, update existing bundle with new snapshot and lineage.
**Warning signs:** Unique constraint violation errors from Supabase insert.

### Pitfall 6: Admin Client vs Anon Client Confusion
**What goes wrong:** Using admin client (service role) for public reads works but bypasses RLS. Using anon client for authenticated writes fails.
**Why it happens:** The codebase uses `createAdminClient()` everywhere in API routes.
**How to avoid:** Continue using `createAdminClient()` for ALL server-side API route operations. The admin client bypasses RLS which is correct for server-side code. RLS policies are defense-in-depth for direct Supabase client access.
**Warning signs:** No errors initially, but security gap if switching to anon client later.

## Code Examples

### DB Migration: Phase 4 Schema Changes
```sql
-- Phase 4: PUB-01/02/03, MOD-01 -- public sharing + lineage + profiles

-- 1. Profiles table (D-14)
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  github_handle text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Populate profiles from OAuth metadata (D-14 auto-populate)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, github_handle, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'user_name',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'user_name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    github_handle = EXCLUDED.github_handle,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Bundle publish records (D-03)
CREATE TABLE public.bundle_publish_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles (id) ON DELETE CASCADE,
  published_snapshot_id uuid REFERENCES public.bundle_snapshots (id) ON DELETE SET NULL,
  display_name text,
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bundle_publish_records_bundle_id_idx
  ON public.bundle_publish_records (bundle_id);

-- 4. Add description column to bundles (D-19)
ALTER TABLE public.bundles ADD COLUMN description text DEFAULT '';

-- 5. Add root_author_id to bundle_lineage (D-09)
ALTER TABLE public.bundle_lineage ADD COLUMN root_author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

-- 6. RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_publish_records ENABLE ROW LEVEL SECURITY;

-- Profiles: public read (display_name + avatar only), owner update
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Publish records: owner read/write via bundle ownership
CREATE POLICY "bundle_publish_records_select_own" ON public.bundle_publish_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bundles b WHERE b.id = bundle_id AND b.owner_user_id = auth.uid())
  );
CREATE POLICY "bundle_publish_records_insert_own" ON public.bundle_publish_records
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.bundles b WHERE b.id = bundle_id AND b.owner_user_id = auth.uid())
  );

-- 7. Public bundle access (D-22) -- anonymous SELECT for public visibility rows
CREATE POLICY "bundles_select_public" ON public.bundles
  FOR SELECT TO anon, authenticated USING (visibility = 'public');

CREATE POLICY "bundle_snapshots_select_public" ON public.bundle_snapshots
  FOR SELECT TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM public.bundles b
      WHERE b.id = bundle_id AND b.visibility = 'public'
    )
  );

CREATE POLICY "bundle_lineage_select_public" ON public.bundle_lineage
  FOR SELECT TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM public.bundles b
      WHERE b.id = bundle_id AND b.visibility = 'public'
    )
  );

-- Public access to publish records for public bundles
CREATE POLICY "bundle_publish_records_select_public" ON public.bundle_publish_records
  FOR SELECT TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM public.bundles b
      WHERE b.id = bundle_id AND b.visibility = 'public'
    )
  );
```

### R2 Utility Extensions (bundle-object-storage.ts)
```typescript
import { CopyObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

export async function copyBundleZipObject(sourceKey: string, destKey: string): Promise<void> {
  const s3 = getS3Client();
  const bucket = getBundleBucketName();
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `/${bucket}/${sourceKey}`,
      Key: destKey,
      ContentType: "application/zip",
    }),
  );
}

export async function deleteBundleZipObject(key: string): Promise<void> {
  const s3 = getS3Client();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: getBundleBucketName(),
      Key: key,
    }),
  );
}

export async function deleteBundleZipObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const s3 = getS3Client();
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: getBundleBucketName(),
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}
```

### Import API Pseudocode
```typescript
// POST /api/bundles/import
// Body: { sourceBundleId: "brian/my-cool-bundle" }
export async function POST(request: Request) {
  const user = await requireUser(request);
  const { sourceBundleId } = await request.json();
  const [ownerHandle, slug] = sourceBundleId.split("/", 2);

  const admin = createAdminClient();

  // 1. Look up source owner by github_handle
  const { data: sourceProfile } = await admin
    .from("profiles").select("user_id").eq("github_handle", ownerHandle).single();

  // 2. Find public bundle + latest snapshot
  const { data: sourceBundle } = await admin
    .from("bundles")
    .select("id, owner_user_id, public_bundle_id, display_name, description, ...")
    .eq("owner_user_id", sourceProfile.user_id)
    .eq("public_bundle_id", slug)
    .eq("visibility", "public")
    .single();

  // 3. Get latest snapshot
  const { data: sourceSnapshot } = await admin
    .from("bundle_snapshots")
    .select("id, normalized_snapshot_hash, storage_object_key, schema_version")
    .eq("bundle_id", sourceBundle.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // 4. Create new bundle for importer
  const newBundleId = randomUUID();
  await admin.from("bundles").insert({
    id: newBundleId,
    owner_user_id: user.id,
    public_bundle_id: slug, // same slug, different owner
    visibility: "private",
    display_name: sourceBundle.display_name,
    description: sourceBundle.description,
  });

  // 5. Copy R2 object to importer's namespace (D-08)
  const newSnapshotId = randomUUID();
  const destKey = `${user.id}/${newBundleId}/${newSnapshotId}.zip`;
  await copyBundleZipObject(sourceSnapshot.storage_object_key, destKey);

  // 6. Create snapshot record
  await admin.from("bundle_snapshots").insert({
    id: newSnapshotId,
    bundle_id: newBundleId,
    normalized_snapshot_hash: sourceSnapshot.normalized_snapshot_hash,
    storage_object_key: destKey,
    schema_version: sourceSnapshot.schema_version,
  });

  // 7. Create lineage record (D-09, D-17)
  // Determine root: if source has lineage with root, carry it forward; else source IS the root
  const { data: sourceLineage } = await admin
    .from("bundle_lineage")
    .select("root_bundle_id, root_author_id")
    .eq("bundle_id", sourceBundle.id)
    .maybeSingle();

  await admin.from("bundle_lineage").insert({
    bundle_id: newBundleId,
    parent_bundle_id: sourceBundle.id,
    root_bundle_id: sourceLineage?.root_bundle_id ?? sourceBundle.id,
    root_author_id: sourceLineage?.root_author_id ?? sourceBundle.owner_user_id,
    imported_snapshot_id: sourceSnapshot.id,
  });

  return Response.json({
    bundleId: newBundleId,
    publicBundleId: slug,
    snapshotId: newSnapshotId,
    // include download URL or let CLI call download endpoint
  });
}
```

### Publish API Pseudocode
```typescript
// PATCH /api/bundles/[bundleId]/publish
export async function PATCH(
  request: Request,
  context: { params: Promise<{ bundleId: string }> },
) {
  const user = await requireUser(request);
  const { bundleId } = await context.params;
  const admin = createAdminClient();

  // Verify ownership
  const { data: bundle } = await admin
    .from("bundles")
    .select("id, owner_user_id, visibility")
    .eq("id", bundleId)
    .single();

  if (!bundle || bundle.owner_user_id !== user.id) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  // Pre-check: at least one snapshot (D-05)
  const { count } = await admin
    .from("bundle_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("bundle_id", bundleId);

  if (!count || count === 0) {
    return Response.json({
      error: "no_snapshots",
      message: "Cannot publish: bundle has no snapshots. Upload at least one snapshot first.",
    }, { status: 400 });
  }

  const newVisibility = bundle.visibility === "public" ? "private" : "public";

  // Toggle visibility
  await admin.from("bundles")
    .update({ visibility: newVisibility, updated_at: new Date().toISOString() })
    .eq("id", bundleId);

  // If publishing, record in bundle_publish_records (D-03)
  if (newVisibility === "public") {
    const latestSnap = await admin
      .from("bundle_snapshots")
      .select("id")
      .eq("bundle_id", bundleId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    await admin.from("bundle_publish_records").insert({
      bundle_id: bundleId,
      published_snapshot_id: latestSnap?.data?.id,
      display_name: bundle.display_name,
    });
  }

  return Response.json({ visibility: newVisibility });
}
```

### Delete API Pseudocode
```typescript
// DELETE /api/bundles/[bundleId]
export async function DELETE(
  request: Request,
  context: { params: Promise<{ bundleId: string }> },
) {
  const user = await requireUser(request);
  const { bundleId } = await context.params;
  const admin = createAdminClient();

  // Verify ownership
  const { data: bundle } = await admin
    .from("bundles").select("id, owner_user_id").eq("id", bundleId).single();
  if (!bundle || bundle.owner_user_id !== user.id) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  // Get all snapshot storage keys for R2 cleanup
  const { data: snapshots } = await admin
    .from("bundle_snapshots").select("storage_object_key").eq("bundle_id", bundleId);
  const keys = (snapshots ?? []).map((s) => s.storage_object_key);

  // Delete DB rows first (CASCADE handles snapshots, lineage, publish_records)
  await admin.from("bundles").delete().eq("id", bundleId);

  // Then clean up R2 objects
  if (keys.length > 0) {
    await deleteBundleZipObjects(keys);
  }

  return Response.json({ deleted: true });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `bundle_lineage` has only parent/root bundle IDs | Add `root_author_id` for direct attribution lookup | Phase 4 (D-09) | Eliminates JOIN chain traversal for 'Originated by' |
| All bundles are private (owner-only RLS) | Add public visibility RLS policies | Phase 4 (D-22) | Enables anonymous read of public bundles |
| No user profiles in DB | `profiles` table with GitHub handle | Phase 4 (D-14) | Enables owner/slug addressing + attribution |
| R2 only Put/Get operations | Add Copy/Delete operations | Phase 4 | Enables import (copy) and hard delete |

## Open Questions

1. **Profiles backfill for existing users**
   - What we know: The DB trigger fires on `auth.users` INSERT only. Existing users who logged in before Phase 4 migration won't have profiles rows.
   - What's unclear: How many existing users are there? In production, is this just the developer?
   - Recommendation: Add a backfill query in the migration: `INSERT INTO profiles SELECT id, raw_user_meta_data->>'user_name', ... FROM auth.users ON CONFLICT DO NOTHING;`. This handles existing users. The trigger handles future logins.

2. **CopySource format for R2**
   - What we know: AWS S3 uses `/{bucket}/{key}` format. R2 documents say "requires a leading slash."
   - What's unclear: The exact format has subtle variations between R2 versions.
   - Recommendation: Use `/${bucket}/${key}` format. If it fails during testing, try `${bucket}/${key}` without leading slash. LOW risk given R2's S3 compatibility.

3. **Bundle contents summary extraction**
   - What we know: D-20 says extract skills/hooks/commands from manifest. The manifest has `manifest_path` and `payload_path` fields, but actual component listing requires reading the packed zip contents.
   - What's unclear: Whether to extract component names from the zip directory structure or from the manifest JSON.
   - Recommendation: For the public API response, list the top-level directories in the zip that match known component types (skills, hooks, commands, templates). This can be done by reading the zip central directory without full extraction. Use the existing `extractManifestJsonFromZip` pattern (which uses `adm-zip`) to read zip entries.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase/migrations/20260331120000_phase2_bundles_rls.sql` -- current DB schema
- Existing codebase: `apps/web/src/app/api/bundles/upload/route.ts` -- API route pattern
- Existing codebase: `packages/cli/src/pull.ts` -- download+unpack+apply pattern for reuse
- Existing codebase: `apps/web/src/lib/r2/bundle-object-storage.ts` -- R2 operations pattern
- `@aws-sdk/client-s3` v3.1021.0 installed -- CopyObjectCommand, DeleteObjectCommand available

### Secondary (MEDIUM confidence)
- [Cloudflare R2 S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/) -- CopyObject is supported
- [Supabase Auth user_metadata](https://supabase.com/docs/guides/auth/managing-user-data) -- `raw_user_meta_data` contains `user_name`, `full_name`, `avatar_url` from GitHub OAuth
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- `TO anon, authenticated` pattern for public access; `auth.uid()` returns NULL for unauthenticated requests

### Tertiary (LOW confidence)
- CopySource format (`/${bucket}/${key}` vs `${bucket}/${key}`) -- confirmed by R2 docs but subtle edge case worth testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all libraries already installed and used
- Architecture: HIGH -- follows established codebase patterns exactly, only adds new routes/commands
- Pitfalls: HIGH -- all pitfalls derive from reading existing code + official documentation
- DB migration: HIGH -- extends existing schema with well-understood Supabase/Postgres patterns

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain, no rapidly changing dependencies)
