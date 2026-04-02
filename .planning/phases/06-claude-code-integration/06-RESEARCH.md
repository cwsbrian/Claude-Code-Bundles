# Phase 6: Claude Code Integration - Research

**Researched:** 2026-04-02
**Domain:** Claude Code slash commands / skills, CLI cold-start bootstrap, non-interactive CLI execution
**Confidence:** HIGH

## Summary

Phase 6 integrates the existing `ccb` CLI into Claude Code so users can run `/bundle:import`, `/bundle:pull`, `/bundle:status`, and `/bundle:browse` as slash commands without needing to install the CLI separately. The mechanism is straightforward: markdown command files in `~/.claude/commands/bundle/` instruct Claude to call `npx @claude-code-bundles/cli <subcommand>` via the Bash tool. A `ccb setup` command copies these files from the npm package to the user's home directory.

The most critical finding is that the current CLI commands (`pull`, `import`, `delete`) use `@inquirer/prompts` interactive prompts (checkbox, confirm) that will fail when called from Claude Code's Bash tool, which does not have an interactive TTY. The CLI must add a `--yes` / `--non-interactive` flag (or auto-detect non-TTY) to skip confirmations and use sensible defaults. Additionally, `pull` currently requires interactive selection of bundles; a `--all` flag or direct bundle ID argument is needed.

The second critical finding is that `@claude-code-bundles/cli` is not yet published to npm, so `npx @claude-code-bundles/cli` will not resolve. The package must be published to npm before the `npx` one-liner bootstrap (D-05) can work.

**Primary recommendation:** Focus the plan on three areas: (1) add non-interactive CLI flags for TTY-less execution, (2) create command markdown files and the `ccb setup` subcommand to install them, (3) ensure `ccb import` auto-installs command files as a side-effect (D-04).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Execution mechanism is Claude Code slash command + Bash tool calling `npx @claude-code-bundles/cli <subcommand>`.
- **D-02:** Platform detection: auto-detect Claude Code context; else interactive selection prompt (Claude Code / Cursor / Codex / other). `--tool` flag for explicit override.
- **D-03:** Entry point is `npx` terminal one-liner. Claude Code needs `~/.claude/commands/bundle/` files first.
- **D-04:** `ccb import owner/bundle-id` auto-installs command files to `~/.claude/commands/bundle/` if missing (side-effect).
- **D-05:** Sharing one-liner: `npx @claude-code-bundles/cli import owner/bundle-id`. Includes command file installation.
- **D-06:** Command files (`import.md`, `pull.md`, `status.md`, `browse.md`) ship inside the npm package. Copied to `~/.claude/commands/bundle/` on `ccb import` or `ccb setup`.
- **D-07:** Command file naming: `.claude/commands/bundle/import.md` maps to `/bundle:import`. Same pattern for all.
- **D-08:** Phase 6 commands: `/bundle:import [owner/id]`, `/bundle:pull`, `/bundle:status`, `/bundle:browse`.
- **D-09:** Commands are prompt files instructing Claude to run Bash + npx ccb. Same pattern as `.claude/commands/gsd/` files.
- **D-10:** Auth check first (`~/.claude/bundle-platform/auth.json`). If missing, auto-run `npx ccb login` via Bash.
- **D-11:** Environment variable fallback: `CCB_TOKEN` + `CCB_API_URL` bypasses auth.json.
- **D-12:** CLI is slim: import, pull, status, setup only. publish/upload is Claude Code skill main path.
- **D-13:** `ccb setup` subcommand: installs command files only, no import. For users who already have ccb.

### Claude's Discretion
- Command file prompt wording details
- `ccb import` overwrite policy for existing command files (`--force`)
- `/bundle:browse` output format (table, list, etc.)
- Directory structure of command files within the npm package

