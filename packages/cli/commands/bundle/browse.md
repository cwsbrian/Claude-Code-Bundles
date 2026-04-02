---
name: bundle:browse
description: Browse public bundles on the platform
argument-hint: "[--sort recent|popular|alphabetical] [--tag name]"
allowed-tools:
  - Bash
---

## Browse

No authentication is required for browsing.

If `$ARGUMENTS` is provided, run:

```
npx @claude-code-bundles/cli browse $ARGUMENTS
```

If no arguments were provided, run:

```
npx @claude-code-bundles/cli browse
```

Present the results to the user. For any bundle that looks interesting, suggest using `/bundle:import owner/bundle-id` to import it.

### Available Flags

- `--sort` -- Sort order: `recent` (default), `popular`, or `alphabetical`
- `--tag` -- Filter by tag name
- `--limit` -- Number of results (1-50, default 20)
