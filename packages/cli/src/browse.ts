import { loadAuth } from "./auth-store.js";

function getFlag(args: string[], ...flags: string[]): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    if (flags.includes(args[i])) return args[i + 1];
  }
  return undefined;
}

export async function runBrowse(args: string[]): Promise<void> {
  // Resolve API URL: flag > env > stored auth > hardcoded default
  const flagUrl = getFlag(args, "--api-url");
  const envUrl = process.env.CCB_API_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const stored = await loadAuth();
  const apiUrl = (flagUrl ?? envUrl ?? stored?.api_url ?? "").replace(/\/$/, "");

  if (!apiUrl) {
    throw new Error("Set --api-url or CCB_API_URL to specify the API server.");
  }

  // Parse flags
  const sort = getFlag(args, "--sort") ?? "recent";
  const tag = getFlag(args, "--tag") ?? null;
  const limit = getFlag(args, "--limit") ?? "20";
  const cursorArg = getFlag(args, "--cursor") ?? null;

  // Validate sort
  if (!["recent", "popular", "alphabetical"].includes(sort)) {
    throw new Error("--sort must be one of: recent, popular, alphabetical");
  }

  // Build URL
  const url = new URL("/api/bundles/public", apiUrl);
  url.searchParams.set("sort", sort);
  url.searchParams.set("limit", limit);
  if (tag) url.searchParams.set("tag", tag);
  if (cursorArg) url.searchParams.set("cursor", cursorArg);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Browse failed: ${res.status} ${text.slice(0, 400)}`);
  }

  type BrowseBundle = {
    public_bundle_id: string;
    display_name: string | null;
    description: string | null;
    published_by: { display_name: string | null } | null;
    tags: string[];
    import_count: number;
  };
  type BrowseResponse = { bundles: BrowseBundle[]; next_cursor: string | null };

  const data = (await res.json()) as BrowseResponse;

  if (data.bundles.length === 0) {
    process.stdout.write("No bundles found.\n");
    return;
  }

  // Print tabular output (matches status.ts pattern)
  const COL_NAME = 30;
  const COL_AUTHOR = 18;
  const COL_IMPORTS = 10;
  const COL_TAGS = 30;

  const header =
    "Bundle".padEnd(COL_NAME) +
    "Author".padEnd(COL_AUTHOR) +
    "Imports".padEnd(COL_IMPORTS) +
    "Tags".padEnd(COL_TAGS);
  const divider = "\u2500".repeat(COL_NAME + COL_AUTHOR + COL_IMPORTS + COL_TAGS);

  process.stdout.write(`${header}\n${divider}\n`);

  for (const b of data.bundles) {
    const name = (b.display_name ?? b.public_bundle_id).slice(0, COL_NAME - 1).padEnd(COL_NAME);
    const author = (b.published_by?.display_name ?? "--").slice(0, COL_AUTHOR - 1).padEnd(COL_AUTHOR);
    const imports = String(b.import_count).padEnd(COL_IMPORTS);
    const tags = (b.tags.length > 0 ? b.tags.join(", ") : "--").slice(0, COL_TAGS - 1).padEnd(COL_TAGS);
    process.stdout.write(`${name}${author}${imports}${tags}\n`);
  }

  if (data.next_cursor) {
    process.stdout.write(`\nMore results available. Use --cursor ${data.next_cursor}\n`);
  }
}
