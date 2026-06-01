# Bucket List → Dream-to-Reality OS — Architecture

**Current through Phase 9.** This document is now the living architecture for the
implemented Bucket List Dream-to-Reality OS, including the Phase 9 QA/hardening pass.

This document describes how we evolve the existing Bucket List feature into a full
AI-powered **Dream-to-Reality OS**: a system that helps a user capture a dream with
minimal typing, understand why it matters, reframe it into achievable pieces,
activate it into real work across the rest of the app, plan travel intelligently,
and finally turn a completed dream into a lasting memory.

It is grounded in the code that exists today. Where a capability already exists it is
**preserved and extended**, not rebuilt. Where something is new it reuses the app's
established patterns (Gemini helpers, soft foreign keys, the polymorphic integration
join, per-user RLS, the storage upload convention).

Companion documents:

- [`bucket-list-dream-os-roadmap.md`](./bucket-list-dream-os-roadmap.md) — phased delivery plan.
- [`bucket-list-ai-policy.md`](./bucket-list-ai-policy.md) — AI usage, grounding, safety, quotas.
- [`bucket-list-data-model.md`](./bucket-list-data-model.md) — current implemented schema and RLS notes.

Prior context: [`bucket-list-build-summary.md`](./bucket-list-build-summary.md),
[`bucket-list-build-log.md`](./bucket-list-build-log.md).

---

## Phase 9 Current-State Addendum

The upgraded Bucket List is implemented as an additive Dream-to-Reality layer over
`bucket_items`. The primary surfaces are:

- **Overview shell:** animated hero, stats, type filters, Dream Pattern Banner, grid/list
  cards, Featured Rail, Realized strip, empty-state CTAs, settings, and first-visit seeds.
- **Capture:** manual add sheet plus AI Dream Capture wizard. AI capture returns a draft and
  never persists until the user reviews and clicks Save.
- **Visuals:** uploaded images and generated dream visuals are stored in
  `bucket_dream_images`. Generated visuals are labeled and are added to the gallery for
  review; they are not auto-applied as the cover unless an explicit caller opts in.
- **Intelligence Hub:** cached `bucket_dream_ai_reports` reports, readiness scoring,
  blockers, smallest version, next step, and suggested connections. Opening the hub reads
  cache first and does not call AI on render.
- **Activation Engine:** Gemini proposes an activation plan; the preview checkboxes authorize
  the actual Project / Task / Savings / Note / integration writes. Calendar and knowledge
  suggestions currently persist as Bucket integration rows/resource links rather than real
  calendar/knowledge records.
- **Travel Explorer:** grounded destination brief, grounded trip plan, lazy Google map,
  readiness, budget versions, booking checklist, image suggestions, and flight watch. All
  built-in flight prices are estimates; the mock provider now always records
  `mode = 'exploratory'`.
- **Memory:** completed-dream reflections save only user-authored reflection/photos plus an
  AI interpretation of that supplied text. Completed memories are never generated from thin
  air.

Phase 9 hardening added:

- Seed RPC hardening migration: `seed_bucket_list_starter(uuid)` now runs as
  `SECURITY INVOKER`, so existing RLS policies enforce `auth.uid() = user_id`.
- Mock flight estimates no longer populate `latest_live_price`; only a real, non-mock live
  provider may do that.
- Travel brief and trip-plan views always display a verification notice.
- AI cover generation defaults to gallery review instead of applying the generated visual
  as the active cover.
- The dream image resolver hook now depends on the full item object, removing a stale memo
  dependency risk.

---

## 1 · Current Bucket List system summary

The Bucket List today is already a substantial aspiration layer. It is **not** a simple
gallery — most of the data spine for a Dream OS is in place.

### 1.1 Data layer (6 tables, all RLS `auth.uid() = user_id`)

`app/supabase/migrations/20260621000000_bucket_list.sql`

