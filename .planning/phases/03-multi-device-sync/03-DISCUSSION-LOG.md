# Phase 3: Multi-device sync - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 03-multi-device-sync
**Areas discussed:** Device tracking, Pull behavior, Conflict handling, Pull failure handling, Status command, Auth flow

---

## Device Tracking (Initial Selection)

User provided free-text response instead of selecting predefined gray areas:

**User's input:** "device 를 구지 tracking 하지는 않아도 될거같은데. 나의 번들은 내가 로그인한 계정과 연동되어있고 로그인했을때 그걸 땡기거나 새로 만드는거지, 몇개의 디바이스에서 이걸 하고있는지 아직은 제한할 필요는없으럭같아"

**Decision:** No device registration or per-device install tracking. Account-level access only. No device count limits.

---

## Pull Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Pull all my bundles | Downloads + applies every bundle in your account | |
| Pull by name/selection | User specifies which bundle(s) to pull | |
| Interactive list + select | Shows remote bundles, lets you pick which to install | ✓ |

**User's choice:** Interactive list + select
**Notes:** None

---

## Conflict Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Server wins (overwrite) | Always replace local with server version | |
| Prompt before overwrite | Show diff summary and ask before replacing | ✓ |
| Skip + warn | Don't overwrite, just warn | |

**User's choice:** Prompt — give choice to skip or overwrite
**Notes:** "overwrite 하기전에 초이스를 주면될거같아. skip 할껀지 덮어씌울껀지"

---

## CLI Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Extend `ccb remote` | Add `ccb remote pull` alongside existing commands | |
| New `ccb sync` group | `ccb sync pull`, `ccb sync status` | |
| Top-level `ccb pull` | Shortest path for most common operation | ✓ |

**User's choice:** `ccb pull` (top-level)
**Notes:** Initially unclear on question — clarified that this is about command naming/grouping.

---

## Pull Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Skip + continue | Failed bundle skipped, remaining install. Summary at end. | ✓ |
| Stop + report | Abort on first failure | |
| Auto-retry then skip | Retry 2-3 times, then skip | |

**User's choice:** Skip + continue
**Notes:** None

---

## Status Command

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, `ccb status` | Shows up-to-date / newer on server / local-only | ✓ |
| No, `ccb pull` handles it | Interactive pull list already shows this info | |

**User's choice:** Yes, `ccb status`
**Notes:** None

---

## Auth Flow

| Option | Description | Selected |
|--------|-------------|----------|
| `ccb login` → browser OAuth | Opens browser for Supabase Auth, stores token | ✓ |
| Manual token paste | Get token from web dashboard, paste with --token | |
| Both options | Browser default + --token for headless | |

**User's choice:** `ccb login` → browser OAuth
**Notes:** None

---

## Claude's Discretion

- Interactive list UI library choice
- Token storage location and format
- `ccb status` output format
- OAuth callback implementation
- Download progress display

## Deferred Ideas

- `devices` / `device_bundle_installs` tables — not needed for Phase 3
- `ccb login --token` for headless/CI — future
- Auto-retry on pull failure — future
- `ccb push` shortcut — separate discussion
