---
phase: 06-claude-code-integration
plan: 02
subsystem: cli
tags: [claude-code, slash-commands, npm-publishing, setup]

requires:
  - phase: 06-claude-code-integration/01
    provides: non-interactive CLI flags (--yes), browse subcommand
provides:
  - "/bundle:import, /bundle:pull, /bundle:status, /bundle:browse slash command files"
  - "ccb setup command to install command files to ~/.claude/commands/bundle/"
  - "Auto-install of command files on ccb import (D-04)"
  - "npm publishing readiness (files field, no private flag)"
affects: [npm-publish, user-onboarding]

tech-stack:
  added: []
  patterns: [slash-command-md-frontmatter, auto-install-side-effect]

key-files:
  created:
    - packages/cli/commands/bundle/import.md
    - packages/cli/commands/bundle/pull.md
    - packages/cli/commands/bundle/status.md
    - packages/cli/commands/bundle/browse.md
    - packages/cli/src/setup.ts
  modified:
    - packages/cli/src/index.ts
    - packages/cli/src/import.ts
    - packages/cli/package.json

key-decisions:
  - "setup command added after delete block (browse not yet wired in this branch)"
  - "installCommands(false) on import is non-fatal try/catch -- import must never fail due to command file issues"

patterns-established:
  - "Slash command .md format: YAML frontmatter (name, description, argument-hint, allowed-tools) + markdown body"
  - "Auth check pattern in commands: cat auth.json, direct user to run login in terminal if missing"

requirements-completed: [INT-02, INT-04, INT-05, INT-06]

duration: 3min
completed: 2026-04-02
---

# Phase 6 Plan 02: Slash Commands + Setup Summary

**Four /bundle:* Claude Code slash commands, ccb setup installer, auto-install on import, npm publishing prep**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-02T23:00:03Z
- **Completed:** 2026-04-02T23:02:38Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Four slash command .md files (import, pull, status, browse) with proper YAML frontmatter for Claude Code
- setup.ts with installCommands() that copies commands from npm package to ~/.claude/commands/bundle/
- Auto-install side-effect on ccb import (D-04) with non-fatal error handling
- package.json ready for npm publish: removed private flag, added files field including commands/

## Task Commits

Each task was committed atomically:

1. **Task 1: Create command .md files and setup.ts** - `93c62a2` (feat)
2. **Task 2: Add auto-install to import.ts and prepare package.json for npm** - `052a03e` (feat)

## Files Created/Modified
- `packages/cli/commands/bundle/import.md` - /bundle:import slash command with auth check + import flow
- `packages/cli/commands/bundle/pull.md` - /bundle:pull slash command with auth check + pull --yes
- `packages/cli/commands/bundle/status.md` - /bundle:status slash command with auth check + status display
- `packages/cli/commands/bundle/browse.md` - /bundle:browse slash command (no auth required) with flag docs
- `packages/cli/src/setup.ts` - installCommands() and runSetup() for copying .md files to user's Claude commands dir
- `packages/cli/src/index.ts` - Added setup subcommand wiring and usage text
- `packages/cli/src/import.ts` - Added auto-install of command files after successful import
- `packages/cli/package.json` - Removed private flag, added description and files field for npm publishing

## Decisions Made
- Setup command wired after the delete block since browse subcommand is not yet present in this branch (06-01 runs in parallel). This is compatible -- when 06-01 merges, both will coexist correctly.
- installCommands(false) called in import.ts is wrapped in try/catch to ensure import success is never blocked by command file installation failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted setup wiring position in index.ts**
- **Found during:** Task 1
- **Issue:** Plan specified adding setup after the browse block, but browse subcommand doesn't exist yet in this branch (06-01 parallel execution)
- **Fix:** Added setup block after the delete block instead
- **Files modified:** packages/cli/src/index.ts
- **Verification:** Build succeeds, setup subcommand reachable
- **Committed in:** 93c62a2

---

**Total deviations:** 1 auto-fixed (1 blocking adaptation)
**Impact on plan:** Minor positional adjustment. No functional impact.

## Issues Encountered
- Pre-existing test failures in worktree (tsx binary not found, snapshot hash mismatch) -- unrelated to this plan's changes. Not addressed per scope boundary rule.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all command files contain complete instructions, setup.ts is fully functional.

## Next Phase Readiness
- All four slash commands ready for Claude Code users
- npm package includes commands/ in tarball for distribution
- Auto-install ensures first-time importers get the commands automatically

## Self-Check: PASSED

All 8 files verified present. Both task commits (93c62a2, 052a03e) verified in git log.

---
*Phase: 06-claude-code-integration*
*Completed: 2026-04-02*
