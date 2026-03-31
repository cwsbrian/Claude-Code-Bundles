# `bundle.json` Specification (SPEC-01)

This document defines the Phase 1 canonical bundle manifest filename: `bundle.json`.

## Versioning Rules

- **Decision D-01:** `schema_version` starts at `1.0.0`.
- **Decision D-02:** If a processor encounters a **major** schema mismatch, it MUST fail with a **non-zero exit** code.
- **Decision D-03:** If a processor encounters a **minor** or **patch** mismatch, it SHOULD warn and continue processing.

## Phase 1 Document Shape

Top-level fields for local bundle MVP:

- `schema_version` (required, string): Must be `1.0.0` for this schema.
- `bundle_id` (required, string): Stable bundle identifier.
- `name` (required, string): Human-friendly bundle name.
- `visibility` (required, enum): `private` or `public` (used by lint policy in D-10).
- `version` (required, string): Bundle release/version string for the payload itself.
- `manifest_path` (required, string): Relative path to bundle manifest metadata.
- `payload_path` (required, string): Relative path to packed payload/archive input.
- `description` (optional, string): Human-readable description.
- `lineage` (optional, object): Lineage snapshot metadata for import semantics (see `docs/spec/lineage-policy.md`).

## Machine-Readable Schema

Machine-readable definition:

- `schemas/bundle-1.0.0.schema.json`

Schema draft used: JSON Schema 2020-12 (`$schema` is explicitly set in the schema file).

## Phase 1 Scope Notes

- This schema is intentionally local-first for SPEC-01.
- Remote account listing, URL-only install, and server/API entities are out of scope for Phase 1.
