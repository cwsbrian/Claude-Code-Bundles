# Phase 4: Public sharing + lineage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 04-public-sharing-lineage
**Areas discussed:** Publish mechanics, Import flow, Attribution & identity, Unpublish & moderation, Public bundle identifier, Re-publish after update, Import deduplication, RLS for public reads, User profiles storage, Publish pre-checks, Public bundle metadata, Import count / stats

---

## Publish mechanics

### How should the owner publish a bundle?

| Option | Description | Selected |
|--------|-------------|----------|
| API endpoint only (Recommended) | PATCH /api/bundles/[bundleId]/publish — toggles visibility. CLI calls this. | ✓ |
| CLI command only | ccb publish directly updates via API. No standalone endpoint. | |
| Both API + minimal web UI | API + web dashboard button. More surface area. | |

**User's choice:** API endpoint only
**Notes:** Matches existing API-first pattern.

### When publishing, which snapshots should be publicly visible?

| Option | Description | Selected |
|--------|-------------|----------|
| Latest snapshot only (Recommended) | Only most recent snapshot exposed. | ✓ |
| All snapshots | Every snapshot publicly accessible. | |
| Owner picks which snapshot | Explicit selection. More control but more UX. | |

**User's choice:** Latest snapshot only
**Notes:** None.

### bundle_publish_records table?

| Option | Description | Selected |
|--------|-------------|----------|
| Create bundle_publish_records (Recommended) | New table per design spec — tracks publish history, snapshot pinning. | ✓ |
| Just update bundles.visibility | Toggle existing column only. No history. | |

**User's choice:** Create bundle_publish_records
**Notes:** None.

### ccb publish CLI command?

| Option | Description | Selected |
|--------|-------------|----------|
| Add ccb publish (Recommended) | ccb publish <bundleId>. Consistent with ccb remote/pull/status. | ✓ |
| API-only, no CLI | CLI can be added later. | |

**User's choice:** Add ccb publish
**Notes:** None.

---

## Import flow

### R2 storage for imports?

| Option | Description | Selected |
|--------|-------------|----------|
| Copy to new object (Recommended) | Server copies zip to importer's namespace. Independent copy. | ✓ |
| Share original R2 object | Same storage_object_key. Saves storage but creates dependency. | |

**User's choice:** Copy to new object
**Notes:** Matches independent copy policy.

### Import API endpoint?

| Option | Description | Selected |
|--------|-------------|----------|
| POST /api/bundles/import (Recommended) | Top-level endpoint, body: { sourceBundleId }. | ✓ |
| POST /api/bundles/[bundleId]/import | Nested under source bundle route. | |

**User's choice:** POST /api/bundles/import
**Notes:** None.

### root_author_id column?

| Option | Description | Selected |
|--------|-------------|----------|
| Add root_author_id (Recommended) | ALTER TABLE. Enables 'Originated by' without JOINs. | ✓ |
| Skip — derive via JOIN | Query through root_bundle_id → bundles.owner_user_id. | |

**User's choice:** Add root_author_id
**Notes:** Matches lineage-policy.md D-04 spec.

### ccb import CLI command?

| Option | Description | Selected |
|--------|-------------|----------|
| Add ccb import (Recommended) | Full flow: API call → download → unpack → apply. | ✓ |
| API-only, no CLI | Import via API, then ccb pull to get locally. | |

**User's choice:** Add ccb import
**Notes:** None.

---

## Attribution & identity

### What user info is publicly visible?

| Option | Description | Selected |
|--------|-------------|----------|
| Display name + avatar (Recommended) | OAuth display name and avatar. No email. | ✓ |
| Display name only | Just text name. | |
| User ID only (anonymous) | UUID or short hash. | |

**User's choice:** Display name + avatar
**Notes:** None.

### Where is 'Published by / Originated by' shown?

| Option | Description | Selected |
|--------|-------------|----------|
| API responses only (Recommended) | GET /api/bundles/public/[id] returns JSON. CLI can display. | ✓ |
| API + minimal web page | API + /bundles/[id] web page. | |
| API + CLI display | API returns, CLI shows in terminal. | |

**User's choice:** API responses only
**Notes:** Minimum viable for PUB-03.

### 'Originated by' storage?

| Option | Description | Selected |
|--------|-------------|----------|
| Stored in root_author_id (Recommended) | Already decided to add column. Fast reads. | ✓ |
| Compute at query time | JOIN through root_bundle_id. | |

**User's choice:** Stored in root_author_id
**Notes:** Consistent with lineage snapshot philosophy.

### Public bundle list in Phase 4?

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch by ID only (Recommended) | Single public bundle by ID. Browse is Phase 5. | ✓ |
| Add basic public list | GET /api/bundles/public returns all. | |

**User's choice:** Fetch by ID only
**Notes:** None.

---

## Unpublish & moderation

### What happens on unpublish?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft hide (Recommended) | Set visibility to private. Existing imports unaffected. | |
| Hard remove | Delete publish records + set private. | |
| Soft hide + flag imports | Over-engineering. | |

**User's choice:** (Free text) "Unpublish"라는 개념은 없다. Visibility를 private으로 변경하면 public API 접근 불가. 삭제 시에는 hard remove.
**Notes:** No separate "unpublish" concept — just toggle visibility or delete.

### Moderation scope?

| Option | Description | Selected |
|--------|-------------|----------|
| Owner-only for now (Recommended) | No admin/operator role in Phase 4. | ✓ |
| Owner + admin flag | Add is_admin column/role. | |
| Owner + service-role API | Server-side endpoint for manual hide. | |

**User's choice:** Owner-only for now
**Notes:** MOD-01 = owner's ability to toggle visibility or delete.

