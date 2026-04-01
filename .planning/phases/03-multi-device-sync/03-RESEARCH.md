# Phase 3: Multi-device Sync - Research

**Researched:** 2026-04-01
**Domain:** CLI auth (OAuth PKCE), interactive prompts, remote bundle sync
**Confidence:** HIGH

## Summary

Phase 3 adds three new CLI commands (`ccb login`, `ccb pull`, `ccb status`) that enable account-based multi-device sync. The core technical challenges are: (1) implementing browser-based OAuth login from a CLI using a localhost callback server + PKCE flow, (2) building an interactive bundle selection UI for pull, and (3) comparing local registry state against remote API state for the status command.

The existing codebase already has all the backend infrastructure needed -- the bundles list API, snapshot download API, Supabase Auth verification, unpack/apply/registry pipeline. Phase 3 is purely CLI-side: no new API routes or DB migrations are required. The `remote.ts` module provides `listRemoteBundles` and `downloadSnapshotToFile` which can be reused directly. The `registry.ts` module provides local state for comparison.

**Primary recommendation:** Use `@supabase/supabase-js` (already a dependency in web) for the PKCE OAuth flow, `@inquirer/prompts` for interactive selection, and `open` for browser launching. The localhost callback server should use Node.js built-in `http` module (no Express needed for a single-route ephemeral server).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: No device tracking tables (`devices`, `device_bundle_installs`). Account-based access only. No device count limits.
- D-02: SYNC-01 "device registration" is reinterpreted as account authentication. Install state lives only in local registry (`~/.claude/bundle-platform/registry.json`).
- D-03: `ccb pull` is a top-level command (NOT `ccb remote pull`).
- D-04: Pull flow: list remote bundles -> interactive selection -> download + unpack + apply.
- D-05: Same snapshot hash = "up-to-date", default skip.
- D-06: Newer server snapshot -> prompt: skip or overwrite.
- D-07: Same hash = auto-skip (no prompt).
- D-08: Multi-bundle pull failure: skip failed, continue rest, show summary.
- D-09: New `ccb status` command: local vs server comparison (up-to-date / newer on server / local-only).
- D-10: New `ccb login` command: browser OAuth with Supabase Auth, token stored locally.
- D-11: Integrate login token with existing `ccb remote` auth -- login token used when env vars absent.

### Claude's Discretion
- Interactive list UI library choice (inquirer, prompts, etc.)
- Token storage location and format (`~/.claude/bundle-platform/auth.json` etc.)
- `ccb status` output format (table, colors, etc.)
- OAuth callback server implementation (localhost redirect approach)
- Download progress display

### Deferred Ideas (OUT OF SCOPE)
- `devices` / `device_bundle_installs` tables
- `ccb login --token` (headless/CI)
- Auto-retry on failure
- `ccb push` shortcut
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYNC-01 | Device registration and install state recording | Reinterpreted per D-01/D-02: `ccb login` authenticates the account; local registry records install state. No server-side device tracking. |
| SYNC-02 | Pull from second device to restore identical snapshot | `ccb pull` uses existing list + download APIs, then unpack + apply + registry update. Hash comparison ensures identical snapshot. |
</phase_requirements>

## Standard Stack

### Core (new dependencies for `packages/cli`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.101.1 | OAuth PKCE flow (signInWithOAuth, exchangeCodeForSession) | Already used server-side; reuse for CLI auth ensures token compatibility |
| `@inquirer/prompts` | 8.3.2 | Interactive checkbox/select for bundle selection | Modern ESM-first inquirer rewrite; tree-shakeable individual prompts |
| `open` | 11.0.0 | Open browser for OAuth flow | Standard cross-platform browser opener; zero dependencies |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@inquirer/checkbox` | 5.1.2 | Multi-select bundle picker (if not using umbrella package) | Lighter alternative to full `@inquirer/prompts` |
| `@inquirer/confirm` | 6.0.10 | Skip/overwrite conflict prompt | Conflict resolution dialog |

### Existing (already in project, reused)

| Library | Location | Purpose |
|---------|----------|---------|
| `@claude-code-bundles/core` | `packages/core` | `unpack`, `applyBundle`, `updateRegistry`, `listRegistry` |
| `@supabase/supabase-js` | `apps/web` | Server-side auth verification (no change needed) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@inquirer/prompts` | `prompts` (npm) | Simpler API but less maintained; inquirer is the ecosystem standard |
| `@supabase/supabase-js` client | Raw HTTP to Supabase Auth endpoints | Would need to hand-roll PKCE generation, token refresh; not worth it |
| `open` | `xdg-open`/`start` via child_process | Not cross-platform; `open` handles macOS/Windows/Linux uniformly |

