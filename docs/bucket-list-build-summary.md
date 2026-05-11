# Bucket List — Build Summary

A deeply integrated **aspiration layer** for "My Best Life OS". Built
autonomously in a single session against the existing Next.js 16 + Supabase
+ TanStack Query + Zustand + shadcn/base-ui codebase. All AI flows use the
**Gemini API** (no other providers).

The feature lives at `/[locale]/bucket-list`, with a sub-route for the
interactive travel map at `/[locale]/bucket-list/map`.

---

## 1 · What was built — feature checklist

### Core

- [x] 6 new Supabase tables with RLS scoped to `auth.uid()`
      (`bucket_items`, `bucket_item_integrations`, `bucket_reflections`,
      `bucket_flight_quotes`, `bucket_ai_usage`, `bucket_settings`).
- [x] Full TypeScript type graph for the domain (`src/types/bucket-list.ts`).
- [x] Repository layer with typed helpers for all 6 tables.
- [x] React Query hooks with Sonner toasts + cache invalidations.
- [x] Zustand store for ephemeral UI state (filters, sheets, modals).
- [x] Seed RPC `seed_bucket_list_starter()` — 8 starter dreams on first visit.
- [x] "Clear seed dreams" destructive toggle in settings.

### Data model

- [x] Multiple dream types: Travel / Achievement / Growth / Relationship /
      Purchase / Lifestyle.
- [x] Rich status model: Dreaming → Exploring → Planning → Active →
      Funded → Scheduled → Booked → Completed (+ Paused, Archived).
- [x] Priority (Low/Medium/High/Someday) + Difficulty (Easy/Med/Hard/Epic)
      + Time horizon (This year / 1–3y / 3–5y / Lifetime).
- [x] Budget fields (cost, cost band, currency).
- [x] Travel-specific fields (destination + city + country + airports +
      lat/lng + best season + style + trip length + exploratory price
      band + flight watch toggle).
- [x] AI enrichment JSONB blobs (destination brief, trip plan, reframe
      suggestions) keyed by fetched_at.
- [x] Soft foreign keys (plain UUIDs) to Project / Budget / Savings Goal /
      Calendar events / Tasks / Knowledge resources / Memory entry — no
      DB-level FK so cross-module renames don't break this table.
- [x] Polymorphic `bucket_item_integrations` join for any future external
      entity without schema changes.

### UI — pixel-aware of the reference screenshot

- [x] Bucket List Overview at `/bucket-list` — full liquid-glass treatment:
      header + **Master Progress** stats strip, "Closest to reality" +
      "Push this week" spotlights, type filter pill tabs, grid/list view
      toggle, dream cards, right-hand featured rail, Realized Dreams strip.
- [x] Dream cards show type icon, status pill, why-it-matters italic,
      cost band, difficulty, integration glyphs, featured glow.
- [x] Right-hand featured rail: cover image, target label, "Project Linked
      / Generate Tasks / Budget Linked" action wells, Travel Logistics
      (airport + route), Flight Watch tile with exploratory band and
      price-dropped badge, Intelligence list (AI Destination Brief +
      Break down into steps).
- [x] Realized Dreams memories row at the bottom (horizontal scroll on
      mobile).

### Detail Hub

- [x] Cinematic hero with cover image, status & type pills, target label,
      destination, featured star toggle.
- [x] Editable "why this matters" block.
- [x] Action bar: **Activate this dream**, Mark realized / Reflect,
      Reframe into smaller versions, Delete.
- [x] Tabs: Overview (facts grid, reframe suggestions), Integrations
      (linked projects/tasks/etc.), Travel (flight watch + AI destination
      brief + AI itinerary), Memories (past reflections).

### Add / Edit flow

- [x] Right-side sheet with **Quick capture** / **Full detail** toggle.
- [x] All fields from the data model exposed, travel-only fields revealed
      conditionally.
