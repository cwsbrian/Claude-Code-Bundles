---
phase: 01-spec-local-bundle-mvp
verified: 2026-03-31T12:20:00Z
status: passed
score: 4/4
re_verification: null
gaps: []
human_verification: []
---

# Phase 1: Spec + local bundle MVP — Verification Report

**Phase goal:** 서버 없이 번들의 핵심 가치(재현 가능한 pack/apply)를 증명한다.  
**Verified:** 2026-03-31T12:20:00Z  
**Status:** passed  
**Re-verification:** No (initial)

## Goal achievement (ROADMAP success criteria)

| # | Truth (ROADMAP) | Status | Evidence |
|---|-----------------|--------|----------|
| 1 | 문서만 보고도 동일한 `bundle.json` 스키마와 lineage 정책을 구현할 수 있다. | ✓ VERIFIED | `docs/spec/bundle-json.md`, `docs/spec/lineage-policy.md`, `schemas/bundle-1.0.0.schema.json` present; `gsd-tools verify artifacts` 5/5 passed; D-01–D-03 and D-04 fields documented. |
| 2 | Golden fixture로 pack→unpack 후 스냅샷 동등성이 검증된다. | ✓ VERIFIED | `tests/fixtures/golden-bundle/`, `EXPECTED_SNAPSHOT_ID.txt`; `tests/pack-unpack.test.ts` CLI-02 / D-05 case passes. |
| 3 | `apply` 후 Claude Code가 기대하는 로컬 레이아웃이 생성된다. | ✓ VERIFIED | `apply` writes under `~/.claude/` (`skills`, `hooks`, `commands`, `templates`, `bundles/<id>/bundle.json`) per `docs/spec/tool-path-mapping.md`; `tests/apply-lint-e2e.test.ts` + `scripts/e2e-local.sh` assert installed manifest and `list`. |
| 4 | 시크릿 lint가 의도된 샘플에 대해 경고 또는 차단을 일으킨다. | ✓ VERIFIED | `src/lib/lint.ts` D-09–D-11; `tests/lint.test.ts` and E2E second case: private → exit 0 with findings, public → exit 1. |

**Score:** 4/4 roadmap success criteria verified.

## Plan must_haves vs artifacts

### 01-01 (SPEC-01 — TOOL-01)

| Artifact | Status | Notes |
|----------|--------|-------|
| `docs/spec/bundle-json.md` | ✓ | Normative fields + link to schema path. |
| `schemas/bundle-1.0.0.schema.json` | ✓ | Valid JSON Schema 2020-12; `const` 1.0.0. |
| `docs/spec/lineage-policy.md` | ✓ | SPEC-02 + D-04 inventory. |
| `docs/spec/cli-surface.md` | ✓ | D-12 commands documented. |
| `docs/spec/tool-path-mapping.md` | ✓ | TOOL-01 table (≥4 rows). |

**Key link (schema ↔ doc):** `gsd-tools verify key-links` expects imports from `.json` → `.md` and reports false; **manual:** `bundle-json.md` references `schemas/bundle-1.0.0.schema.json` and field lists align with schema `required`/`properties`.

### 01-02 (CLI-01, CLI-02)

| Artifact | Status | Notes |
|----------|--------|-------|
| `src/lib/snapshot-hash.ts` | ✓ | D-06 exclusions documented. |
| `src/lib/pack.ts` / `src/lib/unpack.ts` | ✓ | Zip payload from manifest; used by CLI and tests. |
| `tests/fixtures/golden-bundle/` | ✓ | Manifest + payload + expected snapshot id. |
| `tests/pack-unpack.test.ts` | ✓ | Deterministic hash + golden round-trip. |

**Key link note:** `pack.ts` does not import `snapshot-hash.ts` (hash is applied to unpacked/file lists in tests and for equivalence). **Semantic link** for D-05/D-06 is satisfied by `computeSnapshotId` + golden test, not an import edge.

### 01-03 (CLI-03, CLI-04)

| Artifact | Status | Notes |
|----------|--------|-------|
| `src/lib/apply.ts` | ✓ | `~/.claude` targets match mapping doc; `--force` conflict behavior. |
| `src/lib/lint.ts` | ✓ | `visibility` gates `blocking` (D-10). |
| `tests/apply-lint-e2e.test.ts` | ✓ | Isolated `HOME`; create → validate → pack → lint → apply → list. |
| `scripts/e2e-local.sh` | ✓ | Same sequence; exited 0 when run. |

**Key link note:** `apply.ts` does not import `tool-path-mapping.md`; **manual:** component directory names match the Claude column in `docs/spec/tool-path-mapping.md`.

## Requirements coverage

| ID | Plan | Description (REQUIREMENTS.md) | Status | Evidence |
|----|------|-------------------------------|--------|----------|
| SPEC-01 | 01-01 | Schema documented + fixed in repo | ✓ | `bundle-json.md`, `bundle-1.0.0.schema.json` |
| SPEC-02 | 01-01 | Import/lineage policy | ✓ | `lineage-policy.md` |
| SPEC-03 | 01-01 | CLI/API surface | ✓ | `cli-surface.md` |
| TOOL-01 | 01-01 | Tool mapping table | ✓ | `tool-path-mapping.md` |
| CLI-01 | 01-02 | Pack workspace to archive | ✓ | CLI + `pack-unpack` tests |
| CLI-02 | 01-02 | Unpack + snapshot equivalence | ✓ | Golden fixture test |
| CLI-03 | 01-03 | Apply to Claude paths | ✓ | `apply.ts`, E2E |
| CLI-04 | 01-03 | Secret lint | ✓ | `lint.ts`, `lint.test.ts`, fixtures |

All eight IDs appear in plan `requirements` frontmatter; none orphaned vs REQUIREMENTS.md Phase 1 rows.

## Behavioral spot-checks

| Check | Command | Result |
|-------|---------|--------|
| Full unit/integration tests | `npm test` | 7/7 passed |
| Local E2E script | `bash scripts/e2e-local.sh` | Exit 0 |

## Anti-patterns

No `TODO`/`FIXME`/placeholder hits under `src/`. No blocker stubs found in reviewed paths.

## Gaps summary

None. Automated `gsd-tools verify key-links` false negatives on documentation and cross-media links were overridden by manual verification above.

---

_Verified: 2026-03-31T12:20:00Z_  
_Verifier: gsd-verifier (goal-backward)_  