**Installation (in `packages/cli`):**
```bash
npm install @supabase/supabase-js @inquirer/prompts open
```

## Architecture Patterns

### New Files Structure
```
packages/cli/src/
  index.ts          # Add login/pull/status command routing
  remote.ts         # Existing -- add resolveApiContextFromLogin()
  login.ts          # NEW: OAuth PKCE flow + token persistence
  pull.ts           # NEW: Interactive pull workflow
  status.ts         # NEW: Local vs remote comparison
  auth-store.ts     # NEW: Token read/write (~/.claude/bundle-platform/auth.json)
```

### Pattern 1: CLI OAuth Login via Localhost Callback

**What:** Spin up ephemeral HTTP server on localhost, open browser to Supabase OAuth URL with `redirectTo=http://localhost:{port}/callback`, receive auth code, exchange for session, save tokens, shut down server.

**When to use:** `ccb login`

**Implementation approach:**
```typescript
// auth-store.ts -- token persistence
import { readFile, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const AUTH_PATH = path.join(os.homedir(), ".claude", "bundle-platform", "auth.json");

type StoredAuth = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  supabase_url: string;
};

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
```

```typescript
// login.ts -- OAuth PKCE flow
import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import open from "open";
import { saveAuth } from "./auth-store.js";

export async function runLogin(supabaseUrl: string, supabaseAnonKey: string): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, flowType: "pkce" },
  });

  // 1. Find available port, start localhost server
  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as import("net").AddressInfo).port;
  const redirectTo = `http://127.0.0.1:${port}/callback`;

  // 2. Initiate OAuth -- get URL to open in browser
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github", // or configurable
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new Error(error?.message ?? "No OAuth URL");

  // 3. Handle callback
  const session = await new Promise<{ access_token: string; refresh_token: string; expires_at: number }>((resolve, reject) => {
    const timeout = setTimeout(() => { server.close(); reject(new Error("Login timed out")); }, 120_000);

    server.on("request", async (req, res) => {
      const url = new URL(req.url!, `http://127.0.0.1:${port}`);
      if (url.pathname !== "/callback") { res.end(); return; }
      const code = url.searchParams.get("code");
      if (!code) { res.writeHead(400); res.end("Missing code"); return; }

      const { data: sessionData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeErr || !sessionData.session) {
        res.writeHead(500); res.end("Auth failed");
        reject(new Error(exchangeErr?.message ?? "No session"));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html><body><h2>Login successful! You can close this tab.</h2></body></html>");
      clearTimeout(timeout);
      resolve({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at ?? 0,
      });
    });

    // 4. Open browser
    open(data.url);
    process.stdout.write("Opening browser for login...\n");
  });

  // 5. Save + close
  await saveAuth({ ...session, supabase_url: supabaseUrl });
  server.close();
  process.stdout.write("Logged in successfully.\n");
}
```

### Pattern 2: Unified Auth Resolution (D-11)

**What:** All commands that need auth try: (1) CLI flags, (2) env vars, (3) stored login token -- in that order.

**When to use:** Every authenticated command (`pull`, `status`, `remote *`).

```typescript
// In remote.ts -- enhanced resolveApiContext
import { loadAuth } from "./auth-store.js";

