import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sort = url.searchParams.get("sort") ?? "recent";
    const tag = url.searchParams.get("tag") ?? null;
    const cursorParam = url.searchParams.get("cursor") ?? null;
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam ?? "20", 10) || 20, 1), 50);

    if (!["recent", "popular", "alphabetical"].includes(sort)) {
      return Response.json(
        { error: "invalid_sort", message: "Sort must be recent, popular, or alphabetical" },
        { status: 400 },
      );
    }

    // Decode cursor if present. Cursor is base64url-encoded JSON { id: string, value: string | number }
    let cursor: { id: string; value: string | number } | null = null;
    if (cursorParam) {
      try {
        cursor = JSON.parse(Buffer.from(cursorParam, "base64url").toString("utf-8"));
      } catch {
        return Response.json({ error: "invalid_cursor" }, { status: 400 });
      }
    }

    const admin = createAdminClient();

    // For tag filtering, first get bundle IDs matching the tag
    let tagBundleIds: string[] | null = null;
    if (tag) {
      const normalizedTag = tag.trim().toLowerCase();
      const { data: tagRows } = await admin
        .from("bundle_tags")
        .select("bundle_id")
        .eq("tag_name", normalizedTag);
      tagBundleIds = tagRows?.map((r) => r.bundle_id) ?? [];
      if (tagBundleIds.length === 0) {
        return Response.json({ bundles: [], next_cursor: null });
      }
    }

    // Build the main query selecting from bundles with visibility='public'
    let query = admin
      .from("bundles")
      .select("id, public_bundle_id, display_name, description, created_at, import_count, owner_user_id")
      .eq("visibility", "public");

    if (tagBundleIds) {
      query = query.in("id", tagBundleIds);
    }

    // Apply sort order and cursor-based pagination
    if (sort === "recent") {
      query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
      if (cursor) {
        query = query.or(
          `created_at.lt.${cursor.value},and(created_at.eq.${cursor.value},id.lt.${cursor.id})`,
        );
      }
    } else if (sort === "popular") {
      query = query.order("import_count", { ascending: false }).order("id", { ascending: false });
      if (cursor) {
        query = query.or(
          `import_count.lt.${cursor.value},and(import_count.eq.${cursor.value},id.lt.${cursor.id})`,
        );
      }
    } else if (sort === "alphabetical") {
      query = query
        .order("display_name", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });
      if (cursor) {
        query = query.or(
          `display_name.gt.${cursor.value},and(display_name.eq.${cursor.value},id.gt.${cursor.id})`,
        );
      }
    }

    // Fetch limit + 1 to detect if there are more results
    const { data: bundles, error } = await query.limit(limit + 1);

    if (error) {
      console.error(error);
      return Response.json({ error: "db_error", message: error.message }, { status: 500 });
    }

    // Determine next_cursor
    const hasMore = (bundles?.length ?? 0) > limit;
    const results = hasMore ? bundles!.slice(0, limit) : (bundles ?? []);

    let nextCursor: string | null = null;
    if (hasMore && results.length > 0) {
      const last = results[results.length - 1];
      const cursorValue =
        sort === "recent" ? last.created_at : sort === "popular" ? last.import_count : last.display_name;
      nextCursor = Buffer.from(JSON.stringify({ id: last.id, value: cursorValue })).toString("base64url");
    }

    // Batch-fetch profiles and tags for the result set
    const bundleIds = results.map((b) => b.id);
    const ownerIds = [...new Set(results.map((b) => b.owner_user_id))];

    const [profilesResult, tagsResult] =
      bundleIds.length > 0
        ? await Promise.all([
            admin.from("profiles").select("user_id, display_name, avatar_url").in("user_id", ownerIds),
            admin.from("bundle_tags").select("bundle_id, tag_name").in("bundle_id", bundleIds),
          ])
        : [{ data: [] }, { data: [] }];

    const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.user_id, p]));
    const tagMap = new Map<string, string[]>();
    for (const t of tagsResult.data ?? []) {
      const existing = tagMap.get(t.bundle_id) ?? [];
      existing.push(t.tag_name);
      tagMap.set(t.bundle_id, existing);
    }

    // Build response
    const response = results.map((b) => ({
      id: b.id,
      public_bundle_id: b.public_bundle_id,
      display_name: b.display_name,
      description: b.description,
      published_by: profileMap.get(b.owner_user_id)
        ? {
            display_name: profileMap.get(b.owner_user_id)!.display_name,
            avatar_url: profileMap.get(b.owner_user_id)!.avatar_url,
          }
        : null,
      tags: tagMap.get(b.id) ?? [],
      created_at: b.created_at,
      import_count: b.import_count,
    }));

    return Response.json({ bundles: response, next_cursor: nextCursor });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "internal_error", message: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