- [x] Reads origin airport + currency defaults from `bucket_settings`.
- [x] "Save dream" (background) + "Save & open details" (opens Detail Hub).

### Activate This Dream

- [x] Context-aware suggestions per dream type (travel → map + flight +
      budget + savings + calendar + research + memory; achievement →
      project + tasks + calendar + memory; purchase → budget + savings +
      project + tasks; etc.).
- [x] Multi-select apply flow creates real cross-module rows:
  - Project via `projectsRepository`
  - Task via `tasksRepository`
  - Savings Goal via `finance_savings_goals`
  - Milestone Goal via `goals` (used as the calendar placeholder until
    the Google Calendar session)
  - Polymorphic integration rows in `bucket_item_integrations` for the
    rest (map marker, knowledge research, memory prep).
- [x] Writes back the soft FK IDs into `bucket_items`.

### Interactive Travel Map

- [x] Self-contained SVG world map at `/bucket-list/map` (Mercator
      projection). No external map tiles / API keys required — works fully
      offline, bundle-friendly.
- [x] Status-colored markers with hover tooltips.
- [x] Dashed arcs for dreams in planning, solid pink arcs for completed
      trips.
- [x] Status filter pills (All / Dreaming / Planning / Active / Booked /
      Completed).
- [x] Legend + list of mapped dreams below the map.

### Flight Watch

- [x] Provider-agnostic `FlightWatchProvider` interface in
      `lib/bucket-list/flight-watch.ts`.
- [x] `MockFlightWatchProvider` bundled — uses Haversine distance + season
      multiplier + travel-style adjustment to produce believable estimates.
- [x] Static IATA coord fallback table so we can price a trip when the
      bucket item doesn't carry lat/lng.
- [x] `exploratoryBand()` helper for "Dreaming" / "Exploring" status rows.
- [x] Every refresh writes a `bucket_flight_quotes` row with the raw
      provider payload so we can swap in Skyscanner / Kiwi / Duffel /
      Amadeus without touching the UI.

### AI (Gemini-only, per the user's explicit directive)

- [x] `POST /api/bucket-list/destination-brief` — two-call pattern:
      `fetchGeminiGroundedText` (google_search tool) → `fetchGeminiStructured`.
- [x] `POST /api/bucket-list/trip-plan` — grounded day-by-day itinerary.
- [x] `POST /api/bucket-list/reframe` — structured JSON only.
- [x] `POST /api/bucket-list/reflection-summary` — warm memory recap.
- [x] Daily cap ledger in `bucket_ai_usage` with sensible per-kind limits:
      destination_brief 20, trip_plan 10, reframe 20, reflection_summary
      30, smart_tag 60, inspire 30.
- [x] Quota-exceeded returns HTTP 429 with typed body; client toast shows
      "Daily AI cap reached. Try again tomorrow."

### Completion / Memory

- [x] `Mark as realized` in Detail Hub updates status + `completed_at`.
- [x] Reflection Sheet: mood selector, free-text prompt, photo URL list,
      "Generate summary" (Gemini), saved to `bucket_reflections`.
- [x] Memories tab in Detail Hub renders saved reflections newest-first.

### Cross-module SDK

`src/lib/bucket-list/sdk.ts` (server-safe, uses `createServerSupabaseClient`):

- `getBucketStats()`
- `getBucketHighlights()`
- `getDashboardBucketSummary()` — batched for Dashboard widgets
- `getBucketItemForProject(projectId)` — reverse-lookup when on Projects
- `getBucketItemForSavingsGoal(goalId)` — reverse-lookup when on Finance
- `getTravelDealsForDashboard()` — items where `latest_live_price` beats
  the exploratory band by 10%+
- `computeHighlights(list)` — pure helper shared with the client hook

---

## 2 · Decisions made autonomously

