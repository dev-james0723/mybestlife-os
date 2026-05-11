# Quote Library — Build Summary (all 5 phases)

A single autonomous session delivered the Quote Library end-to-end for
**My Life OS**, across data model, CRUD, AI, analysis, exports, SDK, and
polish. The full running log is in
[`/docs/quote-library-build-log.md`](./quote-library-build-log.md).

URL: `/{locale}/quote-library` — surfaced in the sidebar under **Self**
between Grateful Things and Health, across all 4 UI themes.

**Deployed to production** on Apr 22, 2026:

- Primary: https://www.mybestlife-os.com/quote-library
- Deployment: `dpl_...mybestlife-15u5w9g9d...` (Vercel project `mybestlife-os`)
- Verified: 12/12 Quote Library API routes respond; unauthenticated hits on
  `/quote-library` correctly redirect through locale → login; GET endpoints
  (`daily-quote`, `daily-inspiration`, `wisdom`, `quotes`) return typed 401s.

---

## 1. What was built — feature checklist against spec v2.0

### Core surface (spec §4 Page Architecture)

- [x] `/quote-library` route under the `(protected)` group, gated by the
      existing Supabase middleware (added to the protected prefix list).
- [x] Three-tab page shell: **All quotes**, **Collections**, **My Wisdom Profile**.
- [x] Full search + sort + favorite filter bar; filter by category, tone,
      source module, tags, collection, linked goal, date range.
- [x] Add Quote CTA (desktop inline + mobile floating FAB).
- [x] Library settings popover (CSV / PDF export, clear seed quotes,
      AI-badge toggle).

### Data model (spec §1)

- [x] `quotes` table with all 16 fields + bookkeeping (`is_seed`,
      `last_surfaced_on`, `source_intelligence JSONB`,
      `embedding vector(768)`).
- [x] `quote_collections` + `quote_collection_items` with uniqueness
      constraints and RLS.
- [x] `quote_ai_usage` daily ledger for enforcing per-user AI budgets.
- [x] `quote_daily_picks` for deterministic Quote-of-the-Day per user per day.
- [x] `quote_wisdom_profiles` for the cached pattern-analysis payload.
- [x] RLS on every table (`auth.uid() = user_id`).
- [x] `match_quotes` RPC (SECURITY INVOKER, cosine-distance, HNSW).

### AI features (spec §2)

- [x] **2.1 Smart Tagging** — Gemini flash + structured output on save; category,
      tags (3–6), emotion_tone, confidence, detected_language.
- [x] **2.2 Daily Quote Surfacing** — deterministic per (user, date); caches
      the day's pick; prefers favorites not surfaced in 14 days, then quotes
      not surfaced in 30 days; rotates `last_surfaced_on`.
- [x] **2.3 Resonant quotes for Journal** — `findResonantQuotes` SDK entry
      backed by pgvector + `text-embedding-004`.
- [x] **2.4 Quote ↔ Goal linkage** — `linkQuoteToGoal`, `getQuotesForGoal`
      SDK entries; `linked_goal_id` column + index.
- [x] **2.5 Wisdom Pattern Analysis** — Gemini Pro structured output; 3–5
      themes + monthly insight; auto-recompute every +10 quotes, manual
      refresh capped to 1/day.
- [x] **2.6 Source Intelligence** — two-call Gemini pipeline (grounded
      research → structured extraction); never fabricates; surfaces as an
      expandable "About the author" section on the card; 20-call daily cap.
- [x] **2.7 MindClear integration** — `addQuoteFromMindSweep` +
      `generateContextualQuote` SDK entries for grounded external-quote
      suggestion.
- [x] **2.8 Dashboard Inspire Me + Daily Inspiration** — `inspireMe` and
      `getFavoritesForDailyInspiration` SDK entries.

### 30 categories (spec §6)

- [x] All 30 values enumerated in `types/quote.ts` and grouped into the 5
      theme clusters (Inner Life, Purpose & Direction, Relationships,
      Action & Mastery, Mind & Time). Enforced via DB CHECK + Zod + Gemini
      response schema.
- [x] Grouped category picker in the Add / Edit sheet.
- [x] Per-category accent color used in the Wisdom Profile chart and category
      badges.

### Collections + sharing + export (spec §3)