### Deferred Ideas (OUT OF SCOPE)
- Bundle unit redefinition (plugin-based bundles) -- future architecture decision
- `/bundle:publish` command design -- post Phase 6
- Cursor, Codex path mapping -- Phase 6 does platform detection stub only
- MCP server integration (`claude mcp add bundle npx @claude-code-bundles/mcp-server`) -- not Phase 6 scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Claude Code slash commands | current | `/bundle:*` user-facing commands | Official Claude Code extension mechanism; `.claude/commands/` directory pattern |
| `@claude-code-bundles/cli` | 0.1.0 | CLI backend that commands invoke via `npx` | Existing project package; all business logic lives here |
| Node.js | >=18 | Runtime for `npx` execution | Required by Claude Code environment |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@inquirer/prompts` | ^8.3.2 | Interactive prompts (already in CLI) | Only in TTY mode; skip when `--yes` or non-TTY detected |
| `fs/promises` (Node built-in) | - | File copy for `ccb setup` command file installation | Always (copy `.md` files from package to `~/.claude/commands/bundle/`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Slash commands + npx | MCP server | Deeper integration, natural language, but deferred (D-deferred) |
| npx one-liner | Direct `node` script | npx handles package resolution; node requires local install |

**Installation:** No new packages needed. The existing CLI package has all dependencies. Command files are static markdown.

## Architecture Patterns

### Recommended Project Structure
```
packages/cli/
  src/
    setup.ts           # NEW: ccb setup command (copy command files)
    index.ts           # MODIFY: add 'setup' and 'browse' subcommands
    browse.ts          # NEW: ccb browse subcommand (calls browse API)
  commands/            # NEW: source command .md files (shipped in npm package)
    bundle/
      import.md        # -> ~/.claude/commands/bundle/import.md
      pull.md          # -> ~/.claude/commands/bundle/pull.md
      status.md        # -> ~/.claude/commands/bundle/status.md
      browse.md        # -> ~/.claude/commands/bundle/browse.md
```

### Pattern 1: Claude Code Command File Format
**What:** Markdown files with YAML frontmatter that instruct Claude to perform tasks via tools.
**When to use:** All `/bundle:*` commands follow this pattern.
**Example:**
```yaml
---
name: bundle:import
description: Import a public bundle into your account
argument-hint: "[owner/bundle-id]"
allowed-tools:
  - Bash
---

Import a bundle from the Claude Code Bundle platform.

If an argument is provided (e.g., `owner/bundle-id`), import it directly:

```bash
npx @claude-code-bundles/cli import $ARGUMENTS
```

If no argument is provided, list available bundles for the user to choose from.

