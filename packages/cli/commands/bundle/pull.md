---
name: bundle:pull
description: Sync all remote bundles to local machine
allowed-tools:
  - Bash
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

Run:

```
npx @claude-code-bundles/cli pull --yes
```

Report the results -- how many bundles were synced, any that were skipped, and any errors encountered.
