# Bucket List → Dream-to-Reality OS — Data Model

**Historical planning document.** The implemented Phase 9 schema is now documented in
[`bucket-list-data-model.md`](./bucket-list-data-model.md). This file is kept as the original
Dream OS schema planning record.

Key implementation differences from this plan:

- The shipped image gallery table is `bucket_dream_images`, not `bucket_dream_assets`.
- The shipped cached intelligence table is `bucket_dream_ai_reports`.
- AI cover generation now defaults to gallery review before cover application.
- The first-visit seed RPC is hardened by
  `app/supabase/migrations/20271018000000_bucket_seed_rpc_hardening.sql`.

The rest of this document remains useful for rationale and future schema candidates.

See [`bucket-list-dream-os-architecture.md`](./bucket-list-dream-os-architecture.md) for the
product context and [`bucket-list-ai-policy.md`](./bucket-list-ai-policy.md) for AI specifics.

---

## 0 · Conventions we follow (from the existing codebase)

Confirmed against recent migrations (`tasks_command_center`, `asset_intelligence_hub`,
`relationship_intelligence_hub`, `grateful_things_photos_storage`) and the original
`20260621000000_bucket_list.sql`:

- **PK:** `id uuid primary key default gen_random_uuid()`.
- **Owner:** `user_id uuid not null references auth.users(id) on delete cascade`
  (newer tables also `default auth.uid()`).
- **Timestamps:** `created_at` / `updated_at timestamptz not null default now()` with a
  `BEFORE UPDATE` trigger calling the shared `touch_updated_at()`.
- **Enumerations:** newer tables prefer **`TEXT` + `CHECK (col IN (...))`** over native
  Postgres enum types (forward-compatible, i18n-friendly). The original bucket migration
  used native enums; **new columns/tables will use TEXT + CHECK** to match the current
  convention, and we will *not* alter the existing enum columns.
- **RLS:** `ENABLE ROW LEVEL SECURITY` + four policies (`select/insert/update/delete`) all
  keyed on `auth.uid() = user_id`. (The original bucket tables use one `ALL` policy; either
  is acceptable — new tables follow the 4-policy style used by recent migrations.)
- **Indexes:** composite `(user_id, …)` for list filters; FK column indexes; partial unique
  indexes where "one primary" semantics apply (cf. `asset_images_one_primary_idx`).
- **Storage:** public bucket + path `{auth.uid()}/{entity_id_or_drafts}/{uuid}.{ext}` +
  storage RLS on `(storage.foldername(name))[1] = auth.uid()::text`.
- **Idempotency:** `create table if not exists`, `drop policy if exists` before create,
  `on conflict do update` for bucket inserts.

**Rule honored:** *do not duplicate existing fields unnecessarily.* Every addition below was
checked against `bucket_items` — none re-implement an existing column.

---

## 1 · `bucket_items` — additive columns

All nullable or defaulted, so existing rows and code are unaffected.

| Column | Type | Notes |
| --- | --- | --- |
| `capture_source` | `text default 'manual'` `CHECK (capture_source IN ('manual','text_ai','image_ai','voice_ai'))` | How the dream was captured. Provenance for §8 of architecture. |
| `voice_transcript` | `text` | Optional raw transcript when captured by voice. |
| `cover_image_source` | `text default 'catalog'` `CHECK (cover_image_source IN ('catalog','upload','generated','external'))` | Drives the cover provenance. |
| `cover_image_is_ai` | `boolean not null default false` | Stores generated-image provenance internally. Mirrors `asset_images.image_type='generated_product_image'` intent. |
| `emotional_weight` | `smallint` `CHECK (emotional_weight BETWEEN 0 AND 100)` | User and/or AI signal of how much this dream matters. Powers "emotionally important". |
| `readiness_state` | `text` `CHECK (readiness_state IN ('ready','dormant','blocked','emotionally_important'))` | AI/rule-derived, **user-overridable**. Null = not yet computed. |
| `readiness_reason` | `text` | One-line explanation for the state (explainability). |
| `readiness_overridden` | `boolean not null default false` | True once the user sets the state manually; AI must not overwrite. |
| `intelligence_signals` | `jsonb not null default '[]'::jsonb` | Cached signal blobs (kind, summary, severity, source, generated_at, dismissed_at). Start here before considering a dedicated table. |
| `last_intelligence_at` | `timestamptz` | When signals were last computed (for staleness/refresh). |