export async function resolveApiContext(args: string[]): Promise<RemoteApiContext> {
  // Priority 1: CLI flags
  const flagUrl = getFlag(args, "--api-url");
  const flagToken = getFlag(args, "--token", "-t");

  // Priority 2: env vars
  const envUrl = process.env.CCB_API_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const envToken = process.env.CCB_ACCESS_TOKEN ?? process.env.SUPABASE_ACCESS_TOKEN;

  // Priority 3: stored login
  const stored = await loadAuth();
  const apiUrl = flagUrl ?? envUrl ?? (stored ? `${stored.supabase_url.replace(/\/$/, "")}/..` : undefined);
  // Note: apiUrl for stored login needs to point to the Vercel app, not Supabase directly.
  // Store CCB_API_URL alongside tokens in auth.json, or derive from config.

  const token = flagToken ?? envToken ?? stored?.access_token;

  if (!apiUrl) throw new Error("Set --api-url, CCB_API_URL, or run `ccb login`.");
  if (!token) throw new Error("Set --token, CCB_ACCESS_TOKEN, or run `ccb login`.");
  return { apiUrl, token };
}
```

### Pattern 3: Interactive Pull Flow (D-04 through D-08)

**What:** Fetch remote bundles, compare with local registry, present interactive checkbox with status indicators, download selected bundles sequentially with conflict handling.

```typescript
// pull.ts sketch
import { checkbox, confirm } from "@inquirer/prompts";
import { listRegistry } from "@claude-code-bundles/core";

type BundleChoice = {
  name: string;  // display: "my-bundle (newer on server)"
  value: { bundleId: string; snapshotId: string; storageKey: string };
  disabled?: string | boolean;
};

async function buildChoices(remoteBundles: any[], localEntries: RegistryEntry[]): Promise<BundleChoice[]> {
  const localMap = new Map(localEntries.map(e => [e.bundleId, e]));
  return remoteBundles.map(rb => {
    const latestSnap = rb.bundle_snapshots?.[0]; // newest
    const local = localMap.get(rb.public_bundle_id);
    const remoteHash = latestSnap?.normalized_snapshot_hash;
    const localHash = local?.snapshotId; // need to store hash in registry

    let status: string;
    if (!local) status = "not installed";
    else if (localHash === remoteHash) status = "up-to-date";
    else status = "newer on server";

    return {
      name: `${rb.display_name ?? rb.public_bundle_id} (${status})`,
      value: { bundleId: rb.id, snapshotId: latestSnap.id, storageKey: latestSnap.storage_object_key },
      disabled: status === "up-to-date" ? "up-to-date" : false,
    };
  });
}
```

### Pattern 4: Status Comparison (D-09)

**What:** Compare local registry entries against remote bundle list. Show tabular output with three states.

```typescript
// status.ts
// For each local entry: check if remote has it (by public_bundle_id), compare hashes
// For each remote entry: check if local has it
// Categories: up-to-date | newer-on-server | local-only | remote-only (not installed)
```

### Anti-Patterns to Avoid

- **Storing raw JWT in plaintext without noting expiry:** Always store `expires_at` alongside the token so commands can detect expiry before making API calls. Prompt re-login if expired.
- **Blocking on single bundle failure during multi-pull:** D-08 explicitly requires skip + continue. Never throw from a single bundle download error.
- **Hardcoding Supabase URL in CLI:** Must be configurable (env var or stored in auth.json during login).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PKCE code_verifier/challenge | Custom crypto | `@supabase/supabase-js` PKCE flow | Library handles verifier generation, storage, and exchange internally |
| Browser opening | `child_process.exec("xdg-open")` | `open` package | Cross-platform (macOS, Windows, Linux, WSL) with proper escaping |
| Interactive checkbox | Custom stdin readline loop | `@inquirer/prompts` | Handles terminal raw mode, cursor movement, pagination, disabled items |
| Token refresh | Manual refresh_token HTTP calls | `supabase.auth.refreshSession()` | Handles edge cases (concurrent refresh, expired refresh token) |
| Multipart download streaming | Custom TCP/chunk handling | Native `fetch` + `Buffer.from(arrayBuffer)` | Already proven pattern in existing `downloadSnapshotToFile` |

**Key insight:** The existing codebase already has download, unpack, apply, and registry update pipelines. Phase 3 is about composition (connecting these pieces through new commands) not new low-level functionality.

## Common Pitfalls

### Pitfall 1: OAuth Callback Port Conflicts
**What goes wrong:** Hardcoded localhost port (e.g., 3000) is already in use; login fails silently.
**Why it happens:** Developer machines often have dev servers running.
**How to avoid:** Use port 0 (OS-assigned) -- `server.listen(0, "127.0.0.1")` then read `server.address().port`. Pass dynamic port in `redirectTo`.
**Warning signs:** "EADDRINUSE" error on login.

### Pitfall 2: Supabase OAuth Redirect Allow-List
**What goes wrong:** Supabase Auth rejects the callback URL because `http://127.0.0.1:*` is not in the project's redirect allow-list.
**Why it happens:** Supabase requires explicit URL patterns in Authentication > URL Configuration > Redirect URLs.
**How to avoid:** Add `http://127.0.0.1:*/callback` (or `http://localhost:*/callback`) to the Supabase dashboard redirect allow-list. Note: wildcard port support varies -- may need a fixed port range or pattern.
**Warning signs:** OAuth flow redirects to error page instead of callback.

