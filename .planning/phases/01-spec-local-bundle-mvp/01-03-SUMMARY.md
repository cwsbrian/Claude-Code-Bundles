---
phase: 01-spec-local-bundle-mvp
plan: 03
subsystem: cli
tags: [cli, manifest, lint, apply, e2e]
requires:
  - phase: 01-02
    provides: pack/unpack archive primitives and deterministic snapshot baseline
provides:
  - local CLI surface for create, apply, install, list, lint, and manifest validate
  - local secret scanning with public block and private warning behavior
  - isolated-HOME E2E workflow proving create -> validate -> pack -> lint -> apply -> list
affects: [phase-01-verification, local-mvp]
tech-stack:
  added: []
  patterns: [schema-first manifest validation, local-only archive secret scanning, isolated HOME e2e]
key-files:
  created:
    - src/lib/manifest-validate.ts
    - src/lib/create-wizard.ts
    - src/lib/registry.ts
    - src/lib/apply.ts
    - src/lib/lint.ts
    - tests/lint.test.ts
    - tests/apply-lint-e2e.test.ts
    - scripts/e2e-local.sh
  modified:
    - src/cli/index.ts
    - package.json
key-decisions:
  - "Lint requires explicit --manifest path to enforce D-10 policy from validated manifest visibility."
  - "Apply updates the local registry so list reflects applied snapshots in the CLI-03/CLI-04 E2E path."
patterns-established:
  - "CLI subcommands resolve args via small parse helpers and return typed option objects."
  - "E2E uses per-test HOME overrides to keep ~/.claude effects isolated."
requirements-completed: [CLI-03, CLI-04]
duration: 20 min
completed: 2026-03-31
---

# Phase 01 Plan 03: Local CLI apply/lint completion Summary

**Manifest validation, create/apply/install/list workflows, and local secret linting now run end-to-end with isolated HOME verification and reproducible shell automation.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-31T12:10:00Z
- **Completed:** 2026-03-31T12:30:00Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- Implemented CLI command surface required by D-12 with `create`, `manifest validate`, `apply`, `install`, `list`, and `lint`.
- Added local registry + apply/install path materialization under `~/.claude/...` with `--force` conflict control.
- Added archive-wide local lint engine for high-confidence patterns and visibility-aware blocking behavior.
- Added secret sample fixtures, dedicated lint tests, and full isolated-HOME E2E tests + shell script.

## Task Commits

Each task was committed atomically:

1. **Task 1: manifest validate, create, install, list, apply** - `d4a2cbe` (feat)
2. **Task 2: lint engine (CLI-04, D-09–D-11)** - `72258db` (feat)
3. **Task 3: secret fixtures + apply/lint E2E + e2e-local.sh** - `b4cbe76` (feat)

**Plan metadata:** pending

## Files Created/Modified
- `src/lib/manifest-validate.ts` - AJV-backed manifest validation and loader.
- `src/lib/create-wizard.ts` - interactive/non-interactive manifest creation flow.
- `src/lib/registry.ts` - local install registry management under `~/.claude/bundle-platform`.
- `src/lib/apply.ts` - `~/.claude` target materialization with conflict checks.
- `src/lib/lint.ts` - archive-wide local secret/risky filename scanner with visibility gating.
- `src/cli/index.ts` - command wiring for create/apply/install/list/lint/manifest validate.
- `tests/lint.test.ts` - public-block/private-warn unit checks.
- `tests/apply-lint-e2e.test.ts` - isolated HOME flow test from create to list.
- `tests/fixtures/secret-samples/*` - synthetic secret fixtures for lint behavior assertions.
- `scripts/e2e-local.sh` - single-command local reproduction of the same ordered E2E path.

## Decisions Made
- Used schema validation against `schemas/bundle-1.0.0.schema.json` for `manifest validate` instead of ad-hoc key checks.
- Kept lint entirely local and archive-wide with fixed high-confidence rules (`sk-...`, `AKIA...`, risky basenames).
- Updated registry on `apply` as well as `install` so `list` reflects the main E2E flow required by this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added registry update on `apply`**
- **Found during:** Task 3 (end-to-end flow verification)
- **Issue:** `list` could not show applied bundle state when flow used `apply` directly.
- **Fix:** Added `updateRegistry` call in `apply` command path.
- **Files modified:** `src/cli/index.ts`
- **Verification:** `tests/apply-lint-e2e.test.ts` primary flow passes and `list` includes `e2e-bundle`.
- **Committed in:** `b4cbe76` (part of Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Fix was required to satisfy the mandated create -> ... -> apply -> list evidence path; no scope creep.

## Issues Encountered
- Ajv ESM constructor import interop failed under current TS/Node module settings; resolved by loading Ajv constructor via `createRequire`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 01 plan set is now complete with task-level commits and automated evidence for CLI-03 and CLI-04.
- Ready for the next workflow step (`/gsd-verify-work` or phase transition planning).

---
*Phase: 01-spec-local-bundle-mvp*
*Completed: 2026-03-31*

## Self-Check: PASSED
- Found `.planning/phases/01-spec-local-bundle-mvp/01-03-SUMMARY.md`.
- Verified task commits exist: `d4a2cbe`, `72258db`, `b4cbe76`.
