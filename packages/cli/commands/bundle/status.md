---
name: bundle:status
description: Compare local bundle versions with server
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

## Status

Run:

```
npx @claude-code-bundles/cli status
```

Present the output to the user. For any bundles showing "newer on server", suggest running `/bundle:pull` to sync them.
