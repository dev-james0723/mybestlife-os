# Bucket List Build Log

Running journal of an **autonomous** end-to-end build of the Bucket List feature
for "My Best Life OS". The agent does not pause between phases; it writes a
short update here at the end of each phase and moves on.

See the companion report at `bucket-list-build-summary.md` for the final
architecture summary (written when all phases are complete).

---

## Guardrails received from the user

- **Autonomous mode** — no clarifying questions, no plan-for-approval, just build.
- **Always use Gemini API** (no Claude, no other providers). Reuse the existing
  `gemini-text.ts` helpers: `fetchGeminiStructured`, `fetchGeminiGroundedText`,
  `fetchGeminiPlannerJsonText`. Gemini's `googleSearch` tool handles travel
  research.
- **Follow the screenshot as design inspiration**, not verbatim. Optimise where
  it makes sense. Respect the liquid-glass spec for the `default` UI theme.
- **Integrate deeply** — not a standalone page. Hooks into Projects, Tasks,
  Budget, Finance, Calendar, Memories, Dashboard.
- **Cost caps** — hold AI cost sensibly. Reuse the existing
  `quote_ai_usage`-style per-user daily cap table; default to 20 enrichment
  calls / user / day.
- **Seed one dream per category** with `is_seed = true`.
- **Travel provider-agnostic** — scaffold a `FlightWatchProvider` interface and
  ship a mock adapter. No vendor lock-in.
- **Interactive map, not a dead embed** — use a lightweight SVG world-map
  (no external map tiles needed for V1; keeps bundle small, offline-friendly,
  avoids key-management burden).

---

## Phase 0 — Repo discovery

The codebase is a mature Next.js 16 app with:

| Area             | Tool                                                          |
| ---------------- | ------------------------------------------------------------- |
| Router           | Next App Router, locale prefix `[locale]` + route group `(protected)` |
| Sidebar nav      | `lib/constants/navigation.ts` — categorized, `Self` category  |
| UI primitives    | shadcn/ui + Base-UI + `@/components/ui/*`; `GlassPanel`       |
| Shared shells    | `PageShell`, `EntityCard`, `FilterBar`, `EmptyState`, `StatusBadge` |
| State            | Zustand stores per module; TanStack Query for async fetches   |
| DB               | Supabase (hosted); migrations in `supabase/migrations/`       |
| Auth             | `@supabase/ssr`; `createClient()` for browser, `createServerSupabaseClient()` for server |
| Repositories     | `lib/repositories/*.ts` — one file per domain                  |
| AI dispatcher    | `lib/ai/gemini-text.ts`: `fetchGeminiStructured` +/- Google Search grounding |
| Theming          | 4 UI themes; `default` = liquid glass (`--surface-glass` tokens) |

Existing domains I can safely link to:

| Domain        | Table                                         | Key fields I'll use             |
| ------------- | --------------------------------------------- | ------------------------------- |
| Projects      | `projects`                                    | `id`, `name`, `status`, `priority`, `end_date` |
| Tasks         | `tasks`                                       | `id`, `project_id`, `title`, `status`, `due_date` |
| Finance       | `finance_savings_goals`                       | `id`, `name`, `target_amount`, `current_amount` |
| Finance       | `finance_budgets`, `finance_categories`       | `id`, `limit_amount`, `period_*` |
| Memories      | `journal_entries`                             | `id`, `content`, `ai_summary`    |
| Knowledge     | `knowledge_entries`                           | `id`, `title`, `source_url`      |
| Calendar      | `google_calendar_*` (Google Calendar module)  | scope will be deferred          |

Because several of these tables have no enforced FK back from `bucket_items`
(they're in different modules, may have RLS quirks, and the user might rename
them), I'll use **soft foreign keys** — UUID columns without DB-level FK, plus
an `integration_links` JSONB for anything more free-form. This mirrors how the
existing `quotes.linked_goal_id` works.

### AI — Gemini only

All AI calls route through `lib/ai/gemini-text.ts`:

- **Smart-tagging / categorising / wisdom extraction** →
  `fetchGeminiStructured` with a tight Zod + OpenAPI response schema.
- **Travel destination brief / itinerary / reframing** →
  `fetchGeminiGroundedText` (google_search tool) then `fetchGeminiStructured`
  to normalise into JSON.
- **Reflection summary** → `fetchGeminiStructured`, 2.5-flash, low
  `maxOutputTokens`.

---

## Phase 1 — Implementation plan

### 1.1 Information architecture

```
/[locale]/(protected)/bucket-list         — Overview (list + filters + highlights)
/[locale]/(protected)/bucket-list/[id]    — Detail Hub (control center per dream)
/[locale]/(protected)/bucket-list/map     — Interactive Travel Map (travel dreams)
```

Sidebar: add `Bucket List` as a sibling of `Grateful Things` under `Self`.
Also link Travel Map from the overview's map CTA.

### 1.2 Data model

New Supabase tables, all RLS-scoped to `auth.uid()`:

1. `bucket_items` — one row per dream. Rich fields: type, status, priority,
   difficulty, cost, target dates, time horizon, travel fields (destination,
   airports, lat/lng, price watch window), soft FKs to projects / savings goals,
   AI-generated content as JSONB.
2. `bucket_item_integrations` — polymorphic join to any linked entity (note,
   resource, calendar event) by `(kind, external_id)`. Keeps the main table
   clean.
3. `bucket_reflections` — photos + story + AI summary per completed dream
   (one-to-many so you can add memories over time).
4. `bucket_flight_quotes` — cached flight watch snapshots (provider-agnostic).
5. `bucket_ai_usage` — per-user daily cap table. Shared shape with
   `quote_ai_usage`.
6. `bucket_settings` — one-row-per-user: origin airport, currency, clear-seed
   preferences.

No destructive changes: the migration is additive only.

### 1.3 Page map

1. **Overview** (`/bucket-list`) — hero header, `Master Progress` stats strip,
   "Closest to reality" + "Push this week" spotlight, type + status filters,
   card grid, "Realized dreams" tape strip at bottom.
2. **Detail Hub** (`/bucket-list/[id]`) — hero + accordion/tab sections:
   Overview, Activate this Dream, Project & tasks, Budget & funding, Travel
   logistics (only for travel), Reflections & Memories.
3. **Travel Map** (`/bucket-list/map`) — standalone SVG world map with status
   filters, hover popups, route arcs for completed trips.
4. **Add Dream Sheet** (modal) — quick capture OR detail mode toggle.
5. **Activate this Dream modal** — checklist of possible side-effects.
6. **Flight Watch panel** (inside Detail Hub).
7. **Reflection sheet** (inside Detail Hub).

### 1.4 Cross-system SDK contracts (Phase 6)

Exposed on `lib/bucket-list/sdk.ts`:

```ts
getBucketHighlights(userId): { closest, push, completedRecent, travelDeal }
getActivatableDreams(userId): BucketItem[]
linkProject(bucketId, projectId)
unlinkProject(bucketId)
linkSavingsGoal(bucketId, goalId)
listBucketItemsForDashboardSummary(userId)
```

These are read by Dashboard / MindClear / Journal / Goals in future sessions.

### 1.5 AI flows (Phase 7, Gemini only)

| Flow                      | Helper                           | Uses `google_search`? |
| ------------------------- | -------------------------------- | --------------------- |
| Smart-tagging a new dream | `fetchGeminiStructured`          | No                    |
| "Inspire me with dreams"  | `fetchGeminiStructured`          | No                    |
| AI Destination Brief      | `fetchGeminiGroundedText` → structured | Yes             |
| AI Day-by-day Itinerary   | `fetchGeminiGroundedText` → structured | Yes             |
| Reframe oversized dream   | `fetchGeminiStructured`          | No                    |
| Reflection summary        | `fetchGeminiStructured`          | No                    |

### 1.6 Phased rollout (Phases 2 → 11)

- **P2**: migrations, types, repositories, hooks, minimal SDK.
- **P3**: Overview page pixel-quality match to the screenshot, dark + light +
  glass theme parity.