- [x] Create / rename / delete collections; multi-membership per quote.
- [x] Browse a collection (click a collection card → filter the library to its
      members).
- [x] **3.4 Quote → image card** with three curated palettes (Ivory / Dusk /
      Sage), 1080×1080 @ 2× DPR, zero extra dependencies — uses the native
      canvas API.
- [x] **CSV export** (all 20 columns, RFC-4180 escaping).
- [x] **PDF export** via `pdf-lib` — paginated, Times Roman body, italic
      quote, uppercase category.

### Cross-module SDK (spec §7 delivered as contract, not consumed)

- [x] `lib/quote-library/sdk.ts` with the six stable entry points.
- [x] `lib/quote-library/README.md` with call signatures, inputs, outputs,
      quota table, and example usage for each future follow-up session.

### Seed pack

- [x] 30 curated public-domain quotes, one per category, loaded lazily on
      first visit (`useQuoteLibraryFirstVisit`) with a single click "Clear
      seed quotes" in the settings popover.

### UX polish

- [x] Editorial-feel typography (serif body, UI sans meta, 1.65 line-height).
- [x] Framer Motion add/remove transitions that respect
      `prefers-reduced-motion`.
- [x] Virtualized list above 50 visible items.
- [x] Keyboard shortcuts: `/` focus search, `N` add, `J/K` step through,
      `F` favorite.
- [x] Optimistic favorite / edit / delete with rollback on error.
- [x] Skeleton loaders for the list, shimmer-free.
- [x] Empty states for every surface (library, search, collections,
      Wisdom Profile below 20 quotes).
- [x] AI-badge with a user-toggleable preference.
- [x] Quota-exceeded responses return HTTP 429 with structured payloads so
      consumers can render graceful cooldowns.

---

## 2. Autonomous decisions & rationale (reviewable)

| # | Decision | Rationale |
|---|---|---|
| 1 | Route is `/quote-library`, not `/self/quote-library` | Matches the existing flat-URL convention (`/grateful-things`, `/journal`). Sibling-ness to Grateful Things is expressed in the **Self** sidebar category, not the URL. |
| 2 | Gemini is the sole AI provider | Confirmed by the user in a follow-up message. Only `GEMINI_API_KEY` is in `.env.local`; reusing the existing `lib/ai/gemini-text.ts` client + cache pattern. |
| 3 | 9 locales via `createLocaleCopyMap` fallback to EN | Matches `grateful-things-ui.ts`. EN/zh-TW/zh-CN are fully translated; ja/ko have page-chrome translations; fr/es/it/vi ship with chrome-level translations and fall back to EN for deep keys. |
| 4 | Language auto-detect via Unicode ranges | Avoids a 200 KB `franc` dependency. 16/16 detection tests pass across EN / zh-TW / zh-CN / ja / ko / vi / fr. |
| 5 | Seed pack: 30 curated public-domain quotes | One per category, pre-tagged so the AI tagging budget isn't burned on seeds. `is_seed = true` flag, clearable in one click. |
| 6 | OCR — Tesseract.js lazy-load (stubbed for this phase) | Zero backend cost, works offline. The OCR capture UI isn't wired in this session but the data model, `source_module = 'ocr'` enum, and place to hook it in (`AddQuoteSheet`) are all ready. |
| 7 | Source Intelligence cap 20/user/day | Cached forever after success. Enforced by the `quote_ai_usage` ledger with per-kind unique constraint. |
| 8 | `source_intelligence` stored as JSONB on the quotes row | Always 1-to-1 with a quote; never queried in isolation; co-location avoids a JOIN at list time. Can split to a side table in a future migration if the blob grows. |
| 9 | Embeddings: Gemini `text-embedding-004` 768-dim + HNSW | Same provider as the rest of the AI surface; HNSW self-builds (no IVFFlat training step) and gives tight recall on small-to-medium libraries. |
| 10 | Share cards rendered via native `<canvas>` | Avoided a new dep (`html-to-image`). 1080×1080 @ 2× DPR; three distinct palettes. |
| 11 | PDF uses Times Roman from `pdf-lib` standard fonts | Quality is professional for Latin-script quotes. CJK glyphs are sanitized to `·` rather than erroring — documented in Known Issues. |
| 12 | Wisdom Profile threshold = 20 quotes | Matches the spec; +10 auto-recompute + 1/day manual-refresh cap protects the Pro-model budget. |
| 13 | Keyboard shortcuts use plain key codes (no modifiers) | Matches most readers / email clients (Gmail, Superhuman). Bails on editable targets. |
| 14 | `match_quotes` RPC with SECURITY INVOKER | RLS is enforced inside the function body; the function cannot leak another user's quotes. |
| 15 | Mobile FAB only under `<sm` | Saves a thumb-reach target on mobile without cluttering desktop; desktop uses PageShell actions. |