First check authentication:
- If `~/.claude/bundle-platform/auth.json` exists, proceed.
- Otherwise, run `npx @claude-code-bundles/cli login` first.
```
Source: [Claude Code slash commands docs](https://code.claude.com/docs/en/slash-commands), verified pattern from existing `.claude/commands/gsd/*.md` files in this project.

### Pattern 2: Non-Interactive CLI Execution via Bash Tool
**What:** Claude Code's Bash tool does not provide an interactive TTY. All `@inquirer/prompts` calls (checkbox, confirm) will hang or crash.
**When to use:** Every CLI subcommand that Claude might invoke.
**Example:**
```typescript
// Detect non-interactive environment
const isInteractive = process.stdin.isTTY === true;

// In pull.ts — skip interactive selection when --all or --yes is passed
if (!isInteractive || args.includes("--yes") || args.includes("-y")) {
  // Pull all actionable bundles without prompting
  selected = actionable.map(c => c.value);
} else {
  selected = await checkbox<BundleChoice>({ ... });
}
```

### Pattern 3: Command File Installation (setup.ts)
**What:** Copy markdown command files from the npm package's `commands/bundle/` directory to `~/.claude/commands/bundle/`.
**When to use:** `ccb setup` or as side-effect of `ccb import`.
**Example:**
```typescript
import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const COMMANDS_SOURCE = path.join(import.meta.dirname, "..", "commands", "bundle");
const COMMANDS_TARGET = path.join(os.homedir(), ".claude", "commands", "bundle");

export async function installCommands(force = false): Promise<string[]> {
  await mkdir(COMMANDS_TARGET, { recursive: true });
  // Copy each .md file from source to target
  // Return list of installed paths
}
```

### Anti-Patterns to Avoid
- **Interactive prompts in non-TTY context:** `@inquirer/prompts` will throw or hang if `process.stdin.isTTY` is false. Always check and provide non-interactive fallback.
- **Hardcoding command file paths in prompts:** Use `$ARGUMENTS` substitution in command files, not hardcoded values.
- **Assuming npm package is published:** The `npx` one-liner requires the package to be published to npm first. Until then, testing must use local paths.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TTY detection | Custom env var checks | `process.stdin.isTTY` | Node.js built-in, reliable, standard pattern |
| File copying | Manual read/write loop | `fs.cp(src, dest, { recursive: true })` | Node 16.7+ built-in, handles directories recursively |
| Package directory resolution | `__dirname` hacks | `import.meta.dirname` (Node 21.2+) or `fileURLToPath(import.meta.url)` | Correct ESM module resolution |
| Browse API output formatting | Custom table renderer | `process.stdout.write` with padEnd | Matches existing `status.ts` pattern; no new dependency |

**Key insight:** The command files are pure markdown -- no code execution needed in them. All logic lives in the existing CLI. The slash commands are just prompt templates that tell Claude to call `npx ccb <subcommand>`.

## Common Pitfalls

### Pitfall 1: Interactive Prompts in Non-TTY Environment
**What goes wrong:** `@inquirer/prompts` calls (`checkbox`, `confirm`) throw errors or hang when stdin is not a TTY, which is the case when Claude Code's Bash tool runs a command.
**Why it happens:** Claude Code's Bash tool pipes commands through a non-interactive shell. `process.stdin.isTTY` is `undefined` (falsy).
**How to avoid:** Add `--yes` / `-y` flag to all commands that use interactive prompts. Auto-detect TTY and fall back to non-interactive defaults. For `pull`, add `--all` to pull all actionable bundles without selection.
**Warning signs:** Commands hang with no output when invoked from Claude Code.

### Pitfall 2: npm Package Not Published
**What goes wrong:** `npx @claude-code-bundles/cli import owner/id` fails with 404 because the package isn't on npm.
**Why it happens:** The package is currently `"private": true` in `packages/cli/package.json` and has never been published.
**How to avoid:** Either publish to npm before Phase 6 completion, or adjust the one-liner to use a GitHub-based install (`npx github:user/repo#path`). Publishing is the cleaner path per D-05.
**Warning signs:** `npm view @claude-code-bundles/cli version` returns 404.

### Pitfall 3: Command Files Not Included in npm Package
**What goes wrong:** `ccb setup` tries to copy files that don't exist in the installed package because they weren't included in `package.json`'s `files` field.
**Why it happens:** npm only includes files specified in `files` array (or all files if no `files` field, minus `.gitignore` entries). Markdown files in a `commands/` subdirectory may be excluded.
**How to avoid:** Add `"files": ["dist", "commands"]` to `packages/cli/package.json`. Verify with `npm pack --dry-run`.
**Warning signs:** `ccb setup` throws ENOENT errors after npm install.

### Pitfall 4: ESM Module Path Resolution
**What goes wrong:** `__dirname` is undefined in ESM modules. Code tries to find the `commands/` directory relative to the compiled JS file but fails.
**Why it happens:** The CLI uses `"type": "module"` and TypeScript with `"module": "NodeNext"`. `__dirname` doesn't exist in ESM.
**How to avoid:** Use `import.meta.dirname` (Node 21.2+) or `path.dirname(fileURLToPath(import.meta.url))`.
**Warning signs:** `ReferenceError: __dirname is not defined`.

### Pitfall 5: Command File Overwrite on Update
**What goes wrong:** `ccb setup` or `ccb import` overwrites user-modified command files without warning.
**Why it happens:** No version checking or diff comparison before copy.
**How to avoid:** By default, warn if files exist. Support `--force` to overwrite. Consider checking file content hash or a version comment in the command file header.
**Warning signs:** User complaints about lost customizations.

### Pitfall 6: Login Flow in Claude Code Context
**What goes wrong:** `ccb login` opens a browser for OAuth, but Claude Code's Bash tool can't handle the interactive flow (waiting for callback server).
**Why it happens:** The login flow starts an HTTP server on localhost and waits for a browser callback. When run from Bash tool, the browser may not open (headless environment) or the timeout may expire.
**How to avoid:** The command file prompt should instruct Claude to tell the user to run `ccb login` manually in their terminal first, OR detect that auth is missing and suggest the user authenticate. The `CCB_TOKEN` + `CCB_API_URL` environment variable path (D-11) is the better solution for CI/automated contexts.
**Warning signs:** Login times out after 2 minutes.

## Code Examples

Verified patterns from the existing codebase:

### Existing GSD Command File Format
```yaml
# Source: .claude/commands/gsd/note.md (actual project file)
---
name: gsd:note
description: Zero-friction idea capture. Append, list, or promote notes to todos.
argument-hint: "<text> | list | promote <N> [--global]"
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
---

[Markdown content with instructions for Claude]
```

### Bundle Command File Template (recommended)
```yaml
# Recommended pattern for /bundle:import
---
name: bundle:import
description: Import a public bundle into your account and apply it locally
argument-hint: "[owner/bundle-id]"
allowed-tools:
  - Bash
---

Import a bundle from the Claude Code Bundle platform.

## Prerequisites
Check if authenticated:
- Run: `cat ~/.claude/bundle-platform/auth.json 2>/dev/null`
- If file does not exist, tell the user they need to authenticate first.
  Suggest: run `npx @claude-code-bundles/cli login` in their terminal.

## Import
Run the import command with `--yes` flag for non-interactive execution:

If $ARGUMENTS is provided:
```
npx @claude-code-bundles/cli import $ARGUMENTS --yes
```

If no arguments, list the user's bundles:
```
npx @claude-code-bundles/cli remote list
```
Then ask the user which bundle to import.
```

### Non-Interactive Flag Pattern
```typescript
// Source: Recommended pattern based on existing pull.ts
// Add to pull.ts, import.ts, delete.ts
const nonInteractive = !process.stdin.isTTY || args.includes("--yes") || args.includes("-y");

if (nonInteractive) {
  // Skip confirm() prompts, default to proceeding
  // Skip checkbox() prompts, select all actionable items
} else {
  // Existing interactive flow
}
```

### Setup Command Pattern
```typescript
// Source: Recommended new file packages/cli/src/setup.ts
import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMMANDS_SRC = path.resolve(__dirname, "..", "commands", "bundle");
const COMMANDS_DEST = path.join(os.homedir(), ".claude", "commands", "bundle");

export async function runSetup(args: string[]): Promise<void> {
  const force = args.includes("--force");
  await mkdir(COMMANDS_DEST, { recursive: true });
  
  const files = await readdir(COMMANDS_SRC);
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const src = path.join(COMMANDS_SRC, file);
    const dest = path.join(COMMANDS_DEST, file);
    // Check existence, warn if not --force
    await cp(src, dest, { force });
    process.stdout.write(`Installed ${dest}\n`);
  }
  
  process.stdout.write(`\nBundle commands installed. Use /bundle:import, /bundle:pull, etc. in Claude Code.\n`);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.claude/commands/*.md` (flat) | `.claude/skills/<name>/SKILL.md` (directory) | 2025 (Claude Code evolution) | Skills are recommended but commands still work. Both support same frontmatter. |
| `name: gsd:command` format | `name: bundle:import` | Convention in this project | Colon-separated namespace maps to directory structure |

**Current state:**
- Claude Code now calls the extension system "skills" but `.claude/commands/` files still work identically with the same frontmatter support.
- The official docs state: "Custom commands have been merged into skills. A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way."
- The CONTEXT.md decisions specify `~/.claude/commands/bundle/` as the target, which is valid and simpler than the skills directory structure.
- Per decision D-09, the pattern follows the existing `.claude/commands/gsd/` structure in this project.

**Recommendation:** Stay with `.claude/commands/bundle/*.md` as decided (D-06, D-07, D-09). No benefit to switching to skills format for this use case since there are no supporting files needed.

## Open Questions

1. **npm Package Publishing**
   - What we know: `@claude-code-bundles/cli` is `"private": true` and not on npm registry.
   - What's unclear: Publishing timeline, npm org scope ownership, whether `private: true` should be removed.
   - Recommendation: Publishing is a prerequisite for the `npx` one-liner (D-05). Either publish before Phase 6 completion or add a plan task for it.

2. **Login Flow from Claude Code**
   - What we know: `ccb login` opens a browser + starts localhost callback server. This may not work cleanly from Bash tool.
   - What's unclear: Whether Claude Code's Bash tool can open a browser (via `open` package) and keep a server alive during the OAuth flow.
   - Recommendation: The command file prompt should detect auth absence and instruct the user to run login manually in their terminal. For automated/CI scenarios, `CCB_TOKEN` + `CCB_API_URL` env vars (D-11) are the fallback.

3. **browse Subcommand for CLI**
   - What we know: `/bundle:browse` is in scope (D-08). The browse API exists at `GET /api/bundles/public` with sort/tag/cursor params.
   - What's unclear: Whether `ccb browse` CLI subcommand already exists or needs creation.
   - Recommendation: It does not exist yet. Add `browse.ts` to CLI that calls the browse API and outputs formatted results. The command file delegates to `npx ccb browse`.

4. **`ccb import` Without Arguments**
   - What we know: D-08 says "no argument = list my bundles then select." This requires interactive prompt.
   - What's unclear: How to handle no-argument import in non-interactive (Claude Code) context.
   - Recommendation: In non-interactive mode, `ccb import` (no args) should list bundles as JSON/text output, and the command file prompt should instruct Claude to present the list to the user and ask them to choose, then re-invoke with the selected ID.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npx, CLI execution | Yes | (Claude Code environment) | -- |
| npm/npx | Package resolution, CLI execution | Yes | (bundled with Node.js) | -- |
| `@claude-code-bundles/cli` on npm | `npx` one-liner (D-05) | No (not published) | -- | Local build + path; must publish for production |
| Browser | OAuth login flow | Partial (may not work from Bash tool) | -- | `CCB_TOKEN` + `CCB_API_URL` env vars |

**Missing dependencies with no fallback:**
- `@claude-code-bundles/cli` npm publication is required for `npx` bootstrap to work. Must be addressed in plan.

**Missing dependencies with fallback:**
- Browser for OAuth login: fallback is env var authentication (D-11).

## Sources

### Primary (HIGH confidence)
- [Claude Code slash commands documentation](https://code.claude.com/docs/en/slash-commands) -- complete format specification, frontmatter fields, `$ARGUMENTS` substitution, skills vs commands equivalence
- Existing `.claude/commands/gsd/*.md` files in this project -- verified command file format
- `packages/cli/src/index.ts`, `pull.ts`, `import.ts`, `status.ts`, `remote.ts` -- existing CLI implementation
- `packages/cli/src/auth-store.ts`, `login.ts` -- auth flow implementation
- `06-CONTEXT.md` -- all locked decisions D-01 through D-13

### Secondary (MEDIUM confidence)
- `npm view @claude-code-bundles/cli version` -- confirmed package is not published (404)
- `packages/cli/package.json` -- confirmed `"private": true`, no `files` field

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- using existing project patterns, official Claude Code docs verified
- Architecture: HIGH -- direct mapping from CONTEXT.md decisions to implementation; all code patterns verified in codebase
- Pitfalls: HIGH -- TTY/interactive issue confirmed by code inspection of pull.ts/import.ts; npm publication confirmed missing

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable -- Claude Code command format is mature, project patterns are established)