### Pitfall 3: Token Expiry Not Checked Before API Calls
**What goes wrong:** Stored JWT has expired; API returns 401; user gets cryptic error instead of "please re-login".
**Why it happens:** JWTs have short default TTLs (1 hour in Supabase). If user runs `ccb pull` days after login, token is expired.
**How to avoid:** Check `expires_at` before API calls. If expired, try `refreshSession()` with stored refresh_token. If refresh also fails, prompt `ccb login`.
**Warning signs:** 401 errors on previously working commands.

### Pitfall 4: Registry Hash Mismatch Format
**What goes wrong:** Local registry stores `snapshotId` as `bundleId@version` (see `index.ts` line 219), but remote API returns `normalized_snapshot_hash`. These are different values -- comparison logic must use the correct field.
**Why it happens:** Phase 1 registry stores a composite ID, not the content hash.
**How to avoid:** Either (a) add `snapshotHash` field to `RegistryEntry` type and populate it during pull/install, or (b) use `snapshotId` (UUID) for comparison instead of hash. Option (a) is cleaner for D-05/D-07 hash-based skip logic.
**Warning signs:** Bundles always show as "newer on server" even when identical.

### Pitfall 5: `open` Package ESM Import
**What goes wrong:** `open` v10+ is ESM-only. If tsconfig or build pipeline isn't configured for ESM, import fails.
**Why it happens:** The project already uses `"type": "module"` so this should work, but worth verifying.
**How to avoid:** Confirm `packages/cli/package.json` has `"type": "module"` and tsconfig targets ESM output.
**Warning signs:** `ERR_REQUIRE_ESM` at runtime.

## Code Examples

### Registering Supabase Redirect URL
```
# In Supabase Dashboard > Authentication > URL Configuration > Redirect URLs:
# Add: http://127.0.0.1:*/callback
# Or if wildcard ports not supported: http://127.0.0.1/callback (and use fixed port)
```

### Enhanced RegistryEntry Type (for hash comparison)
```typescript
// packages/core/src/registry.ts -- add snapshotHash field
export type RegistryEntry = {
  bundleId: string;
  snapshotId: string;
  snapshotHash?: string; // NEW: normalized_snapshot_hash from server
  archivePath: string;
  manifestSourcePath: string;
  installedPaths: string[];
  installedAt: string;
};
```

### Auth Store Location
```
~/.claude/bundle-platform/auth.json
{
  "access_token": "eyJ...",
  "refresh_token": "...",
  "expires_at": 1712000000,
  "api_url": "https://your-app.vercel.app",
  "supabase_url": "https://xxx.supabase.co",
  "supabase_anon_key": "eyJ..."
}
```
Note: `api_url` (Vercel app URL) is needed because the CLI talks to the Vercel API routes, not Supabase directly. Store it during `ccb login` (from env or flag) so subsequent commands don't need env vars.

