---
name: bundle:pull
description: Sync your remote bundles to local machine
allowed-tools:
  - Bash
  - AskUserQuestion
---

## Auth Check

Run:

```
cat ~/.claude/bundle-platform/auth.json 2>/dev/null
```

If the file is missing or empty, tell the user:

> You are not logged in. Please run `npx @claude-code-bundles/cli login` **in your terminal** (not here -- it requires an interactive browser flow).

Then STOP. Do not proceed until the user confirms they have logged in.

## Pull

**Step 1 — Check status**

Run:

```
npx @claude-code-bundles/cli status
```

**Step 2 — No-change path**

If the status output is empty, indicates everything is up to date, or contains no bundle entries with pending changes, report:

> 최신 상태예요 — 동기화할 내용이 없어요.

Then STOP. Do not run pull.

**Step 3 — Changes path**

If there are bundles to update, show the status output to the user so they can see which bundles will be changed.

**Step 4 — Ask for confirmation**

Use AskUserQuestion with a single-select question:

- question: "동기화할까요?"
- multiSelect: false
- options:
  - label: "네, 동기화해요", description: "Pull updates for all changed bundles"
  - label: "아니요, 취소", description: "Cancel — nothing will be changed"

**Step 5 — Execute or abort**

- If the user selected "네, 동기화해요": run:

  ```
  npx @claude-code-bundles/cli pull --yes
  ```

  Report how many bundles were synced, any that were skipped, and any errors encountered.

- If the user selected "아니요, 취소": inform the user that sync was cancelled. Do not run any further commands.
