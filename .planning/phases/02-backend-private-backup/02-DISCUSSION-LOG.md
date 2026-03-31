# Phase 2: Backend + private backup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.  
> Decisions are captured in `02-CONTEXT.md`.

**Date:** 2026-03-31  
**Phase:** 02-backend-private-backup  
**Session type:** Non-interactive capture (user invoked `/gsd-discuss-phase 2` without per-area selection in follow-up messages).

**Rationale:** Gray areas for this phase (repo layout, auth transport, upload wire format, download strategy, idempotent snapshot policy, server lint strictness, CLI subcommand surface) were resolved using **locked constraints** from `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` (BE/API/SEC), `docs/superpowers/specs/2026-03-31-claude-code-bundle-platform-design.md`, and **Phase 1** context/code (`manifest-validate`, `snapshot-hash`, zip archive convention). If any choice below should change, edit `02-CONTEXT.md` before `/gsd-plan-phase 2`.

---

## Would-have-been discussion areas → captured defaults

| Area | Default locked in CONTEXT |
|------|---------------------------|
| Vercel app shape | Next.js App Router under `apps/web`, Route Handlers for API |
| Auth | Supabase Auth; Bearer token to API; service role server-only |
| Upload encoding | multipart zip archive to API (no direct Storage from client) |
| Manifest validation | Same JSON Schema; share `src/lib/manifest-validate.ts` when possible |
| Server secret scan | Reject high-confidence secrets on upload; structured 4xx + guidance |
| Duplicate uploads | Idempotent by normalized snapshot hash |
| RLS | Enforce SEC-01; private owner-only for Phase 2 |
| CLI coupling | Subcommand under `ccb` / `remote` TBD in plan |

## Claude's Discretion

See **Claude's Discretion** subsection in `02-CONTEXT.md`.

## Deferred Ideas

See `<deferred>` in `02-CONTEXT.md`.