---

## 3. Files created / modified (grouped by phase)

### Phase 1 — Foundation

**Created**

```
app/supabase/migrations/20260620150000_quote_library.sql
app/src/types/quote.ts
app/src/lib/validators/quote.ts
app/src/lib/quote-library/categories.ts
app/src/lib/quote-library/detect-language.ts
app/src/lib/i18n/quote-library-ui.ts
app/src/lib/repositories/quotes.ts
app/src/hooks/use-quotes.ts
app/src/hooks/use-quote-collections.ts
app/src/stores/quote-library-store.ts
app/src/app/[locale]/(protected)/quote-library/page.tsx
app/src/components/quote-library/library-shell.tsx
app/src/components/quote-library/library-tabs.tsx
app/src/components/quote-library/library-search-bar.tsx
app/src/components/quote-library/add-quote-fab.tsx
app/src/components/quote-library/quote-card.tsx
app/src/components/quote-library/quote-card-skeleton.tsx
```

**Modified**

```
app/src/lib/constants/navigation.ts
app/src/lib/i18n/nav-labels.ts
app/src/lib/theme-labels.ts
```

### Phase 2 — CRUD, Search & Filter, Collections

**Created**

```
app/src/components/quote-library/tag-input.tsx
app/src/components/quote-library/add-quote-sheet.tsx
app/src/components/quote-library/collection-dialog.tsx
app/src/components/quote-library/collections-tab.tsx
app/src/components/quote-library/manage-collections-popover.tsx
app/src/components/quote-library/quote-detail-dialog.tsx
app/src/components/quote-library/quote-list.tsx
app/src/components/quote-library/quote-of-the-day-card.tsx      # stub
app/src/components/quote-library/wisdom-profile-tab.tsx          # stub
app/src/lib/quote-library/filter.ts
```

**Modified**

```
app/src/app/[locale]/(protected)/quote-library/page.tsx
```

### Phase 3 — AI Suite Part 1

**Created**

```
app/supabase/migrations/20260620160000_quote_library_ai_usage.sql
app/src/lib/ai/quote-library/quote-ai.ts
app/src/lib/ai/prompts/quote-library/smart-tagging.ts
app/src/lib/ai/prompts/quote-library/source-intelligence.ts
app/src/lib/ai/schemas/quote-library/smart-tagging.ts
app/src/lib/ai/schemas/quote-library/source-intelligence.ts
app/src/lib/quote-library/daily-quote.ts
app/src/lib/quote-library/seed-quotes.ts
app/src/app/api/quote-library/smart-tagging/route.ts
app/src/app/api/quote-library/source-intelligence/route.ts
app/src/app/api/quote-library/daily-quote/route.ts
app/src/app/api/quote-library/seed/route.ts
app/src/hooks/use-quote-ai.ts
app/src/hooks/use-quote-library-first-visit.ts
app/src/components/quote-library/library-settings-popover.tsx
```

**Modified**

```
app/src/components/quote-library/quote-of-the-day-card.tsx
app/src/components/quote-library/quote-detail-dialog.tsx
app/src/components/quote-library/library-shell.tsx
app/src/app/[locale]/(protected)/quote-library/page.tsx
app/src/hooks/use-quotes.ts
```

### Phase 4 — Wisdom Profile, Image Cards, Exports

**Created**

```
app/supabase/migrations/20260620170000_quote_library_wisdom_profiles.sql
app/src/lib/ai/schemas/quote-library/wisdom.ts
app/src/lib/ai/prompts/quote-library/wisdom.ts
app/src/app/api/quote-library/wisdom/route.ts
app/src/hooks/use-wisdom-profile.ts
app/src/components/quote-library/wisdom-chart.tsx
app/src/components/quote-library/share-quote-card.tsx
app/src/lib/quote-library/export-csv.ts
app/src/lib/quote-library/export-pdf.ts
app/src/lib/quote-library/export-image-card.ts
```