| Table | Role |
| --- | --- |
| `bucket_items` | The dream entity. ~60 columns: classification (type/status/priority/difficulty/time_horizon), budgeting, timing, presentation (tags, cover image, inspiration links, quote), travel block (destination, airports, lat/lng, season, style, exploratory price band, flight-watch toggle), AI enrichment JSONB (`ai_destination_brief`, `ai_trip_plan`, `ai_reframe_suggestions`), **soft FKs** to project / budget / savings goal / calendar events / tasks / knowledge resources / memory entry, and lifecycle flags (`is_seed`, `is_featured`, `archived_at`, `completed_at`). |
| `bucket_item_integrations` | Polymorphic join — `kind ∈ {project, task, budget, savings_goal, calendar_event, note, knowledge_entry, journal_entry, resource_link, map_marker}` + `external_id/label/url` + `meta` JSONB. Lets a dream link to any module without schema churn. |
| `bucket_reflections` | Post-completion memories: `reflection_text`, `ai_summary`, `photo_gallery` JSONB, `mood`, `reflected_on`. |
| `bucket_flight_quotes` | Append-only price history: provider, `mode ∈ {exploratory, live}`, airports, dates, cheapest/fastest/direct prices, `raw_payload`, deeplink. |
| `bucket_ai_usage` | Per-user / per-day / per-kind AI call ledger (quota enforcement). PK `(user_id, usage_date, kind)`. |
| `bucket_settings` | One row per user: default origin airport, currency, preferred flight provider, `seeds_cleared`, `show_closed_dreams`, default map center/zoom. |

All tables use the shared `touch_updated_at()` trigger and standard
`id uuid default gen_random_uuid()` / `user_id` / timestamp columns.

### 1.2 Types, repository, state

- `app/src/types/bucket-list.ts` — the full domain type graph: enums
  (`BUCKET_TYPES`, `BUCKET_STATUSES` (10), `BUCKET_PRIORITIES`, `BUCKET_DIFFICULTIES`,
  `BUCKET_TIME_HORIZONS`, `BUCKET_COST_BANDS`, travel enums, `BUCKET_INTEGRATION_KINDS`,
  `BUCKET_AI_USAGE_KINDS`, `BUCKET_REFLECTION_MOODS`), the row types (`BucketItem`,
  `BucketItemIntegration`, `BucketReflection`, `BucketFlightQuote`, `BucketSettings`),
  the AI sub-types (`BucketDestinationBrief`, `BucketTripPlan`, `BucketReframeResponse`,
  `BucketDreamImage`), and write shapes (`CreateBucketItemInput`, `UpdateBucketItemInput`).
- `app/src/lib/repositories/bucket-list.ts` — 5 thin repositories (`bucketItemsRepository`,
  `bucketIntegrationsRepository`, `bucketReflectionsRepository`, `bucketFlightQuotesRepository`,
  `bucketSettingsRepository`) plus `runBucketListSeed()`.
- `app/src/hooks/use-bucket-list.ts` — TanStack Query hooks + derived `useBucketStats` /
  `useBucketHighlights`. `use-bucket-ai.ts` — the four AI mutations.
  `use-bucket-dream-image.ts` — memoized image resolution.
- `app/src/stores/bucket-list-store.ts` — Zustand UI state (view mode, sort, filters, and
  the four modal/sheet open-state ids).
- `app/src/lib/bucket-list/sdk.ts` — **server-safe cross-module SDK** already used by other
  pages (`getBucketStats`, `getBucketHighlights`, `getDashboardBucketSummary`,
  `getBucketItemForProject`, `getBucketItemForSavingsGoal`, `getTravelDealsForDashboard`,
  `computeHighlights`).

### 1.3 UI

- Workspace tabs (`bucket-workspace-tabs.tsx`, URL `?tab=overview|travel|map`).
- Overview: `list-shell.tsx` → `stats-strip.tsx`, `type-filter-tabs.tsx`, `dream-card.tsx` /
  `dream-list-row.tsx`, `featured-rail.tsx`, `realized-strip.tsx`.