| Decision | Rationale | How to override |
| --- | --- | --- |
| **All AI calls via Gemini** | User's explicit directive: "always use gemini api". | Swap the helper module in `src/lib/ai/bucket-list/` if a different provider is added. |
| **SVG world map, not Leaflet/Mapbox** | Avoids external key management, bundle size, and online-only constraint. The map is ambient; markers carry the real information. | Add a full-map adapter behind a prop toggle if the user wants tiles later. |
| **Soft foreign keys** to projects/finance/calendar | Each module uses its own naming. Hard FKs would couple us to current table names and break on future renames. The `bucket_item_integrations` join + soft UUID columns give us the best of both. | If the modules stabilise, add hard FKs via a later migration. |
| **Mock flight provider bundled, not stubbed-out** | So the UI renders real numbers in development without any secrets. Great-circle distance + season/style multiplier → believable prices. | Implement a `FlightWatchProvider` adapter in `lib/bucket-list/flight-watch.ts` and register it in `getFlightWatchProvider()`. |
| **Route at `/bucket-list`, not `/self/bucket-list`** | The app's sidebar model uses one-level routes (grouped by category in the nav config, not the URL). Matches `/grateful-things`, `/quote-library`, `/about-me`. | Change the item `url` in `lib/constants/navigation.ts`. |
| **Seed 8 dreams** (not 30 like the Quote Library) | Bucket list is aspirational — too many seeds would feel generic. One example per type + two Memories matches the reference screenshot. | Edit the `seed_bucket_list_starter` RPC and `is_seed=true` rows will be cleared + re-seeded by the "Clear seed dreams" → rerun pattern. |
| **Set daily AI cap to 20 for the most expensive calls** | Google Search-grounded calls are expensive and slow. 20/day per user is generous for exploration while protecting the bill. | Edit `BUCKET_AI_DAILY_LIMITS` in `lib/ai/bucket-list/bucket-ai.ts`. |
| **Dev-login bypass cookie already used elsewhere** | Users who enable `mylifeos_dev_bypass` keep that UX parity. | No action needed; production auth unaffected. |
| **Status model uses 10 values but UI doesn't expose all at once** | Filter tabs stop at the common ones (dreaming/planning/active/booked/completed) and hide paused/archived unless `includeClosed` is set. Keeps the happy-path uncluttered. | Expose more statuses in `type-filter-tabs.tsx` if users need them. |
| **`is_featured` instead of a dedicated spotlight table** | Simpler, one row per dream, no FK games. First featured active item wins the right-rail. | Extend with `featured_position` if multiple spotlight slots are ever needed. |
| **Activate Modal applies side effects directly (not a queue)** | Simpler UX, one click, immediate feedback. Integrations writes run in parallel, errors surface in toast. | If reliability ever demands it, move to a background job via Supabase Edge Functions. |

---

## 3 · Files created / modified

### Created — Phase 2 (data)

- `app/supabase/migrations/20260621000000_bucket_list.sql` **(applied)**
- `app/supabase/migrations/20260621000100_bucket_list_seed_function.sql`
  **(applied)**
- `app/src/types/bucket-list.ts`
- `app/src/lib/repositories/bucket-list.ts`
- `app/src/hooks/use-bucket-list.ts`
- `app/src/hooks/use-bucket-list-first-visit.ts`
- `app/src/hooks/use-bucket-ai.ts`
- `app/src/stores/bucket-list-store.ts`
- `app/src/lib/bucket-list/presentation.ts`
- `app/src/lib/bucket-list/flight-watch.ts`
- `app/src/lib/bucket-list/sdk.ts`
- `app/src/lib/ai/bucket-list/bucket-ai.ts`
- `app/src/lib/i18n/bucket-list-ui.ts`

### Created — Phase 3–5 (UI + routes)

