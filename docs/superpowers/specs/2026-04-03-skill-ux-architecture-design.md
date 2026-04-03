# Skill UX Architecture Design

**Date:** 2026-04-03
**Status:** Approved
**Scope:** bundle:create, bundle:import, bundle:pull skill redesign

## Problem

The current `bundle:create` skill has three issues:
1. AI intermediates between user and CLI, asking questions step-by-step (multi-turn)
2. CLI has a duplicate TTY readline wizard that doesn't work from Claude Code (no TTY in Bash tool subprocesses)
3. `bundle:import` and `bundle:pull` apply files to `~/.claude/` without user review

## Architecture Principle

**CLI = execution engine.** No interactive prompts. All input via flags.

**Skill = UX layer.** AskUserQuestion, confirmation, file preview. All user interaction here.

**Security:** AI does not interpret bundle file contents — shows raw text to user in code blocks. User makes the final judgment. Deep security analysis (pattern matching, injection detection) is deferred to Phase 7.

## Command Tiers

| Tier | Commands | Reason |
|------|----------|--------|
| Skill-required | create, import, pull | Writes to `~/.claude/`, user judgment needed |
| CLI-fine | browse, status, list, pack, unpack, lint | Read-only or technical |
| CLI-only | login, logout, setup | Needs browser / system access |

## Skill Flows

### bundle:create

```
/bundle:create [name]
  IF name provided:
    → AskUserQuestion(visibility, components)  ← 1 turn
    → ccb create --name X --visibility Y --items Z

  IF name not provided:
    → "번들 이름?" (plain text)               ← turn 1
    → AskUserQuestion(visibility, components)  ← turn 2
    → ccb create --name X --visibility Y --items Z
```

AskUserQuestion for components uses `multiSelect: true` with options: skills, hooks, commands, templates.

### bundle:import

```
/bundle:import [owner/slug]
  IF no owner/slug:
    → ccb remote list
    → AskUserQuestion: which bundle to import?

  → ccb import owner/slug --dry-run    ← outputs file list, no install
  → skill shows file list in code blocks (no AI interpretation)
  → AskUserQuestion: "설치할까요?"
  → IF approved: ccb import owner/slug --yes
  → IF rejected: abort, inform user
```

**Safety note:** File contents shown as raw text to user. AI does not evaluate safety — user decides. This pattern prevents prompt injection via malicious bundle files.

### bundle:pull

```
/bundle:pull
  → ccb status                         ← local vs remote diff (user's own bundles only)
  → IF no changes: "최신 상태예요", exit
  → IF changes: show which bundles will be updated
  → AskUserQuestion: "동기화할까요?"
  → IF approved: ccb pull --yes
```

Pull is lower risk than import (own bundles only), so no file-level preview needed — status diff is sufficient.

## CLI Changes

### Add
- `ccb import --dry-run <owner/slug>` — prints file list that would be installed, exits without applying

### Remove
- TTY readline wizard from `create-wizard.ts` — flags-only path already exists, wizard is dead code when called from Claude Code

### Keep (already exist)
- `ccb import --yes`
- `ccb pull --yes`
- `ccb status`

## Skill File Changes

All skill files live in `packages/cli/commands/bundle/` (included in npm package):

| File | Change |
|------|--------|
| `create.md` | New — name from args, single AskUserQuestion, flags to CLI |
| `import.md` | Modify — add dry-run preview + AskUserQuestion confirmation |
| `pull.md` | Modify — add status check + AskUserQuestion confirmation |

## Out of Scope

- **Plugin-based bundling** (deferred, schema v2) — selecting installed plugins (gsd, superpowers) as bundle components. Captured in Phase 6 CONTEXT deferred section.
- **Deep security scanning** (Phase 7) — deterministic pattern matching for secrets and prompt injection in bundle contents.
- **`bundle:publish`** (post Phase 6) — already deferred in Phase 6 CONTEXT.