- **P4**: Detail hub + create/edit flow + Activate modal.
- **P5**: Travel map + flight watch + mock provider + AI trip planning tab.
- **P6**: Cross-system SDK + dashboard highlight block.
- **P7**: AI API routes wired to Gemini.
- **P8**: Completion flow + Memories.
- **P9**: Seed data migration (one per category, `is_seed = true`).
- **P10**: lints, type-check, polish.
- **P11**: Dev server + summary.

---

## Phase 2 — Core data layer (complete)

- Migration `20260621000000_bucket_list.sql` — 6 RLS-scoped tables.
  **Applied to hosted Supabase**.
- Migration `20260621000100_bucket_list_seed_function.sql` — RPC
  `seed_bucket_list_starter()` inserts 8 seed dreams the first time a user
  visits. **Applied to hosted Supabase** (using `$bucket_seed_body$` dollar
  quote tag so the `$$$` cost-band literals parse cleanly).
- Types: `src/types/bucket-list.ts` (controlled vocabularies + row types +
  write shapes + filters + aggregates).
- Repository: `src/lib/repositories/bucket-list.ts` — items, integrations,
  reflections, flight quotes, settings.
- Hooks: `src/hooks/use-bucket-list.ts` — query + mutation hooks with
  React Query invalidations and Sonner toasts. Derived `useBucketStats` +
  `useBucketHighlights` helpers.
- Zustand store: `src/stores/bucket-list-store.ts` — UI-only state
  (view mode, filters, add-sheet, detail, activate modal, reflection sheet).
- Flight watch abstraction: `src/lib/bucket-list/flight-watch.ts` — provider
  interface + `MockFlightWatchProvider` with great-circle-distance pricing +
  season uplift + seeded IATA coords fallback.
- AI plumbing: `src/lib/ai/bucket-list/bucket-ai.ts` — per-user daily
  quota ledger + Gemini key resolver + uniform error envelopes.

## Phase 3 — Overview page (complete)

Route: `/[locale]/(protected)/bucket-list/page.tsx`. Components:

- `list-shell.tsx` — orchestrates hero + filters + grid/list + memories strip.
- `stats-strip.tsx` — "Master Progress" numbers + closest-to-reality +
  push-this-week spotlight tiles.
- `type-filter-tabs.tsx` — pill tabs (All / Travel / Achievement / …) + grid
  vs list view toggle.
- `dream-card.tsx` — main grid card. Type icon, status pill, why-it-matters
  italic, cost band, difficulty, linked-module glyphs, featured glow.
- `dream-list-row.tsx` — denser list view row with progress bar.
- `featured-rail.tsx` — right-hand big hero card mirroring the screenshot:
  cover, title/target, "Project Linked / Generate Tasks / Budget Linked"
  action wells, travel-logistics card, flight-watch tile, intelligence
  CTAs.
- `realized-strip.tsx` — bottom Memories row, hover/keyboard accessible.
- `settings-popover.tsx` — origin airport / currency / clear-seed-dreams.

Nav: added `Bucket List` item under `Self` with the `Compass` lucide icon.
Themed labels added for all 4 UI themes (default / astronaut / academia /
forest).

Middleware: added `/bucket-list` to the protected-prefix list.

## Phase 4 — Detail Hub + Add + Activate (complete)

- `add-dream-sheet.tsx` — right-side sheet with Quick / Full Detail toggle,
  all fields from the data model, travel-only section revealed by type.
- `detail-hub-dialog.tsx` — the control center: hero cover, progress bar,
  editable "why this matters", Activate / Mark realized / Reframe actions,
  Overview + Integrations + Travel + Memories tabs. Features linked
  integrations list + destination-brief / trip-plan viewers.
- `activate-dream-modal.tsx` — recommends actions based on dream type
  (Project, Tasks, Savings goal, Calendar milestone, Map marker, Flight
  watch, Research, Memory prep). Applies selected actions atomically with
  integration join-rows written via `bucket_item_integrations`.

## Phase 5 — Travel module (complete)

