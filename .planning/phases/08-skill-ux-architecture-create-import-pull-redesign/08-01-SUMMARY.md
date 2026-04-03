---
phase: 08-skill-ux-architecture-create-import-pull-redesign
plan: 01
subsystem: cli
tags: [cli, import, dry-run, createWizard, readline, TTY, flags-only]

# Dependency graph
requires:
  - phase: 06-claude-code-integration
    provides: ccb import command, createWizard function, non-interactive CLI mode
provides:
  - "--dry-run flag in ccb import: prints file list and exits 0 without server copy or disk writes"
  - "flags-only createWizard: no readline/isTTY/nonInteractive code, safe in Claude Code Bash subprocess"
affects: [09-skills-delegation, future skill plans that call ccb import --dry-run, AskUserQuestion pattern]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "dry-run pattern: preview fetch still runs (validates bundle exists), early return before API mutation"
    - "flags-only wizard: env vars + CLI flags replace all interactive readline prompts"

key-files:
  created: []
  modified:
    - packages/cli/src/import.ts
    - packages/core/src/create-wizard.ts
    - src/lib/create-wizard.ts
    - packages/cli/src/index.ts

key-decisions:
  - "dry-run preview fetch still executes (validates bundle existence, shows contents_summary) before early return"
  - "createWizard always flags-only — no conditional TTY check, no fallback to readline"
  - "Both create-wizard.ts files updated identically (packages/core and src/lib are mirrors)"

patterns-established:
  - "CLI mutation guard: place dry-run check after all read/preview operations, before any POST/write"
  - "Flags-only functions: remove isTTY checks entirely; callers always pass explicit flags or env vars"

requirements-completed: [UX-01, UX-02]

# Metrics
duration: 4min
completed: 2026-04-03
---

# Phase 08 Plan 01: Skill UX Architecture — Dry Run + Flags-Only Wizard Summary

**--dry-run flag added to ccb import (prints file paths from contents_summary, no server copy) and TTY readline wizard removed from createWizard() in both packages/core and src/lib**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-03T23:03:31Z
- **Completed:** 2026-04-03T23:07:04Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `ccb import owner/slug --dry-run` now prints the full file install list (skills, commands, hooks) and exits 0 without creating a server-side private copy or writing anything to disk
- `createWizard()` in `packages/core/src/create-wizard.ts` and `src/lib/create-wizard.ts` is now flags-only — readline import removed, isTTY/nonInteractive block deleted, function never hangs in non-TTY environments
- `packages/cli/src/index.ts` usage string updated with `[--dry-run]` and createWizard call site cleaned of `stdin`/`stdout` props

## Task Commits

Each task was committed atomically:

1. **Task 1: Add --dry-run to ccb import** - `7bde244` (feat)
2. **Task 2: Remove TTY readline wizard from createWizard** - `f2eed48` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `packages/cli/src/import.ts` - Added `const dryRun = args.includes("--dry-run")` and early-return block after preview fetch+display, before import POST
- `packages/core/src/create-wizard.ts` - Removed readline import, stdin/stdout from WizardOptions, isTTY/nonInteractive/rl.question block; function now flags-only
- `src/lib/create-wizard.ts` - Identical TTY removal mirrored from packages/core version
- `packages/cli/src/index.ts` - Updated import usage line with `[--dry-run]`, removed `stdin:` and `stdout:` from createWizard call

## Decisions Made
- dry-run preview fetch still executes before the early return — this validates the bundle exists on the server and provides contents_summary for the file list output
- createWizard() always runs in flags-only mode — no conditional TTY check retained; callers are responsible for passing flags
- Both create-wizard.ts files updated identically to keep the mirror in sync

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Nx project graph failed during build verification because worktrees are detected as duplicate projects in the parallel execution environment. Used `tsc --noEmit` directly on each package as an equivalent verification (both exited 0). Root-level vitest tests pass; worktree-level test failures are pre-existing infrastructure issues (missing tsx binary in worktree node_modules), not related to these changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ccb import --dry-run is ready for skills to call as a preview step before using AskUserQuestion to confirm installation
- createWizard() is safe to call from Claude Code Bash subprocesses (no TTY dependency)
- Remaining plans in Phase 08 can build on these primitives

## Self-Check: PASSED

- FOUND: packages/cli/src/import.ts
- FOUND: packages/core/src/create-wizard.ts
- FOUND: src/lib/create-wizard.ts
- FOUND: 08-01-SUMMARY.md
- FOUND commit: 7bde244
- FOUND commit: f2eed48

---
*Phase: 08-skill-ux-architecture-create-import-pull-redesign*
*Completed: 2026-04-03*
