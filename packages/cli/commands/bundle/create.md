---
name: bundle:create
description: Create a new bundle
argument-hint: "[bundle-name]"
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

## Create Bundle

### Branch A — name provided in `$ARGUMENTS`

If `$ARGUMENTS` is non-empty, use it as the bundle name directly. **Do NOT ask for the name.**

Skip straight to asking for visibility and components (one turn):

Use the AskUserQuestion tool with these two questions at once:

**Question 1:**
- header: "Visibility"
- question: "Who should have access?"
- multiSelect: false
- options:
  - label: "private", description: "Only you (default)"
  - label: "public", description: "Anyone can install"

**Question 2:**
- header: "Components"
- question: "Which components to include?"
- multiSelect: true
- options:
  - label: "skills", description: "Slash command skills (.md files)"
  - label: "hooks", description: "Lifecycle hooks"
  - label: "commands", description: "Custom commands"
  - label: "templates", description: "Project templates"

Map selected components to numbers: skills=1, hooks=2, commands=3, templates=4.
If none selected, default to all (1,2,3,4).

Run:

```
npx @claude-code-bundles/cli create --name "$ARGUMENTS" --visibility <private|public> --items <n,n,n>
```

Report:
- File path of `bundle.json`
- Bundle ID and name
- Visibility and components included

---

### Branch B — no `$ARGUMENTS`

If `$ARGUMENTS` is empty:

**Step 1:** Ask as plain text: **"번들 이름이 뭐예요?"** Wait for the user's reply.

**Step 2:** Use the AskUserQuestion tool with the same two questions as Branch A (one call):

**Question 1:**
- header: "Visibility"
- question: "Who should have access?"
- multiSelect: false
- options:
  - label: "private", description: "Only you (default)"
  - label: "public", description: "Anyone can install"

**Question 2:**
- header: "Components"
- question: "Which components to include?"
- multiSelect: true
- options:
  - label: "skills", description: "Slash command skills (.md files)"
  - label: "hooks", description: "Lifecycle hooks"
  - label: "commands", description: "Custom commands"
  - label: "templates", description: "Project templates"

**Step 3:** Map selected components to numbers: skills=1, hooks=2, commands=3, templates=4.
If none selected, default to all (1,2,3,4).

Run:

```
npx @claude-code-bundles/cli create --name "<name-from-user>" --visibility <private|public> --items <n,n,n>
```

Report:
- File path of `bundle.json`
- Bundle ID and name
- Visibility and components included
