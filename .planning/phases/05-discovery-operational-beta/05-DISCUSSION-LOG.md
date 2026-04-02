# Phase 5: Discovery + operational beta - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 05-discovery-operational-beta
**Areas discussed:** Browse API design, Tagging system, Reporting & moderation, Observability

---

## Browse API design

| Option | Description | Selected |
|--------|-------------|----------|
| List endpoint only | GET /api/bundles/public with query params. API-first, no web UI. | :heavy_check_mark: |
| List endpoint + minimal web page | API plus basic Next.js page for browsable URL | |
| List + text search | API with full-text search (tsvector/ilike) | |

**User's choice:** List endpoint only
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Recent + alphabetical | Sort by created_at or display_name | |
| Recent + popular + alphabetical | Add popularity sort via import count | :heavy_check_mark: |
| Recent only | Single sort order | |

**User's choice:** Recent + popular + alphabetical
**Notes:** Requires tracking import counts (addressed in Observability area)

| Option | Description | Selected |
|--------|-------------|----------|
| Cursor-based | Cursor (last ID + sort value) for next page | :heavy_check_mark: |
| Offset/limit | Classic ?page=2&limit=20 | |
| No pagination (cap ~100) | Return all up to hard limit | |

**User's choice:** Cursor-based
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Light listing | id, display_name, description, published_by, tags, created_at, import_count | :heavy_check_mark: |
| Full detail per item | Include contents_summary, originated_by, latest_snapshot | |

**User's choice:** Light listing
**Notes:** Detail endpoint already exists for full info

---

## Tagging system

| Option | Description | Selected |
|--------|-------------|----------|
| Free-form tags | Authors add arbitrary tags, flexible | :heavy_check_mark: |
| Predefined categories | Fixed set of categories | |
| Both: categories + tags | Required category + optional tags | |

**User's choice:** Free-form tags
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Editable anytime | Owner can add/remove tags via API anytime | :heavy_check_mark: |
| Set at publish, immutable | Tags locked at publish time | |
| Set in bundle.json manifest | Tags from manifest, synced on upload | |

**User's choice:** Editable anytime
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Max 5 tags | Keeps listings clean, prevents spam | :heavy_check_mark: |
| Max 10 tags | More generous | |
| No limit | Maximum flexibility | |

**User's choice:** Max 5 tags
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on bundle update | PATCH /api/bundles/[id] accepts tags array | :heavy_check_mark: |
| Separate tag endpoints | POST/DELETE /api/bundles/[id]/tags | |
| CLI command only | ccb tag add/remove | |

**User's choice:** Inline on bundle update
**Notes:** None

---

## Reporting & moderation

| Option | Description | Selected |
|--------|-------------|----------|
| API report endpoint | POST /api/bundles/[id]/report with reason enum | :heavy_check_mark: |
| Email-based reporting | mailto link, no DB tracking | |
| Report + auto-hide threshold | Auto-hide after N reports | |

**User's choice:** API report endpoint
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Authenticated only | Must be logged in to report | :heavy_check_mark: |
| Anonymous allowed | Anyone can report without login | |

**User's choice:** Authenticated only
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Store only + admin query | Reports in DB, operator queries Supabase dashboard | :heavy_check_mark: |
| Store + notification stub | Reports + webhook/email stub | |
| Store + basic admin API | Reports + GET /api/admin/reports | |

**User's choice:** Store only + admin query
**Notes:** Review workflow is v2 scope

| Option | Description | Selected |
|--------|-------------|----------|
| One report per user per bundle | UNIQUE (reporter_user_id, bundle_id), 409 on duplicate | :heavy_check_mark: |
| Allow multiple reports | Same user can report multiple times | |

**User's choice:** One report per user per bundle
**Notes:** None

---

## Observability

| Option | Description | Selected |
|--------|-------------|----------|
| Import count per bundle | import_count column on bundles, increment on import | :heavy_check_mark: |
| Import count + download count | Track both imports and downloads | |
| Import + download + daily aggregates | Per-bundle counters + daily stats table | |

**User's choice:** Import count per bundle
**Notes:** Powers 'popular' sort option

| Option | Description | Selected |
|--------|-------------|----------|
| Basic health endpoint | GET /api/health, checks DB connectivity | :heavy_check_mark: |
| Health + dependency checks | Also checks R2 and Supabase auth | |
| No health endpoint | Rely on Vercel monitoring | |

**User's choice:** Basic health endpoint
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Column on bundles table | import_count integer column, atomic increment | :heavy_check_mark: |
| Separate analytics table | bundle_analytics with per-event rows | |
| You decide | Claude's discretion | |

**User's choice:** Column on bundles table
**Notes:** None

---

## Claude's Discretion

- bundle_tags table vs tags array column choice
- Cursor encoding approach
- Tag normalization rules
- Health endpoint DB check implementation
- Report reason enum DB implementation
- Browse API default limit
- CLI browse command addition

## Deferred Ideas

- Web UI for bundle browsing
- Full-text search (tsvector)
- Admin API for report review (v2)
- Download count tracking (v2)
- Daily aggregate analytics (v2)
- Auto-hide on N reports threshold (v2)
