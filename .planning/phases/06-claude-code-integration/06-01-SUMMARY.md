---
phase: 06-claude-code-integration
plan: 01
subsystem: cli
tags: [cli, non-interactive, tty-detection, browse-api, inquirer]

# Dependency graph
requires:
  - phase: 05-discovery-operational-beta
    provides: GET /api/bundles/public browse API
  - phase: 03-multi-device-sync
    provides: pull, import, delete CLI commands with @inquirer/prompts
provides:
  - Non-interactive mode (--yes/-y, TTY detection) for pull, import, delete
  - browse CLI subcommand calling /api/bundles/public
affects: [06-claude-code-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [non-interactive CLI via TTY detection and --yes flag]

key-files:
  created:
    - packages/cli/src/browse.ts
  modified:
    - packages/cli/src/pull.ts
    - packages/cli/src/import.ts
    - packages/cli/src/delete.ts
    - packages/cli/src/index.ts

key-decisions:
  - "nonInteractive detection uses !process.stdin.isTTY || --yes || -y for Claude Code Bash tool compatibility"
  - "browse subcommand resolves API URL from flag > env > stored auth for zero-config usage after login"

patterns-established:
  - "Non-interactive flag pattern: const nonInteractive = !process.stdin.isTTY || args.includes('--yes') || args.includes('-y')"
  - "Browse tabular output pattern with padEnd columns matching status.ts style"

requirements-completed: [INT-01, INT-03]

# Metrics
duration: 2min
completed: 2026-04-02
---

# Phase 6 Plan 01: Non-Interactive CLI + Browse Subcommand Summary

**TTY-aware --yes flag for pull/import/delete commands and tabular browse subcommand calling /api/bundles/public**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-02T22:56:07Z
- **Completed:** 2026-04-02T22:58:05Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- All three interactive commands (pull, import, delete) now support --yes/-y flag and auto-detect non-TTY environments
- New `ccb browse` subcommand outputs public bundles in tabular format with --sort, --tag, --limit, --cursor flags
- CLI build passes with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add non-interactive mode to pull.ts, import.ts, delete.ts** - `f22fee6` (feat)
2. **Task 2: Create browse.ts CLI subcommand and wire into index.ts** - `696a3f6` (feat)

## Files Created/Modified
- `packages/cli/src/pull.ts` - Added nonInteractive flag; conditional checkbox and confirm calls
- `packages/cli/src/import.ts` - Added nonInteractive flag; conditional confirm on 409 duplicate
- `packages/cli/src/delete.ts` - Added nonInteractive flag; conditional confirm on delete
- `packages/cli/src/browse.ts` - New file: browse subcommand calling GET /api/bundles/public with tabular output
- `packages/cli/src/index.ts` - Wired browse command dispatch and usage help

## Decisions Made
- nonInteractive detection uses `!process.stdin.isTTY || args.includes("--yes") || args.includes("-y")` -- covers both Claude Code Bash tool (no TTY) and explicit opt-in
- browse subcommand resolves API URL from flag > env > stored auth for zero-config usage after login
- In non-interactive mode: pull auto-selects all actionable bundles, import auto-overwrites on 409, delete auto-confirms

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures unrelated to this plan's changes (pack-unpack golden hash mismatch, apply-lint e2e timeout due to missing tsx binary in worktree). These do not affect CLI source changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CLI is now non-interactive-ready for Claude Code command file integration (Plan 02)
- browse subcommand available for /bundle:browse command file

---
*Phase: 06-claude-code-integration*
*Completed: 2026-04-02*
