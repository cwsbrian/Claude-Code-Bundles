# Lineage and Import Policy (SPEC-02, D-04)

## Policy Statement

Import creates a **new private copy** owned by the importing user.

- There is **no automatic upstream sync** after import.
- Lineage records **snapshot relationships only** for provenance/audit.
- Edits to imported bundles remain independent from the source bundle unless a future explicit sync feature is introduced.

## Lineage Field Inventory (D-04)

- `origin_bundle_id`: Identifier of the source bundle at import time.
- `origin_snapshot_id`: Identifier of the exact source snapshot that was imported.
- `imported_at`: Timestamp when the import operation created the private copy.
- `root_bundle_id`: Identifier for the first known bundle in the lineage chain.
- `root_author_id`: Identifier for the author/owner of the lineage root.
- `parent_bundle_id`: Identifier of the immediate parent bundle from which this copy was created.

Phase 1 stores and documents these as local/spec-level fields; Phase 2+ may persist and query them via backend tables.

## Out of Scope for Phase 1

Deferred items explicitly excluded from this phase:

- Remote account bundle list merged into `list`.
- Install without URL based on account-owned remote inventory.
- Third-party install via URL/public ID workflow.