- Detail Hub: `detail-hub-dialog.tsx` with tabs Overview / Integrations / Travel / Memories.
- Flows: `add-dream-sheet.tsx` (quick + detailed capture), `activate-dream-modal.tsx`,
  `reflection-sheet.tsx`, `flight-watch-panel.tsx`, `settings-popover.tsx`.
- Travel: `travel-map.tsx` (+ Google Map variants), `explorer/` console, arc/route geometry libs.
- `dream-cover-background.tsx` + `resolve-bucket-dream-image.ts` + `dream-image-catalog.ts` —
  a keyword/type-rules image resolver over a static Unsplash catalog.

### 1.4 AI (Gemini only)

- `app/src/lib/ai/bucket-list/bucket-ai.ts` — auth/context helper, `BUCKET_AI_DAILY_LIMITS`,
  quota assert + record, error shaping.
- Four routes under `app/src/app/api/bucket-list/`:
  `reframe` (structured JSON), `trip-plan` and `destination-brief` (two-call grounded:
  `fetchGeminiGroundedText` → `fetchGeminiStructured`), `reflection-summary` (structured JSON).
- All use the shared `app/src/lib/ai/gemini-text.ts` client. No other LLM provider exists.

### 1.5 Travel intelligence

- `flight-watch.ts` — provider-agnostic `FlightWatchProvider` interface + bundled
  `MockFlightWatchProvider` (deterministic Haversine + season/style pricing) + `exploratoryBand()`.
  **All current prices are estimates.** Real providers (skyscanner/kiwi/duffel/amadeus) are
  enumerated but not implemented.
- A Travel Explorer Console migration already exists
  (`20270915000000_travel_explorer_console.sql`).

---

## 2 · Existing features that must be preserved

These are working today and **must not regress**. New work wraps them.

1. **Quick + detailed dream capture** (`add-dream-sheet.tsx`) with travel-only fields.
2. **Status lifecycle** Dreaming → Exploring → Planning → Active → Funded → Scheduled →
   Booked → Completed (+ Paused/Archived) and progress estimation.
3. **Detail Hub** with the four tabs, editable "why this matters", featured-star toggle.
4. **Activate flow** that writes real Project / Task / Savings Goal / Goal rows and
   polymorphic integration rows, then writes the soft-FK ids back.
5. **Flight watch** (exploratory band + recorded quote history) and the **mock-labeled** UI.
6. **AI reframe / destination brief / trip plan / reflection summary** with daily quotas.
7. **Reflections / Memories** (mood, photo gallery, AI summary) and the Realized strip.
8. **Travel map** (offline SVG + optional Google tiles) and the **Explorer Console**.
9. The **cross-module SDK** consumed by Dashboard / Projects / Finance.
10. **Seed dreams** + "clear seeds" and per-user **settings**.
11. **i18n** (EN + zh-TW) via `bucket-list-ui.ts`.

The Dream OS layers on top of these as additive capabilities and a refined IA — it does
not replace the storage spine, the SDK, or the integration model.

---

## 3 · New AI-first product vision

> A user should be able to think a dream, dump a screenshot, and watch the OS turn it into
> a clear, motivating, and actionable plan — without filling in a form.

The Dream OS is organized around a **dream lifecycle** and five experience pillars:

```
 CAPTURE → UNDERSTAND → REFRAME → ACTIVATE → PURSUE → REALIZE → REMEMBER
   │           │           │          │         │         │          │
   └ AI capture┘           │          │         │         │          │
       (text, image,       │          │         │         │          │
        voice, paste)      │          │         │         │          │
                  Dream Intelligence Hub (why it matters, readiness,  │
                  emotional weight, blockers, next best step)         │
                                       │          │                   │
                              Dream Activation Engine (projects,      │
                              tasks, savings, calendar, notes —       │
                              always confirmed)                       │
                                                  │                   │
                                       Travel Explorer Console        │
                                       (maps, flights, itineraries,   │
                                        destination intelligence)     │
                                                                      │
                                            Realized Dreams / Memory Timeline
```

