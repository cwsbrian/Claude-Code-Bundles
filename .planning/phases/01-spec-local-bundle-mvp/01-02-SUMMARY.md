---
phase: 01-spec-local-bundle-mvp
plan: 02
subsystem: testing
tags: [cli, typescript, vitest, zip, snapshot-hash]
requires:
  - phase: 01-01
    provides: Phase 1 specs and schema contract
provides:
  - Node/TypeScript CLI surface with `pack` and `unpack`
  - D-05/D-06 normalized snapshot hashing implementation
  - Golden fixture regression proving CLI-02 round-trip equivalence
affects: [cli, pack-unpack, fixture-regression]
tech-stack:
  added: [typescript, vitest, adm-zip]
  patterns: [normalized snapshot hashing, fixture-based CLI round-trip assertions]
key-files:
  created:
    - package.json
    - src/lib/snapshot-hash.ts
    - tests/fixtures/golden-bundle/manifest.json
    - tests/pack-unpack.test.ts
  modified:
    - src/cli/index.ts
    - src/lib/pack.ts
    - src/lib/unpack.ts
key-decisions:
  - "Use zip archives via adm-zip while comparing normalized snapshot hashes instead of archive bytes."
  - "Use Unicode NFC path normalization and sorted path+content hashing for deterministic D-05/D-06 identity."
patterns-established:
  - "Pack/unpack correctness is asserted with fixture round-trip tests and fixed expected snapshot IDs."
requirements-completed: [CLI-01, CLI-02]
duration: 0h 6m
completed: 2026-03-31
---

# Phase 01 Plan 02: CLI Pack/Unpack Summary

**TypeScript CLI pack/unpack implementation with deterministic snapshot hashing and a committed golden fixture round-trip proof for CLI-02.**

## Performance

- **Duration:** 0h 6m
- **Started:** 2026-03-31T19:02:57Z
- **Completed:** 2026-03-31T19:08:40Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- Added executable CLI foundation (`ccb`) with `pack`/`unpack` argument parsing and manifest validation gate for D-13.
- Implemented normalized snapshot hashing (`computeSnapshotId`) excluding mtime/compression/OS metadata per D-06.
- Implemented zip-based `pack` and `unpack` libraries and validated deterministic output with unit tests.
- Added `tests/fixtures/golden-bundle/` and a CLI-02/D-05 regression test asserting normalized round-trip equality.

## Task Commits

Each task was committed atomically:

1. **Task 1: package.json + tsconfig + CLI pack/unpack stubs** - `ce5e5f0` (feat)
2. **Task 2: snapshot-hash + pack/unpack libraries (D-05, D-06)** - `004ab7f` (test, RED), `ff9d6a9` (feat, GREEN)
3. **Task 3: golden fixture + CLI-02 round-trip assertion** - `b43b4e1` (feat)

## Files Created/Modified
- `package.json` - Node/TypeScript CLI scripts, runtime deps, and bin target
- `tsconfig.json` - NodeNext TypeScript build output configuration
- `src/cli/index.ts` - Command parsing with `pack`/`unpack` and manifest checks
- `src/lib/snapshot-hash.ts` - Deterministic path+content hash engine
- `src/lib/pack.ts` - Zip creation from manifest `payload_path`
- `src/lib/unpack.ts` - Zip extraction preserving relative paths
- `tests/pack-unpack.test.ts` - Deterministic hash, round-trip, and golden fixture assertions
- `tests/fixtures/golden-bundle/*` - Stable fixture payload, manifest, and expected snapshot ID

## Decisions Made
- Selected zip as the archive format while making correctness depend on normalized snapshot IDs rather than byte-identical archives.
- Implemented lightweight manifest validation in CLI for this phase and retained full shape checks aligned to schema-required fields.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript rootDir/include conflict during Task 1 build**
- **Found during:** Task 1
- **Issue:** Including `vitest.config.ts` under a `rootDir` of `src` caused `tsc` failure.
- **Fix:** Scoped compile include to `src/**/*.ts` and moved test verification to vitest execution.
- **Files modified:** `tsconfig.json`
- **Verification:** `npm run build`
- **Committed in:** `ce5e5f0`

**2. [Rule 3 - Blocking] Missing type declarations for `adm-zip` during Task 2**
- **Found during:** Task 2
- **Issue:** TypeScript build failed due to missing declaration files.
- **Fix:** Added `@types/adm-zip` development dependency.
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm run build`
- **Committed in:** `ff9d6a9`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Fixes were strictly required to keep build/test verification green; no scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CLI-01 and CLI-02 are covered by automated tests and deterministic fixture assertions.
- Ready for `01-03-PLAN.md` (apply/install/list/lint behaviors and additional verification).

## Self-Check: PASSED

- Found `.planning/phases/01-spec-local-bundle-mvp/01-02-SUMMARY.md`.
- Verified task commits exist in git history: `ce5e5f0`, `004ab7f`, `ff9d6a9`, `b43b4e1`.