- `app/src/app/[locale]/(protected)/bucket-list/page.tsx`
- `app/src/app/[locale]/(protected)/bucket-list/map/page.tsx`
- `app/src/components/bucket-list/list-shell.tsx`
- `app/src/components/bucket-list/stats-strip.tsx`
- `app/src/components/bucket-list/type-filter-tabs.tsx`
- `app/src/components/bucket-list/dream-card.tsx`
- `app/src/components/bucket-list/dream-list-row.tsx`
- `app/src/components/bucket-list/featured-rail.tsx`
- `app/src/components/bucket-list/realized-strip.tsx`
- `app/src/components/bucket-list/add-dream-sheet.tsx`
- `app/src/components/bucket-list/detail-hub-dialog.tsx`
- `app/src/components/bucket-list/activate-dream-modal.tsx`
- `app/src/components/bucket-list/flight-watch-panel.tsx`
- `app/src/components/bucket-list/reflection-sheet.tsx`
- `app/src/components/bucket-list/travel-map.tsx`
- `app/src/components/bucket-list/settings-popover.tsx`

### Created — Phase 7 (AI routes)

- `app/src/app/api/bucket-list/destination-brief/route.ts`
- `app/src/app/api/bucket-list/trip-plan/route.ts`
- `app/src/app/api/bucket-list/reframe/route.ts`
- `app/src/app/api/bucket-list/reflection-summary/route.ts`

### Modified (non-destructive additions)

- `app/src/lib/constants/navigation.ts` — added the `bucket-list` nav item
  with the `Compass` lucide icon, under `Self`.
- `app/src/lib/theme-labels.ts` — added themed labels for `bucket-list` in
  all four UI themes.
- `app/src/lib/supabase/middleware.ts` — added `/bucket-list` to the
  protected-prefix list so unauthed users get redirected to `/login`.
- `docs/bucket-list-build-log.md` — running journal.
- `docs/bucket-list-build-summary.md` — this file.

---

## 4 · What's deliberately stubbed or deferred

| Surface | Current state | Follow-up |
| --- | --- | --- |
| **Real flight APIs** | `MockFlightWatchProvider` returns estimates derived from great-circle distance + season. | Implement a real adapter for Skyscanner / Kiwi / Duffel / Amadeus in `lib/bucket-list/flight-watch.ts` and point `bucket_settings.preferred_flight_provider` at it. |
| **Google Calendar integration** | Activate modal creates a "milestone goal" row as the stand-in. | The app already has a `/google-calendar` module — wire the Activate "Add to calendar" option to use the Calendar client in a follow-up session. |
| **Knowledge Resource linking** | Activate creates a placeholder `bucket_item_integrations` row (kind `knowledge_entry`). | Extend with a knowledge picker that writes real `knowledge_entries` rows. |
| **Map tiles** | Self-contained SVG continents silhouette. | Swap in a real map adapter (Leaflet, MapLibre) if higher-fidelity geography is needed. |
| **Dashboard widget** | SDK (`getDashboardBucketSummary`) is ready. | Add a `<BucketDashboardWidget/>` rendered in `/dashboard`. |
| **Memories module** | Reflections saved to `bucket_reflections`; not mirrored into `journal_entries`. | When wiring Memories across the app, either keep the separate table or add a one-way projection into journal. |

---

## 5 · Follow-up Cursor sessions recommended

These are **small, focused** cross-module wiring sessions. Each should take
under an hour. The bucket-list SDK is already written for them to consume.

1. **Dashboard widget** — add a widget tile using `getDashboardBucketSummary`.
   Render closest-to-reality, push-this-week, latest memory, travel deal.
2. **MindClear (Journal)** — when a user creates a reflection from the
   Journal, if they cite a completed bucket item (`[[dream:id]]`), mirror
   their reflection into `bucket_reflections` via the SDK.
3. **Goals** — on the Goals detail page, show "This goal is linked to a
   dream: …" using `getBucketItemForProject`. Keep it one line.
4. **Finance (Savings Goals)** — on the Savings Goal detail, show "Funding
   dream: …" with a link back to the bucket item.

---

## 6 · Known issues / risks