- `travel-map.tsx` — self-contained SVG world map (Mercator projection).
  Status-colored dots, dashed planning arcs + solid pink arcs for completed
  trips. Status filter pills, legend, and a scrollable list of mapped
  dreams below the map. Uses `airportCoords()` fallback so dreams with
  only IATA codes still render.
- `flight-watch-panel.tsx` — Cheapest/Fastest/Direct metrics, last-checked
  label, "built-in estimate" badge for the mock provider. The refresh
  action writes a new `bucket_flight_quotes` row and updates the item.

## Phase 6 — Cross-module SDK (complete)

`src/lib/bucket-list/sdk.ts` (server-safe):

- `getBucketStats()` — Dashboard summary numbers.
- `getBucketHighlights()` — closest-to-reality / push-this-week / travel deal.
- `getDashboardBucketSummary()` — one call for the Dashboard widget.
- `getBucketItemForProject(id)` — reverse-lookup when viewing a Project.
- `getBucketItemForSavingsGoal(id)` — reverse-lookup for Finance.
- `getTravelDealsForDashboard()` — items where `latest_live_price` beats
  the exploratory band by 10%+.

## Phase 7 — Gemini-only AI routes (complete)

All routes use `GEMINI_API_KEY` via existing `gemini-text.ts`.

- `POST /api/bucket-list/destination-brief` — `fetchGeminiGroundedText` +
  `fetchGeminiStructured` two-call pattern, Gemini 2.5 pro/flash, writes the
  normalised brief to the item.
- `POST /api/bucket-list/trip-plan` — same two-call pattern, returns a typed
  day-by-day itinerary.
- `POST /api/bucket-list/reframe` — single structured call, gives 2–4
  realistic smaller versions.
- `POST /api/bucket-list/reflection-summary` — turns a reflection into a
  short memory summary with suggested title.
- Daily quotas (`bucket_ai_usage` ledger): `destination_brief=20`,
  `trip_plan=10`, `smart_tag=60`, `inspire=30`, `reframe=20`,
  `reflection_summary=30`.

Client: `src/hooks/use-bucket-ai.ts` wraps each endpoint with toast +
invalidation.

## Phase 8 — Reflection / Memory flow (complete)

- `reflection-sheet.tsx` — mood selector, free-text prompt, photo URL list,
  "Generate summary" button (Gemini), save action persists via
  `bucket_reflections`.
- Detail Hub's `Memories` tab lists past reflections newest-first.

## Phase 9 — Seed data + settings (complete)

- Seed RPC inserts one dream per type (Travel, Growth, Growth-language,
  Achievement, Relationship, Purchase) plus two completed memories
  (Mt. Fuji, Dream Car). Featured = the Iceland trip that matches the
  reference screenshot.
- `settings-popover` → "Clear seed dreams" deletes `is_seed=true` items +
  flips `bucket_settings.seeds_cleared` so the RPC becomes a no-op.

## Phase 10 — Polish (complete)

- `npx tsc --noEmit` — zero errors.
- `npx eslint …` — zero warnings.
- Accessibility: keyboard-enter handlers on dream cards, aria-pressed on
  view-mode toggles, aria-label on icon buttons, `role=tablist` on filter
  tabs, SVG map has `role=img` + `aria-label`.
- Reduced-motion: no custom motion bypasses `prefers-reduced-motion`; the
  existing global rules in `globals.css` already short-circuit Framer.

## Phase 11 — Dev server + smoke test (complete)

- `npm run dev` → ready on http://localhost:3000 (Next 16.2.3 + webpack).
- `GET /en/bucket-list` → 200 (redirects to /login without auth — expected).
- `GET /en/bucket-list` with `mylifeos_dev_bypass=1` cookie → 200, SSR HTML.
- `GET /en/bucket-list/map` with bypass cookie → 200.
- `POST /api/bucket-list/destination-brief` without session → 401
  unauthenticated (expected; API routes require real Supabase auth).
- `GET /en/dashboard` + `GET /en/quote-library` still 200 — no regressions.