**Pillars**

1. **AI Dream Capture** — minimal typing. Text, pasted screenshot, uploaded inspiration
   image, or voice note → a fully structured dream draft (title, type, why-it-matters,
   tags, cost band, suggested cover). User reviews before save.
2. **Dream Intelligence Hub** — per-dream "brain": why it matters, readiness state
   (Ready / Dormant / Blocked / Emotionally important), suggested next best step, and
   reframes — all derived, all explainable, all dismissable.
3. **Dream Activation Engine** — turn a dream into real Projects / Tasks / Savings goals /
   Calendar events / Notes. **Every external write is confirmed by the user first.**
4. **Travel Explorer Console** — destination intelligence (grounded), maps, itineraries,
   and flight watch. AI research is labeled and never presented as verified prices.
5. **Realized Dreams / Memory Timeline** — completed dreams become a reflective timeline.
   Memories are only what the user wrote/uploaded; nothing is invented.

**Page-level Dream Intelligence** ties it together: the overview surfaces which dreams are
ready to push, which are dormant, which are blocked, and which are emotionally important —
so the page itself behaves like a coach, not a list.

---

## 4 · Database schema plan

Full detail is in [`bucket-list-data-model.md`](./bucket-list-data-model.md). Summary of intent:

**Reuse, don't duplicate.** Most fields already exist. New work is mostly:

- **Additive columns on `bucket_items`** (nullable, with defaults) for derived intelligence
  and richer capture — e.g. `cover_image_source` / `cover_image_is_ai`,
  `emotional_weight` (smallint), `readiness_state` (enum, AI-suggested + user-overridable),
  `readiness_reason` (text), `last_intelligence_at` (timestamptz), `capture_source` enum,
  `voice_transcript` (text, nullable).
- **New tables** only where a 1-row-per-dream column is insufficient:
  - `bucket_dream_assets` — uploaded inspiration images / generated covers /
    screenshots, each row recording `kind` (`inspiration | generated_cover | screenshot`),
    `storage_path`, `image_url`, `prompt`, `model_used`, `is_ai_generated`, `is_cover`.
    (Mirrors the `asset_images` pattern.)
  - `bucket_intelligence_signals` *(optional, can start as a JSONB column)* — cached,
    explainable signals (readiness, blockers, next step) with `kind`, `summary`,
    `severity`, `source` (`ai | rule`), `dismissed_at`, `generated_at`. Start as a JSONB
    cache on `bucket_items` and promote to a table only if history/queryability is needed.
  - `bucket_ai_usage` gains the new `kind` enum values for new AI flows (capture, image,
    intelligence, next_step). No new table required.

**Cross-module linking stays consistent with the rest of the app:**

- Single **soft FK** columns for structural 1:1 links (already present:
  `linked_project_id`, `linked_savings_goal_id`, …).
- The **polymorphic `bucket_item_integrations`** join for 1:N / heterogeneous links.
- For graph/discovery relationships, reuse **`brain_edges`** with namespaced node ids
  (`bucket_item::<uuid>` ↔ `project::<uuid>` etc.) rather than inventing a new edge table.

**Storage:** one new public bucket `bucket-dream-images` following the existing convention
(path `{auth.uid()}/{dream_id_or_drafts}/{uuid}.{ext}`, RLS on
`(storage.foldername(name))[1] = auth.uid()::text`, public read), reusing the
`grateful-things-photos` / `asset-images` pattern verbatim.

All new tables: per-user RLS (`auth.uid() = user_id`), `gen_random_uuid()` PK,
`touch_updated_at()` trigger, indexed on `(user_id, …)`.

---

## 5 · API route plan

