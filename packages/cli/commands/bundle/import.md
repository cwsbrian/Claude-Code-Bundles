---
name: bundle:import
description: Import a public bundle into your account and apply it locally
argument-hint: "[owner/bundle-id]"
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

## Import

If `$ARGUMENTS` is provided (e.g., `owner/bundle-id`):

```
npx @claude-code-bundles/cli import $ARGUMENTS --yes
```

If no arguments were provided, first list available public bundles:

```
npx @claude-code-bundles/cli remote list
```

Present the list to the user and ask which bundle they want to import. Once they choose, run:

```
npx @claude-code-bundles/cli import <chosen-owner/bundle-id> --yes
```

Report the result -- which bundle was imported and where it was applied.
