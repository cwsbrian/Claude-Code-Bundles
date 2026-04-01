import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type StoredAuth = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  api_url: string;
  supabase_url: string;
  supabase_anon_key: string;
};

export const AUTH_PATH = path.join(
  os.homedir(),
  ".claude",
  "bundle-platform",
  "auth.json",
);

export async function saveAuth(auth: StoredAuth): Promise<void> {
  await mkdir(path.dirname(AUTH_PATH), { recursive: true });
  await writeFile(AUTH_PATH, JSON.stringify(auth, null, 2) + "\n", "utf8");
}

export async function loadAuth(): Promise<StoredAuth | null> {
  try {
    const raw = await readFile(AUTH_PATH, "utf8");
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export async function clearAuth(): Promise<void> {
  try {
    await unlink(AUTH_PATH);
  } catch {
    // Ignore errors if file doesn't exist
  }
}