All routes live under `app/src/app/api/bucket-list/` and follow the established route
pattern: `createServerSupabaseClient()` → `auth.getUser()` (401 if absent) → JSON parse
(400 on failure) → quota assert (429) → Gemini via shared helpers → **Zod validate at the
boundary** → optional Supabase write → typed `NextResponse.json`. AI errors shaped by
`bucketAiError`.

**Existing (preserve):** `reframe`, `trip-plan`, `destination-brief`, `reflection-summary`.

**New:**

| Route | Method | Purpose | AI shape |
| --- | --- | --- | --- |
| `capture` | POST | Text/voice/paste → structured dream draft. | `fetchGeminiStructured` (responseSchema). Returns a draft, does **not** persist. |
| `capture-image` | POST | Uploaded inspiration image / screenshot → structured draft. | `fetchGeminiStructuredFromParts` (inline image bytes). |
| `cover-image` | POST | Generate an AI dream cover. | `generateGeminiInlineImage` (`gemini-2.5-flash-image` chain) → upload to `bucket-dream-images` → persist `bucket_dream_assets` row flagged `is_ai_generated`. |
| `intelligence` | POST | Compute/refresh per-dream signals (readiness, blockers, next step, emotional weight). | Rule pass + `fetchGeminiStructured`. Caches onto the dream. |
| `next-step` | POST | Single "next best step" suggestion for a dream. | `fetchGeminiStructured`. Suggestion only — no writes. |
| `activate/preview` | POST | Given a dream + selected actions, return a **preview** of what would be created (project name, tasks, savings target, calendar entries). | Local + optional `fetchGeminiStructured` for task breakdown. No writes. |

**Activation writes remain client-orchestrated** through existing repositories
(`projectsRepository`, `tasksRepository`, `financeRepository`, etc.) inside the confirmed
Activate flow — the API only *proposes*. This keeps the "no auto-create without
confirmation" rule structurally enforceable.

---

## 6 · Component architecture

Additive composition over the current tree. No fake buttons — every control maps to a real
capability or is omitted.

```
bucket-list/page.tsx
└─ BucketWorkspaceTabs                     (existing — add "Intelligence" affordances inline)
   ├─ overview → BucketListShell           (existing)
   │   ├─ PageIntelligenceBar      (NEW)    — ready / dormant / blocked / emotional rollup
   │   ├─ BucketStatsStrip                  (existing)
   │   ├─ TypeFilterTabs                    (existing, + readiness filter)
   │   ├─ DreamCard / DreamListRow          (existing, + readiness chip + internal cover provenance)
   │   ├─ FeaturedRail                       (existing, + "next best step" CTA)
   │   └─ RealizedStrip                      (existing)
   ├─ travel → ExplorerConsole              (existing)
   └─ map → BucketTravelMap                 (existing)

Global overlays
├─ AddDreamSheet                             (existing) → hosts:
│   └─ DreamCapturePanel            (NEW)    — text / paste / image / voice capture + draft review
├─ DetailHubDialog                           (existing) → tabs extended:
│   ├─ Overview        → + DreamIntelligenceCard (NEW)
│   ├─ Integrations                          (existing)
│   ├─ Travel                                 (existing)
│   └─ Memories                               (existing)
├─ ActivateDreamModal                        (existing) → wraps:
│   └─ ActivationPreview            (NEW)    — shows exactly what will be created, per action
├─ ReflectionSheet                           (existing)
└─ DreamCoverPicker                 (NEW)    — choose catalog image / upload / generate
```

**New hooks** (TanStack Query, same conventions): `use-dream-capture.ts`,
`use-dream-cover.ts` (generate/upload), `use-dream-intelligence.ts`,
`use-dream-assets.ts`. New presentation helpers in `lib/bucket-list/` for readiness labels,
emotional-weight display, and internal cover provenance.

---

## 7 · Dream image / inspiration system

Three sources, one resolver, clear provenance.

