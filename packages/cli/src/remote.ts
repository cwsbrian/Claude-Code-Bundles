import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadAuth, saveAuth } from "./auth-store.js";

export type RemoteApiContext = {
  apiUrl: string;
  token: string;
};

function apiOrigin(apiUrl: string): string {
  return apiUrl.replace(/\/$/, "");
}

function httpError(message: string, status: number, body?: unknown): Error {
  const err = new Error(message) as Error & { status?: number; body?: unknown };
  err.status = status;
  err.body = body;
  return err;
}

export type RemoteUploadOptions = {
  apiUrl: string;
  token: string;
  archivePath: string;
  /** Explicit manifest path; default: bundle.json beside the zip. */
  manifestPath?: string;
};

/** Multipart field names must match apps/web upload route */
const ARCHIVE_FIELD = "archive";
const MANIFEST_FIELD = "manifest";

function multipartPart(
  boundary: string,
  fieldName: string,
  filename: string,
  contentType: string,
  data: Buffer,
): Buffer {
  const header =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`;
  return Buffer.concat([Buffer.from(header, "utf8"), data, Buffer.from(`\r\n`, "utf8")]);
}

async function resolveManifestBuffer(
  archivePath: string,
  manifestPath?: string,
): Promise<Buffer> {
  const tried =
    manifestPath ?? path.join(path.dirname(archivePath), "bundle.json");
  try {
    return await readFile(tried);
  } catch {
    throw new Error(
      `Missing bundle manifest for upload. Pass --manifest <path> or place bundle.json next to the zip (expected ${tried}).`,
    );
  }
}

export async function uploadArchive(
  options: RemoteUploadOptions,
): Promise<Record<string, unknown>> {
  const { apiUrl, token, archivePath, manifestPath } = options;
  const uploadUrl = new URL("/api/bundles/upload", apiUrl.replace(/\/$/, "")).toString();
  const boundary = `----NodeForm${Date.now().toString(16)}`;
  const fileBuf = await readFile(archivePath);
  const filename = path.basename(archivePath);
  const manifestBuf = await resolveManifestBuffer(archivePath, manifestPath);

  const body = Buffer.concat([
    multipartPart(boundary, MANIFEST_FIELD, "bundle.json", "application/json", manifestBuf),
    multipartPart(boundary, ARCHIVE_FIELD, filename, "application/zip", fileBuf),
    Buffer.from(`--${boundary}--\r\n`, "utf8"),
  ]);

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(
      `Upload failed: ${res.status} ${text.slice(0, 500)}`,
    ) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = json;
    throw err;
  }

  return json;
}

export async function listRemoteBundles(
  ctx: RemoteApiContext,
): Promise<Record<string, unknown>> {
  const url = new URL("/api/bundles", apiOrigin(ctx.apiUrl)).toString();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${ctx.token}` },
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw httpError(`List failed: ${res.status} ${text.slice(0, 400)}`, res.status, json);
  }
  return json;
}

export async function downloadSnapshotToFile(
  ctx: RemoteApiContext & {
    bundleId: string;
    snapshotId: string;
    outPath: string;
  },
): Promise<void> {
  const url = new URL(
    `/api/bundles/${ctx.bundleId}/snapshots/${ctx.snapshotId}/download`,
    apiOrigin(ctx.apiUrl),
  ).toString();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${ctx.token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw httpError(
      `Download failed: ${res.status} ${text.slice(0, 400)}`,
      res.status,
      { raw: text },
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(ctx.outPath, buf);
}

function getFlag(args: string[], ...flags: string[]): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    if (flags.includes(args[i])) return args[i + 1];
  }
  return undefined;
}

export async function runRemoteUploadCli(args: string[]): Promise<void> {
  const archivePath = getFlag(args, "--archive", "-a");
  const manifestPath = getFlag(args, "--manifest", "-m");

  if (!archivePath) {
    throw new Error("Missing --archive <path> for remote upload.");
  }

  const { apiUrl, token } = await resolveApiContext(args);
  const result = await uploadArchive({ apiUrl, token, archivePath, manifestPath });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

export async function resolveApiContext(args: string[]): Promise<RemoteApiContext> {
  // Priority 1: CLI flags
  const flagUrl = getFlag(args, "--api-url");
  const flagToken = getFlag(args, "--token", "-t");

  // Priority 2: env vars
  const envUrl = process.env.CCB_API_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const envToken =
    process.env.CCB_ACCESS_TOKEN ?? process.env.SUPABASE_ACCESS_TOKEN;

  // Priority 3: stored login token
  const stored = await loadAuth();

  const apiUrl = flagUrl ?? envUrl ?? stored?.api_url;

  let token = flagToken ?? envToken ?? stored?.access_token;

  // If using stored token and it has expired, attempt refresh
  if (
    !flagToken &&
    !envToken &&
    stored &&
    token === stored.access_token &&
    stored.expires_at < Date.now() / 1000
  ) {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(stored.supabase_url, stored.supabase_anon_key, {
      auth: { persistSession: false },
    });
    const { data, error } = await sb.auth.refreshSession({
      refresh_token: stored.refresh_token,
    });
    if (error || !data.session) {
      throw new Error(
        "Session expired. Run `ccb login` to re-authenticate.",
      );
    }
    await saveAuth({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? 0,
      api_url: stored.api_url,
      supabase_url: stored.supabase_url,
      supabase_anon_key: stored.supabase_anon_key,
    });
    token = data.session.access_token;
  }

  if (!apiUrl) {
    throw new Error(
      "Set --api-url, CCB_API_URL, or run `ccb login`.",
    );
  }
  if (!token) {
    throw new Error(
      "Set --token, CCB_ACCESS_TOKEN, or run `ccb login`.",
    );
  }
  return { apiUrl, token };
}

export async function runRemoteListCli(args: string[]): Promise<void> {
  const ctx = await resolveApiContext(args);
  const data = await listRemoteBundles(ctx);
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

export async function runRemoteDownloadCli(args: string[]): Promise<void> {
  const ctx = await resolveApiContext(args);
  const bundleId = getFlag(args, "--bundle", "-b");
  const snapshotId = getFlag(args, "--snapshot", "-s");
  const outPath = getFlag(args, "--out", "-o");
  if (!bundleId) {
    throw new Error("Missing --bundle <uuid> for remote download.");
  }
  if (!snapshotId) {
    throw new Error("Missing --snapshot <uuid> for remote download.");
  }
  if (!outPath) {
    throw new Error("Missing --out <path> for remote download.");
  }
  await downloadSnapshotToFile({ ...ctx, bundleId, snapshotId, outPath });
  process.stdout.write(`Wrote ${outPath}\n`);
}
