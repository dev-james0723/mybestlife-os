# Bucket List Dream OS — Current Data Model

**Current through Phase 9.** This is the implemented Bucket List schema and persistence
contract. The older planning document remains at
[`bucket-list-dream-os-data-model.md`](./bucket-list-dream-os-data-model.md).

## Core Tables

| Table | Purpose | RLS |
| --- | --- | --- |
| `bucket_items` | One row per dream: content, type/status/priority, timing, budget, cover, travel fields, AI JSON caches, soft links, lifecycle flags. | `auth.uid() = user_id` for all actions. |
| `bucket_item_integrations` | Polymorphic links from dreams to projects, tasks, savings goals, notes, resource links, calendar placeholders, map markers, and other modules. | `auth.uid() = user_id` for all actions. |
| `bucket_reflections` | Completed-dream reflections, mood, photos, AI summary, and Phase 7 `changed_me` / `ai_memory`. | `auth.uid() = user_id` for all actions. |
| `bucket_flight_quotes` | Flight-watch quote history. Mock/built-in estimates are `mode = 'exploratory'`; only configured real providers may emit `mode = 'live'`. | `auth.uid() = user_id` for all actions. |
| `bucket_ai_usage` | Per-user daily AI quota ledger. | `auth.uid() = user_id` for all actions. |
| `bucket_settings` | One row per user for defaults and seed-cleared state. | `auth.uid() = user_id` for all actions. |
| `bucket_dream_images` | Per-dream gallery for uploads, screenshots, generated visuals, travel photos, memory photos, and covers. | Four policies: select/insert/update/delete own rows. |
| `bucket_dream_ai_reports` | Cached Dream Intelligence reports keyed by `(user_id, bucket_item_id, report_type)`. | Four policies: select/insert/update/delete own rows. |

## Important Columns

- `bucket_items.cover_image_url` remains the fast card/detail cover source.
- `bucket_items.cover_image_is_ai` stores generated-image provenance internally; cover
  surfaces do not render generated/AI badges.
- `bucket_items.ai_destination_brief`, `ai_trip_plan`, and `ai_reframe_suggestions` are
  persisted JSON caches generated only from explicit user actions.
- `bucket_items.latest_live_price` is reserved for real non-mock live provider prices. The
  built-in mock provider must not write to it.
- `bucket_flight_quotes.mode` is the source of truth for quote provenance:
  `exploratory` means estimate/research aid; `live` means a configured live provider.
- `bucket_dream_images.image_type = 'generated_visual'` and
  `source_type = 'generated'` identify generated visuals for internal provenance.
- `bucket_reflections.ai_memory` is an interpretation of user-supplied reflection text, not
  an invented completed memory.

## Storage

`bucket-dream-images` is a public-read Supabase Storage bucket for uploaded and generated
dream images.

- Object path: `{auth.uid()}/{bucket_item_id_or_drafts}/{uuid}.{ext}`.
- Allowed mime types: JPEG, PNG, WebP, GIF.
- File size limit: 10 MB.
- Public select policy is allowed for display URLs.
- Insert/update/delete policies require the first folder segment to match `auth.uid()`.

## Migrations

Implemented Bucket List migrations:

- `20260621000000_bucket_list.sql` — base tables, RLS, indexes, triggers.
- `20260621000100_bucket_list_seed_function.sql` — first-visit seed RPC.
- `20270915000000_travel_explorer_console.sql` — Travel Explorer tables.
- `20271015000000_bucket_dream_images.sql` — image gallery, cover AI flag, storage bucket.
- `20271016000000_bucket_dream_ai_reports.sql` — cached intelligence reports.
- `20271017000000_bucket_reflection_memory.sql` — richer completed-dream memory fields.
- `20271018000000_bucket_seed_rpc_hardening.sql` — Phase 9 seed RPC RLS hardening.

## RLS And Write Safety

- Client repositories use the authenticated Supabase client; Bucket List API routes use
  `createServerSupabaseClient()` with the anon key and user cookies.
- Bucket List AI routes do not use the service-role client.
- `seed_bucket_list_starter(uuid)` now runs as `SECURITY INVOKER`; table RLS remains the
  authority even if a caller passes another user's UUID.
- Activation writes use existing Projects/Tasks/Finance/Notes repositories only after the
  user confirms selected preview rows.
- Calendar and knowledge suggestions currently persist as Bucket integration rows/resource
  links, not as real Calendar or Knowledge records.

## Future Data Work

- Add a real flight provider table/config only when a provider adapter is implemented.
- Consider a cleanup/backfill if old data contains mock estimates in `latest_live_price`.
- Promote intelligence signals to a separate history table only if cross-dream querying or
  signal history becomes necessary.