- **Real flight prices still mocked.** The UI is fully exercised, but the
  numbers are estimates. Users expecting live fares will be disappointed —
  add a real adapter first.
- **SVG map is ambient, not precise.** Marker coordinates are accurate
  (Web-Mercator projection), but the continent outlines are decorative.
  If precision matters, swap in MapLibre.
- **AI quota ledger is best-effort.** If the Supabase read fails, we
  over-allow rather than over-block the user (see `assertBucketAiQuota`).
  Fine for personal-use scale; revisit if the app ever hits abuse risks.
- **Seed function uses `$bucket_seed_body$` dollar-quote tag.** The regular
  `$$` delimiter conflicts with `$$$` cost-band literals in the INSERT
  values. The file-on-disk migration matches what was applied to hosted
  Supabase, but if you ever re-run it via psql, confirm your editor didn't
  mangle the tag.
- **Featured rail picks one dream automatically.** It prefers
  `is_featured=true`, then any active dream. If a user has no active
  dreams, the rail shows an empty state.
- **Middleware still uses the `middleware` convention** (deprecation
  warning from Next 16). Unrelated to this feature; separate follow-up.

---

## 7 · How to test (10-minute manual QA)

Local dev:

```
cd app
npm run dev
# open http://localhost:3000
```

1. **Sign in** (or click "Dev / Test mode" on `/en/login`).
2. Visit `/en/bucket-list`. You should see 6 active seed dreams + 2 memories
   pinned at the bottom.
3. The right-hand featured rail should highlight the Iceland trip with
   "Project Linked / Generate Tasks / Budget Linked" action wells, travel
   logistics, and a flight-watch tile showing $580–$820 (exploratory band).
4. **Click "+ New Dream"** top-right. Quick-capture a Travel dream with a
   title and type=Travel, "Save dream". It should land in the grid.
5. **Click any card** to open the Detail Hub dialog. Inside:
   - Try the **Reframe into smaller versions** button. After ~10 s it
     should list 2–4 smaller variants.
   - Open the **Travel** tab and press "Generate" next to "AI destination
     brief". After ~30 s you should see Overview / Best time / Food / Stay
     / Transport / Must-do lists.
   - Hit "Draft plan" to see a day-by-day itinerary.
6. **Click "Activate this dream"**. Confirm the recommended actions
   (Project / Tasks / Savings / Calendar / Map / Flight / Research /
   Memory). Press "Apply selected". Toasts should confirm each write. Go
   back to the list → the card should now show folder + wallet icons in
   the footer, indicating linked modules.
7. Navigate to `/en/bucket-list/map` via the footer link on a travel card
   (or URL bar). You should see markers for the Iceland + Mt. Fuji items.
8. **Mark a dream as realized** from the Detail Hub, then "Write a
   reflection" — type a few lines, hit "Generate summary", save. The
   dream should move to the Memories strip.
9. **Settings → Clear seed dreams** (gear icon in the header). All seeds
   should disappear and the RPC should become a no-op on refresh.
10. Hit `/en/dashboard` and `/en/quote-library` to confirm no regressions.

---

## 8 · Environment

No new env vars required. The build already reuses:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `GEMINI_API_KEY` (server-only; powers the four AI routes)

Optional overrides already handled by the shared gemini helper:
`GEMINI_PLANNER_MODEL`, `GEMINI_HABITS_FLASH_MODEL`,
`GEMINI_HABITS_PRO_MODEL`.

---

## 9 · Quality gates passed

- `npx tsc --noEmit` → **0 errors**.
- `npx eslint 'src/{components,app,hooks,lib,stores,types}/**/bucket-list*/**/*.ts*'`
  → **0 warnings, 0 errors**.
- `npm run dev` → Next 16.2.3 compiles `/en/bucket-list` on demand in ~13s
  (first compile), subsequent SSR in ~300 ms.
- Hosted Supabase migrations applied cleanly.