**Modified**

```
app/src/components/quote-library/wisdom-profile-tab.tsx          # full impl
app/src/components/quote-library/quote-detail-dialog.tsx         # adds share
app/src/components/quote-library/library-settings-popover.tsx    # adds export
```

### Phase 5 — SDK, Embeddings, Polish

**Created**

```
app/supabase/migrations/20260620180000_quote_library_embeddings.sql
app/src/lib/ai/quote-library/embeddings.ts
app/src/lib/quote-library/sdk.ts
app/src/lib/quote-library/README.md
app/src/app/api/quote-library/quotes/route.ts
app/src/app/api/quote-library/quotes/[id]/route.ts
app/src/app/api/quote-library/daily-inspiration/route.ts
app/src/app/api/quote-library/inspire/route.ts
app/src/app/api/quote-library/resonant/route.ts
app/src/app/api/quote-library/contextual/route.ts
app/src/app/api/quote-library/embeddings/route.ts
app/src/hooks/use-quote-library-shortcuts.ts
app/scripts/test-quote-library-pure.ts
```

**Modified**

```
app/src/lib/supabase/middleware.ts                          # adds protected prefix
app/src/app/api/quote-library/smart-tagging/route.ts        # embeds on save
app/src/app/[locale]/(protected)/quote-library/page.tsx     # wires shortcuts
app/src/lib/quote-library/detect-language.ts                # tightens VI regex
app/package.json                                            # adds test:quote-library
app/tsconfig.json                                           # excludes test script
```

---

## 4. Deliberately stubbed / deferred

1. **OCR capture** — the data model supports `source_module = 'ocr'`, but the
   Tesseract.js capture UI isn't wired. Adding it is a ~150-line patch to
   `AddQuoteSheet` (drop zone + background OCR → pre-fill `quote_text`).