**Why columns, not a table, for signals:** signals are small, per-dream, and read with the
dream. A JSONB cache keeps the page fast and avoids a join. Promote to
`bucket_intelligence_signals` only if we later need cross-dream querying or history (see §3).

**Existing columns reused (no duplication):**
`why_this_matters`, `cover_image_url`, `category_tags`, `quote_inspiration`,
`inspiration_links`, `estimated_cost` / `cost_band`, `ai_destination_brief`,
`ai_trip_plan`, `ai_reframe_suggestions`, all `linked_*` soft FKs, `is_featured`,
`completed_at`, `archived_at`.

New index: `idx_bucket_items_user_readiness (user_id, readiness_state)` (partial,
`WHERE readiness_state IS NOT NULL`) for the page-level intelligence rollup.

---

## 2 · `bucket_dream_assets` — new table (inspiration + covers)

Stores uploaded inspiration images, pasted screenshots, and generated covers. Modeled on
`asset_images`.

```text
bucket_dream_assets
  id              uuid pk default gen_random_uuid()
  user_id         uuid not null → auth.users(id) on delete cascade   (default auth.uid())
  bucket_item_id  uuid not null → bucket_items(id) on delete cascade
  kind            text not null default 'inspiration'
                  CHECK (kind IN ('inspiration','screenshot','generated_cover','upload_cover'))
  image_url       text not null
  storage_path    text                    -- null for external/catalog URLs
  is_ai_generated boolean not null default false
  is_cover        boolean not null default false
  prompt          text                    -- generation prompt (when AI)
  model_used      text                    -- e.g. gemini-2.5-flash-image
  width           int
  height          int
  caption         text                    -- user caption only; never asserts facts
  created_at      timestamptz not null default now()
  updated_at      timestamptz not null default now()   (+ touch_updated_at trigger)
```

Constraints / indexes:

- `idx_bucket_dream_assets_item (bucket_item_id, created_at desc)`.
- Partial unique `bucket_dream_assets_one_cover_idx ON (bucket_item_id) WHERE is_cover`
  — at most one chosen cover per dream (mirrors the asset "one primary" pattern).
- RLS: four policies on `auth.uid() = user_id`.

**Safety:** `is_ai_generated` is the source of truth for internal generated-image provenance; the
generation route always sets it true. `caption` is user-authored only.

---

## 3 · `bucket_intelligence_signals` — optional, deferred

Only created if/when JSONB on `bucket_items` proves insufficient (need for history,
cross-dream queries, or analytics). Shape if promoted:

```text
bucket_intelligence_signals
  id, user_id, bucket_item_id (→ on delete cascade)
  kind        text  CHECK IN ('readiness','blocker','next_step','emotional','reframe_hint')
  severity    text  CHECK IN ('info','suggest','warn')
  source      text  CHECK IN ('rule','ai')
  summary     text not null
  payload     jsonb not null default '{}'
  dismissed_at timestamptz
  generated_at timestamptz not null default now()
  created_at, updated_at
```

Phase 1 ships the JSONB column approach; this table is documented so the migration path is
clear and non-breaking (the JSONB cache becomes a denormalized read-through if we promote).

---

## 4 · `bucket_ai_usage` — extend the kind vocabulary

No schema change beyond the CHECK list. Add new usage kinds used by the new routes:

- `dream_capture` (text/voice capture)
- `dream_capture_image` (multimodal capture)
- `cover_image` (generated cover)
- `intelligence` (signal computation)
- `next_step` (single suggestion)