### Status Output Format
```
$ ccb status
Bundle                    Local          Server         Status
my-productivity-bundle    abc123...      abc123...      up-to-date
my-dev-tools              def456...      ghi789...      newer on server
local-experiment          jkl012...      --             local-only
new-remote-bundle         --             mno345...      not installed
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `inquirer` (monolithic) | `@inquirer/prompts` (modular ESM) | 2023-2024 | Tree-shakeable; individual package imports |
| Implicit OAuth flow | PKCE flow | OAuth 2.1 standard | Required for public clients (CLIs); Supabase default |
| `opn` package | `open` package | 2019 (rename) | Same maintainer, active; ESM-only since v10 |

## Open Questions

1. **Supabase redirect wildcard port support**
   - What we know: Supabase allows adding redirect URLs with wildcards in some positions.
   - What's unclear: Whether `http://127.0.0.1:*/callback` works or if we need a fixed port.
   - Recommendation: Test during implementation. Fallback: use a fixed port (e.g., 54321) and handle EADDRINUSE by trying a few alternatives.

2. **OAuth provider selection**
   - What we know: Supabase supports GitHub, Google, etc. User hasn't specified which provider(s).
   - What's unclear: Which OAuth provider is configured in the Supabase project.
   - Recommendation: Start with GitHub (most natural for dev tooling). Make provider configurable via flag or auto-detect from Supabase project settings.

3. **Token refresh strategy**
   - What we know: Supabase JWTs expire (default 1h). Refresh tokens have longer life.
   - What's unclear: Whether to refresh transparently on every command or only on 401.
   - Recommendation: Check `expires_at` before API calls; if < 5 min remaining, refresh proactively. On 401, attempt one refresh then fail with "run `ccb login`".

4. **API URL storage during login**
   - What we know: Current `ccb remote` uses `CCB_API_URL` env var pointing to Vercel app.
   - What's unclear: How `ccb login` knows the Vercel API URL (it's different from Supabase URL).
   - Recommendation: Require `CCB_API_URL` (or `--api-url`) during `ccb login` and persist it in auth.json. After login, all commands read from stored config.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `packages/cli/src/remote.ts`, `packages/core/src/registry.ts`, `packages/cli/src/index.ts` -- direct code analysis
- Supabase Phase 2 migration: `supabase/migrations/20260331120000_phase2_bundles_rls.sql` -- DB schema
- `apps/web/src/app/api/bundles/route.ts`, `.../download/route.ts` -- API contract

### Secondary (MEDIUM confidence)
- [Supabase PKCE Flow docs](https://supabase.com/docs/guides/auth/sessions/pkce-flow) -- flow mechanics, code exchange
- [Supabase signInWithOAuth reference](https://supabase.com/docs/reference/javascript/auth-signinwithoauth) -- API surface
- [Building a Localhost OAuth Callback Server in Node.js](https://dev.to/koistya/building-a-localhost-oauth-callback-server-in-nodejs-470c) -- pattern reference
- [@inquirer/prompts npm](https://www.npmjs.com/package/@inquirer/prompts) -- API and version
- npm registry version checks (2026-04-01): `@supabase/supabase-js@2.101.1`, `@inquirer/prompts@8.3.2`, `open@11.0.0`

### Tertiary (LOW confidence)
- Supabase redirect URL wildcard behavior -- needs runtime validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- versions verified from npm registry, libraries well-established
- Architecture: HIGH -- building on proven existing patterns in the codebase; no new API routes or DB changes
- Pitfalls: HIGH -- identified from direct code analysis (registry hash format mismatch) and known OAuth patterns
- Open questions: MEDIUM -- redirect wildcard and provider config depend on Supabase project settings

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain; no fast-moving dependencies)
