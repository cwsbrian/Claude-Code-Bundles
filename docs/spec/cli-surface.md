# Phase 1 CLI Surface (SPEC-03, D-12 to D-16)

This document defines the official command surface for the local bundle MVP.

## Official Commands (D-12)

- `create`
- `pack`
- `unpack`
- `apply`
- `install`
- `list`
- `lint`
- `manifest validate`

## Command Behavior Notes

### `create` (D-14)

Creates a new bundle manifest through a terminal multi-step flow (sequential prompts and numeric selection). Primary output is an initialized `bundle.json` and referenced local files.

### `pack` (D-13)

Builds a local bundle archive from manifest + payload pointers. If no valid manifest exists for manual flow, `pack` MUST fail with guidance. CI automation may pass an explicit manifest path.

### `unpack`

Expands a local bundle archive to a workspace directory while preserving normalized bundle contents needed for reproducibility checks.

### `apply` (D-07, D-08)

Applies bundle components to the user root `~/.claude/...` target. Default behavior is fail on conflict; `--force` allows overwrite.

### `install` (D-15, D-16)

Installs from local archive/path only in Phase 1, applies into `~/.claude/...`, and updates local install/registry metadata.

### `list` (D-16)

Reads local registry entries plus installed snapshot/state information. It does not include remote account inventory in Phase 1.

### `lint`

Runs local-only checks for secrets/risky patterns and enforces visibility-sensitive policy for public/private packaging.

### `manifest validate`

Validates manifest structure and schema compatibility (`schema_version` and required fields) before pack/install flows.

## Remote (Phase 2, D-16)

Authenticated calls to the deployed **Next.js** bundle API. Env vars (canonical names):

- **`CCB_API_URL`** — origin of the app (e.g. `https://app.example.com` or `http://localhost:3000`)
- **`CCB_ACCESS_TOKEN`** — Supabase **user** JWT (`Authorization: Bearer` on every request)

`SUPABASE_ACCESS_TOKEN` is accepted as an alias for the token only where documented in CLI help.

### `remote upload`

- **`--archive` / `-a`** — path to `.zip`
- **`--manifest` / `-m`** — optional `bundle.json`; default is `bundle.json` next to the zip
- **`--api-url`** — overrides `CCB_API_URL`
- **`--token` / `-t`** — overrides `CCB_ACCESS_TOKEN`

Multipart fields **`manifest`** (JSON) and **`archive`** (zip) must match the server.

### `remote list`

JSON list of the caller’s bundles and snapshots (`GET /api/bundles`).

### `remote download`

- **`--bundle` / `-b`** — internal bundle UUID from upload/list response
- **`--snapshot` / `-s`** — snapshot UUID
- **`--out` / `-o`** — destination path for the zip

Streams **`GET /api/bundles/:bundleId/snapshots/:snapshotId/download`**.

## Reserved for Future Phases

The following names are reserved for later remote sync semantics:

- `sync`
- `pull`
- `push`