These join the existing `smart_tag`, `inspire`, `destination_brief`, `trip_plan`,
`reframe`, `reflection_summary`. Per-kind daily caps live in `BUCKET_AI_DAILY_LIMITS`
(`lib/ai/bucket-list/bucket-ai.ts`), not the DB. Proposed caps in the AI policy doc.

---

## 5 · Storage — new bucket `bucket-dream-images`

Follow `grateful_things_photos_storage.sql` exactly:

```text
bucket id/name : bucket-dream-images
public         : true
file_size_limit: 5242880  (5 MB)  -- 10 MB if generated covers need it; match asset-images
allowed_mime   : image/jpeg, image/png, image/webp, image/gif
path           : {auth.uid()}/{dream_id_or_drafts}/{uuid}.{ext}
```

Storage RLS (4 policies):

- public `SELECT` for `bucket_id = 'bucket-dream-images'`;
- `INSERT/UPDATE/DELETE` for `authenticated` where
  `(storage.foldername(name))[1] = auth.uid()::text`.

Upload flow reuses `lib/grateful-things/photo-storage.ts` style for user uploads (validate
mime, compress, `upload`, `getPublicUrl`). AI covers upload server-side in the `cover-image`
route (like `asset/generate-image`) with `cacheControl: "31536000, immutable"`.

---

## 6 · Cross-module linking (no new pattern invented)

| Need | Mechanism (existing) |
| --- | --- |
| Structural 1:1 link (dream→project, dream→savings goal) | Soft FK columns on `bucket_items` (`linked_project_id`, `linked_savings_goal_id`, `linked_budget_id`, `linked_memory_entry_id`). |
| 1:N / heterogeneous links (tasks, calendar events, knowledge, notes, map markers) | `bucket_item_integrations` (`kind` + `external_id/label/url` + `meta`). |
| Discovery / graph relationships | `brain_edges` with namespaced ids (`bucket_item::<uuid>` ↔ `project::<uuid>`, `task::<uuid>`, …) via `brainEdgesRepository.create`. |

The Activation Engine writes these through existing repositories after user confirmation —
the DB shape needs no change to support activation.

---

## 7 · Type & repository deltas (Phase 1, TypeScript)

To keep `app/src/types/bucket-list.ts` the single source of truth in sync with the migration:

- Extend `BucketItem` with the §1 columns; add `BucketReadinessState`,
  `BucketCaptureSource`, `BucketCoverSource` string-literal unions + `BUCKET_*` const arrays.
- Add `BucketDreamAsset` row type + `CreateBucketDreamAssetInput`.
- Add `BucketIntelligenceSignal` type for the JSONB blob.
- Extend `BUCKET_AI_USAGE_KINDS` with the §4 kinds.
- Add `bucketDreamAssetsRepository` to `lib/repositories/bucket-list.ts`
  (`listForBucket`, `create`, `setCover`, `remove`) and `normalizeBucketItem` handling for
  new fields (null-coerce `intelligence_signals` to `[]`).

No write-shape removes or renames an existing field; `CreateBucketItemInput` /
`UpdateBucketItemInput` only gain optional new properties.

---

## 8 · Migration ordering & safety

Phase 1 migration (single file, timestamped after the latest existing migration):

1. `alter table bucket_items add column if not exists …` for all §1 columns.
2. `create table if not exists bucket_dream_assets …` + indexes + RLS + trigger.
3. `insert into storage.buckets … on conflict do update` for `bucket-dream-images` + storage
   policies (`drop policy if exists` first).
4. Extend `bucket_ai_usage` CHECK (drop + re-add constraint with the superset list).

All steps are idempotent and additive. No data backfill required (new columns are nullable /
defaulted). Existing RLS, triggers, indexes, and the native enums on the original columns are
left untouched. After applying, regenerate types and update the repository + Zod schemas.
</content>