### Impact on existing imports when original is deleted?

| Option | Description | Selected |
|--------|-------------|----------|
| Imports survive (Recommended) | Independent copies. Lineage IDs are historical. | ✓ |
| Cascade-break lineage | Null out parent/root in lineage. | |

**User's choice:** Imports survive
**Notes:** None.

### Delete scope clarification

**User's clarification:** 번들 삭제는 DB rows + R2 objects 삭제. 이미 apply된 로컬 파일(`~/.claude/...`)은 건드리지 않는다. Bundle은 패키징 계층, apply된 파일은 독립적.

### ccb unpublish + ccb delete?

| Option | Description | Selected |
|--------|-------------|----------|
| ccb unpublish + ccb delete (Recommended) | Unpublish = toggle to private. Delete = hard remove. | ✓ |
| API-only, no CLI | Manage via API only. | |
| ccb delete only | No unpublish command. | |

**User's choice:** ccb unpublish + ccb delete
**Notes:** None.

### Soft delete?

| Option | Description | Selected |
|--------|-------------|----------|
| Hard delete (Recommended) | CASCADE + R2 removal. No ghost data. | ✓ |
| Soft delete (deleted_at) | Keep rows, filter in queries. | |
| Soft delete DB, hard delete R2 | Audit trail without storage cost. | |

**User's choice:** Hard delete
**Notes:** Phase 4 is early — no compliance need for soft delete yet.

---

## Public bundle identifier

### How to reference public bundles?

| Option | Description | Selected |
|--------|-------------|----------|
| owner/public_bundle_id (Recommended) | e.g., brian/my-cool-bundle. Namespaced like GitHub repos. | ✓ |
| public_bundle_id only | Global uniqueness required. Collision risk. | |
| UUID (bundle.id) | Machine-friendly but not human-memorable. | |

**User's choice:** owner/public_bundle_id
**Notes:** Requires unique user handle.

### User handle source?

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub username from OAuth (Recommended) | user_metadata.user_name. Already available. | ✓ |
| User-chosen handle | Requires registration flow. | |
| You decide | Claude's discretion. | |

**User's choice:** GitHub username from OAuth
**Notes:** None.

---

## Re-publish after update

### Auto-update public snapshot?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-update to latest (Recommended) | Publish = toggle. Latest snapshot always served. | ✓ |
| Require explicit re-publish | Pin published_snapshot_id. | |
| You decide | Claude's discretion. | |

**User's choice:** Auto-update to latest
**Notes:** None.

---

## Import deduplication

### What if user already has this bundle?

| Option | Description | Selected |
|--------|-------------|----------|
| Error with message (Recommended) | 409 Conflict. | |
| Create another copy | Multiple imports allowed. | |
| Update existing import | Update snapshot. Closest to sync. | |

**User's choice:** (Free text) 같은 이름이라면 overwrite 또는 skip 선택을 프롬프트.
**Notes:** Interactive prompt matching ccb pull conflict handling pattern.

---

## RLS for public reads

### Authentication for public bundle reads?

| Option | Description | Selected |
|--------|-------------|----------|
| Anonymous read (Recommended) | No auth for GET public bundle. Import requires auth. | ✓ |
| Authenticated read only | Must be logged in to view public bundles. | |

**User's choice:** Anonymous read
**Notes:** None.

---

## User profiles storage

### How to store user public identity?

| Option | Description | Selected |
|--------|-------------|----------|
| New profiles table (Recommended) | public.profiles with github_handle, display_name, avatar_url. | ✓ |
| Read from auth.users metadata | Query auth.users raw_user_meta_data at runtime. | |
| You decide | Claude's discretion. | |

**User's choice:** New profiles table
**Notes:** Populated on first login via OAuth metadata. Decoupled from auth.users.

---

## Publish pre-checks

### Pre-conditions for publishing?

| Option | Description | Selected |
|--------|-------------|----------|
| Must have snapshot (Recommended) | Reject publish if zero snapshots. No re-scan needed. | ✓ |
| No pre-checks | Just toggle visibility. | |
| Snapshot + re-scan | Check snapshot + re-run secret scan. | |

**User's choice:** Must have snapshot
**Notes:** Secret scan already enforced at upload time.

---

## Public bundle metadata

### What info in public API response?

| Option | Description | Selected |
|--------|-------------|----------|
| Core: name, author, snapshot hash | display_name, public_bundle_id, author, latest hash, created_at | ✓ |
| Description field | Add description column to bundles | ✓ |
| Import count | Times imported | |
| Bundle contents summary | Skills/hooks/commands from manifest | ✓ |

**User's choice:** Core + Description + Bundle contents summary (not import count)
**Notes:** Import count deferred to Phase 5.

---

## Import count / stats

### Track import counts?

| Option | Description | Selected |
|--------|-------------|----------|
| Skip for Phase 4 (Recommended) | Add in Phase 5 with discovery/analytics. | ✓ |
| Add counter column now | import_count on bundles table. | |
| Track via lineage query | COUNT lineage WHERE parent = X. | |

**User's choice:** Skip for Phase 4
**Notes:** None.

---

## Claude's Discretion

- `bundle_publish_records` detailed column/index design
- `profiles` table schema details and populate trigger
- API response JSON field naming
- CLI output format for all new commands
- RLS policy SQL details
- `description` column length/defaults
- Bundle contents summary extraction logic

## Deferred Ideas

- Import count / stats → Phase 5 discovery
- Public bundle list/browse → Phase 5 (FND-01)
- Admin/operator moderation → Phase 5+ (OPS-01)
- Soft delete → Future if compliance needed
- Custom user handle registration → Future
- Web UI for publish/import → Phase 5+