1. **Catalog / keyword resolution (existing).** `resolve-bucket-dream-image.ts` +
   `dream-image-catalog.ts` map a dream to a curated Unsplash image by keyword/type rules.
   Kept as the zero-cost default and fallback.
2. **User uploads.** Inspiration images and screenshots upload client-side to the new
   `bucket-dream-images` bucket (reuse `grateful-things/photo-storage.ts` flow: validate
   mime, compress, `upload`, `getPublicUrl`), recorded as `bucket_dream_assets` rows.
   Screenshots can also be fed to `capture-image` to seed a draft.
3. **AI-generated covers.** `cover-image` route calls `generateGeminiInlineImage`
   (`gemini-2.5-flash-image` → `gemini-3.1-flash-image` fallback chain), uploads bytes to
   `bucket-dream-images`, persists a `bucket_dream_assets` row with
   `is_ai_generated = true`, `prompt`, `model_used`.

**Resolution priority for a dream's cover:** explicit chosen cover
(`bucket_dream_assets.is_cover`) → `cover_image_url` → catalog/keyword → type fallback →
global fallback. `BucketDreamImage.sourceType` (`static | api | generated`) already exists;
use it for internal provenance and safety/audit logic. Generated images are decorative
inspiration — never represented as a real photo of the user's experience.

---

## 8 · AI dream capture system

Goal: **minimal typing.** Four entry modes, all converging on a reviewable draft.

| Mode | Input | Route | Gemini |
| --- | --- | --- | --- |
| Text | A sentence or two | `capture` | `fetchGeminiStructured` |
| Paste / screenshot | Image bytes | `capture-image` | `fetchGeminiStructuredFromParts` |
| Voice | Transcript (browser STT) → text | `capture` | `fetchGeminiStructured` |
| Inspiration upload | Image | `capture-image` + asset row | multimodal |

The draft is a `CreateBucketItemInput`-shaped object plus suggestions (suggested cover
keyword, suggested tags, a first "why this matters" line, an estimated cost band). It is
shown in `DreamCapturePanel` inside the Add sheet for the user to edit and confirm.
**Nothing is written until the user saves.** Capture counts against a new
`capture` AI-usage kind.

Capture provenance is stored (`capture_source` enum: `manual | text_ai | image_ai |
voice_ai`) so we can measure and tune the experience.

---

## 9 · Dream Intelligence Hub

Per-dream reasoning that is **derived, explainable, and overridable**.

Signals computed by a **rule pass first, AI second** (cheaper + grounded in the dream's own
data):

- **Readiness state** — `ready | dormant | blocked | emotionally_important`.
  - *Ready:* active/planning, has linked work or savings progress, target date near.
  - *Dormant:* no activity / no integrations / old `updated_at`.
  - *Blocked:* an explicit blocker (funding gap, missing prerequisite) detected.
  - *Emotionally important:* high `emotional_weight` or strong "why this matters".
- **Why it matters** — preserve the user's text; AI may *offer* a sharper restatement
  (clearly labeled, never silently overwriting).
- **Next best step** — one concrete action (e.g. "Open a savings goal for $X",
  "Break into 3 tasks", "Draft a 5-day itinerary"). Suggestion only; acting on it routes
  into the Activate flow (confirmed).
- **Reframes** — existing `ai_reframe_suggestions`, surfaced here.

Results cache onto the dream (`readiness_state`, `readiness_reason`,
`last_intelligence_at`, and a JSONB signal blob) so the page is fast and signals are
stable between refreshes. The user can **dismiss** a signal or **override** the readiness
state; overrides are sticky and never re-clobbered by AI.

Surfaced in `DreamIntelligenceCard` (Detail Hub Overview tab) and rolled up in the
page-level intelligence bar (§12).

---

## 10 · Dream Activation Engine

Turns a dream into real work — **only with explicit confirmation.**

Builds on the existing `activate-dream-modal.tsx` and `getSuggestedActivations(type)`:

1. **Suggest** context-aware actions per dream type (existing).
2. **Preview** (NEW) — `activate/preview` returns exactly what each selected action will
   create: project name + description, the task list (AI-broken-down where useful), the
   savings goal name + target (from `estimated_cost`), proposed calendar entries, a notes
   stub. Shown in `ActivationPreview` before anything is written.
3. **Confirm & apply** — on confirm, the client calls existing repositories
   (`projectsRepository.create`, `tasksRepository.create(+createMany)`,
   `financeRepository.createSavingsGoal`, `goalsRepository.create`,
   calendar via the existing planner/Google Calendar integration, notes/knowledge via their
   repositories), records `bucket_item_integrations` rows, and writes the soft-FK ids back
   to `bucket_items`. Optionally creates `brain_edges` for graph linking.

**Hard rule:** no project, task, budget, savings goal, calendar event, or note is created
without an explicit user confirmation in the preview step. The API never performs these
writes on its own.

---

## 11 · Travel Explorer Console

Extends the existing travel stack (`explorer/`, `travel-map.tsx`, `flight-watch.ts`,
`destination-brief` + `trip-plan` routes).

- **Destination intelligence** — grounded via `fetchGeminiGroundedText` →
  `fetchGeminiStructured`. Output carries an `unverified` flag (already in
  `BucketDestinationBrief` / `BucketTripPlan`) and is rendered with a "AI research — verify
  before booking" disclaimer.
- **Maps** — keep offline SVG default + optional Google tiles; markers/arcs colored by
  status; clicking a marker opens the Detail Hub.
- **Itineraries** — day-by-day `BucketTripPlan`, regenerable, editable, never auto-applied
  to the calendar (goes through Activate).
- **Flight watch** — keep the provider-agnostic interface and `exploratoryBand()`. The
  **mock provider stays clearly labeled** ("Estimated — not a live fare"). A real provider
  may be added behind the `FlightWatchProvider` interface + `preferred_flight_provider`
  setting; **only live-provider quotes may be shown without the estimate label.**

**Rule:** never fake live flight prices, and never present travel research as verified
unless it came from a grounded call (and even then, label it as AI research, not a booking
guarantee).

---

## 12 · Page-level Dream Intelligence

The overview page behaves like a coach. A `PageIntelligenceBar` (above the stats strip)
rolls up the per-dream signals into actionable buckets:

- **Ready to push** — dreams with a clear next step / near target.
- **Dormant** — untouched dreams worth revisiting.
- **Blocked** — dreams with a detected blocker (funding gap, missing prerequisite).
- **Emotionally important** — high-weight dreams the user shouldn't lose sight of.

Each bucket links to the relevant dreams; cards gain a small readiness chip. Computed from
the cached signals (§9) via the SDK so it stays server-renderable and cheap. New filter in
`type-filter-tabs.tsx` to filter by readiness. This also feeds the existing
`getDashboardBucketSummary()` so the Dashboard widget can show the same intelligence.

---

## 13 · Realized Dreams / Memory Timeline

Builds on `bucket_reflections` + `realized-strip.tsx` + the Memories tab.

- Marking a dream realized (existing `markCompleted`) moves it into the memory surface.
- A **timeline view** of realized dreams ordered by `completed_at`, each showing the user's
  reflection(s), mood, and `photo_gallery`.
- AI may produce a **reflection summary** of the user's own words (existing
  `reflection-summary`), clearly labeled as an AI recap of *their* text.
- **Hard rule:** memories are only what the user wrote or uploaded. The OS never invents a
  memory, a photo caption that asserts events, or a "you did X" claim. AI summaries
  paraphrase provided text only.

---

## 14 · Safety and trust rules

These are binding across every layer.

1. **No auto-creation.** Projects, tasks, budgets, savings goals, calendar events, and
   notes are created only after explicit user confirmation (Activate preview → confirm).
   AI routes propose; they do not write cross-module rows.