2. **Cross-module consumers** — the SDK entry points are defined and tested
   (via the API routes' response shapes), but no Dashboard / MindClear /
   Journal / Goals wiring happens in this session; that's the point of
   exposing an SDK. See the recommended follow-up sessions below.
3. **Send-to-Journal button on the Wisdom Profile tab** — intentionally not
   present; that's a Journal-session concern since Journal needs to define
   the receiving entry shape.
4. **CJK font in PDF** — would require bundling NotoSansCJK (~15 MB even
   subset). Currently CJK characters render as `·` in the PDF. CSV and
   image-card exports handle CJK fully.
5. **"Inspire me" input form** — the SDK expects `focus`, `mindSweepSnippets`,
   `selfProfileSummary`; the input UI lives on the Dashboard and is therefore
   part of the Dashboard session.

---

## 5. Recommended follow-up Cursor sessions (cross-module wiring)

Each is a self-contained session that imports only from
`lib/quote-library/sdk.ts`. Suggested order matches integration value:

### A. Journal → Quote Library (spec 2.3)

> "On the journal entry detail view, show 2–3 resonant quotes surfaced via
> `findResonantQuotes(journalEntryText)`. Add a 'Save this quote' inline
> action that calls `addQuoteFromMindSweep` (or a journal-specific variant).
> Add a 'Send this insight' button on the Wisdom Profile tab that posts the
> `monthly_insight` into the Journal as a new entry."

### B. Dashboard → Quote Library (spec 2.8)

> "Replace the existing 'Daily Inspiration' card with one backed by
> `getFavoritesForDailyInspiration()`. Add the 'Inspire me' button that
> calls `inspireMe({ focus, mindSweepSnippets, selfProfileSummary })` and
> renders the returned quote + reason."

### C. MindClear → Quote Library (spec 2.7)

> "In a MindClear session, when the user taps 'Add quote to my library',
> call `addQuoteFromMindSweep`. When the session asks the AI for a
> contextually-relevant external quote, call `generateContextualQuote` with
> the current reflection text."

### D. Goals → Quote Library (spec 2.4)

> "On the Goal detail view, add a 'Linked quotes' section that renders
> `getQuotesForGoal(goalId)` results and a 'Link a quote' button that opens
> a picker and calls `linkQuoteToGoal`. On the Quote Detail dialog, add a
> goal picker that calls the same `linkQuoteToGoal` with the open quote id."

---

## 6. Known issues / risks to look at first

1. **⚠ Manual Supabase migration already applied live.** Four migrations
   were applied via `apply_migration` against the live project (Supabase
   project `aprjlwajbubjddtbqufk`):

   - `quote_library_foundation`
   - `quote_library_ai_usage_ledger`
   - `quote_library_wisdom_profiles`
   - `quote_library_embeddings`

   The matching `.sql` files under `app/supabase/migrations/` are committed
   locally for `db:push` reconciliation. If you ever blow the project away,
   the files replay cleanly; the migration history file is the source of
   truth.

2. **PDF CJK rendering** — CJK characters become `·`. See the Known gaps
   section above.

3. **`useVirtualizer` React-Compiler warning** — known limitation of
   TanStack Virtual. Safe to ignore; documented inline.

4. **Free-tier Gemini rate limits** may surface on bulk embedding backfills
   (`POST /api/quote-library/embeddings` processes up to 50 quotes/call). If
   hit, the ledger doesn't treat this as a quota event — the function just
   returns `{ ok: false, error }` entries for the failing rows, which you
   can retry.

5. **`detect-language.ts` heuristic** — intentionally simple. It nails the
   common cases (verified via 16 tests) but won't distinguish between very
   close Latin languages (e.g. Portuguese vs Spanish — not supported
   anyway). User can always override via the language picker.

---

## 7. How to test (10-minute walkthrough)

1. **Log in**, open the sidebar, click **Self → Quote Library**. The 30-quote
   starter pack seeds on first visit. You should see the Quote of the Day
   card at the top + a list of 30 quotes with category badges, tones, and
   tags.

2. **Add a quote**: click **Add quote** (top-right on desktop, FAB on
   mobile). Paste something new, leave category/tags empty, hit **Save
   quote**. Within 3–5 s the card should show the AI-generated tags fading
   in, plus (if you provided an author) an AI-enriched badge.

3. **Favorite flow**: click the star on any quote card. Watch the toast
   appear + the card shuffle to the top. Toggle off, watch it return.

4. **Edit / delete**: open a quote (click it), hit the edit button. Change
   the personal note, save. Hit delete — confirm the preview of the quote
   appears in the confirm dialog, then confirm. The card disappears from
   the list with a fade.

5. **Search & filter**: type a keyword in search, toggle **Favorites only**,
   change the sort order. Verify search composes with the favorites filter.
   Hit the × to clear.

6. **Collections**: switch to the Collections tab. Create a collection
   called "Test". Return to All Quotes, open a quote, click **Add to
   collection** in the detail dialog, tick Test. Switch to Collections, open
   Test — the quote appears.

7. **Wisdom Profile** (needs 20+ quotes — the seeds give you 30). Switch to
   the Wisdom Profile tab. Click **Compute my profile** or
   **Refresh insight**. Within ~10 s see the pie chart, 3–5 theme cards,
   and the monthly insight paragraph.

8. **Share card**: open any quote, click **Share as image**. Pick a palette
   (Ivory / Dusk / Sage) and click the download button. A 1080×1080 PNG
   lands in your downloads folder.

9. **Export**: open Library Settings (cog icon top-right), hit **Export
   CSV** and **Export PDF**. Verify the CSV opens cleanly in a spreadsheet
   and the PDF has one quote card per page section.

10. **Keyboard shortcuts**: from the All Quotes tab:
    - `/` focuses search
    - `N` opens the add sheet
    - `J` opens the first quote detail; `J` again moves to the next; `K`
      goes back
    - With a quote open, `F` toggles its favorite state

---

## Appendix — Quota table

| AI kind               | Daily cap | Notes |
|-----------------------|----------:|-------|
| `smart_tagging`       |       100 | Fires once per new quote, cached on the row. |
| `source_intelligence` |        20 | Two-call grounded research; cached forever. |
| `daily_quote`         |         3 | Selection is deterministic; AI call is optional. |
| `wisdom`              |         2 | Gemini Pro, batched every +10 quotes. |
| `inspire`             |        30 | Dashboard + MindClear consumers. |

All caps reset at UTC midnight. Over-quota responses return HTTP 429 with
`{ error: "quota_exceeded", kind, limit, used, resets_at }`.