2. **No fake live flight prices.** Estimated prices are labeled "Estimated"; only a real,
   configured provider's quotes may appear without that label.
3. **No unverified travel facts as truth.** Grounded AI research is labeled "AI research —
   verify before booking"; ungrounded output is never presented as factual.
4. **Generated-image provenance is stored.** Generated covers/visuals do not show
   generated/AI badges in the UI, but they are stored with generated-image provenance.
5. **Memories are never invented.** Reflections/summaries derive only from user input.
6. **AI suggestions are dismissable and overridable.** User overrides (e.g. readiness
   state) are sticky and never silently overwritten.
7. **Quotas + graceful degradation.** Per-kind daily caps via `bucket_ai_usage`; quota
   exhaustion returns 429 with a friendly toast; capture/cover/intelligence always have a
   non-AI fallback (manual form, catalog image, rule-only signals).
8. **Per-user isolation.** All new tables/buckets enforce `auth.uid() = user_id` RLS and
   the storage folder convention.
9. **Provenance everywhere.** `capture_source`, `cover_image_source`, `model_used`, and the
   `unverified` flags make it always clear what came from AI.

---

## 15 · Implementation phases

Detailed in [`bucket-list-dream-os-roadmap.md`](./bucket-list-dream-os-roadmap.md). Headline:

- **Phase 0 — Architecture (this document).** No code.
- **Phase 1 — Data & provenance.** Additive migration: new `bucket_items` columns,
  `bucket_dream_assets` table, `bucket-dream-images` storage bucket, new AI-usage kinds.
  Extend types + repositories. No UX change yet.
- **Phase 2 — AI Dream Capture.** `capture` + `capture-image` routes, `DreamCapturePanel`,
  voice/paste/upload, draft review. Catalog image picker + upload.
- **Phase 3 — Dream image / cover system.** `cover-image` route + `DreamCoverPicker` +
  internal generated-image provenance end to end.
- **Phase 4 — Dream Intelligence Hub.** Rule + AI signals, `DreamIntelligenceCard`,
  readiness caching, dismiss/override.
- **Phase 5 — Page-level intelligence.** `PageIntelligenceBar`, readiness filter, dashboard
  rollup.
- **Phase 6 — Activation Engine upgrade.** `activate/preview` + `ActivationPreview` +
  confirmed writes + brain-graph edges.
- **Phase 7 — Travel Explorer polish.** Itinerary editing, labeled flight watch, optional
  real provider adapter.
- **Phase 8 — Memory Timeline.** Timeline view, richer reflections, dashboard memory tile.

Each phase is independently shippable and preserves all §2 behavior.

---

## 16 · Testing strategy

Mirror the existing quality gates (`tsc --noEmit`, scoped ESLint, manual QA) and add:

- **Unit (Vitest, alongside existing `*.test.ts` like `resolve-bucket-dream-image.test.ts`):**
  readiness rule engine, cover resolution priority + provenance logic, activation-preview
  builder, capture-draft normalization, quota math.
- **API route tests:** auth 401, invalid JSON 400, quota 429, Zod-boundary validation,
  grounded `unverified` propagation, that capture/preview routes perform **no** writes.
- **AI contract tests:** Zod schemas reject malformed Gemini output; two-call grounded
  pattern keeps `unverified` honest.
- **RLS tests:** new tables/bucket deny cross-user access; storage folder policy enforced.
- **Safety regression tests:** generated covers always carry `is_ai_generated`; no
  activation write occurs without the confirm step (verify via repository call spies);
  reflection summaries never include un-provided content (prompt + schema constraints).
- **i18n:** new strings exist in EN + zh-TW maps with EN fallback.
- **Manual QA script** extended from `bucket-list-build-summary.md` §7 to cover capture,
  cover generation (badge visible), intelligence signals, activation preview/confirm, and
  the memory timeline.
- **Non-regression:** existing 10-step QA + Dashboard/Projects/Finance SDK consumers
  unaffected.
</content>
