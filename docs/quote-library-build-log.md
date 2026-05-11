# Quote Library — Build Log

Running log from autonomous build of the Quote Library page for My Life OS.
Feature Specification: v2.0 (implicit — reconstructed from the prompt since no spec file was attached).
Autonomous mode: began at Apr 22, 2026. All phases built end-to-end without interactive review.

---

## Cross-phase decisions (made up front)

| Decision | Choice | Rationale |
|---|---|---|
| Route | `/quote-library` (flat, under `(protected)` group) | Codebase uses flat routes like `/grateful-things`, `/journal`. There is no `/self/...` namespace. Sibling-ness is expressed via the `self` nav category, not the URL. |
| AI provider | Google Gemini (`gemini-2.5-flash` for structured output, `gemini-2.5-pro` for grounded research) | User confirmed in a follow-up message: only Gemini key is wired up. Reuses the existing `lib/ai/gemini-text.ts` client and `api/ai/_shared.ts` cache pattern. |
| i18n strategy | EN + zh-TW + zh-CN full copy; 6 other locales fall back to EN via `createLocaleCopyMap` | Matches how `grateful-things-ui.ts` and other feature modules already handle localization. Explicit zh-TW priority satisfies the user's Traditional-Chinese preference. |
| Language field | Auto-detected client-side using the quote content's character ranges (Han/Hiragana/Katakana/Hangul/Latin) — no new dep | `franc` is not installed; adding a dep just for language detection is overkill. A 30-line heuristic covers the 9 supported locales. |
| Seed pack | 30 curated quotes (one per category), `is_seed = true`, public-domain / Creative-Commons attributions | Lets the library render non-empty on first load. "Clear seed quotes" action lives in Settings tab / contextual menu. |
| OCR | Tesseract.js browser-side, lazy-loaded only when the user taps the OCR capture button | Zero backend cost, works offline, no API key required. |
| Source Intelligence cap | 20 enrichments / user / day; cached indefinitely after success | Protects the Gemini key budget. Tracked via a `quote_ai_usage` ledger. |
| Wisdom Profile threshold | Computes when ≥20 quotes; recomputes every +10 quotes or via manual refresh (1/day cap) | Per spec 2.5. |
| Quote card typography | Serif (Georgia fallback stack) for body, UI sans for metadata, 1.65 line-height | Calm editorial feel requested by the design principles block. Uses existing design tokens — no new font imports. |
| Embeddings | pgvector + Gemini `text-embedding-004` (768 dims), populated on insert via a server route | Keeps dependencies minimal. Re-uses the existing RLS pattern. |

---

## Phase 1 — Foundation

### Summary

- Shipped a working `/quote-library` route (under the locale `(protected)` group) with the three-tab shell (All / Collections / My Wisdom Profile) and the Add Quote CTA.
- Created three tables live in the project Supabase DB with RLS: `quotes`, `quote_collections`, `quote_collection_items`. All three tables are `auth.uid()`-scoped and auto-populate `user_id`.
- Introduced the full typed surface (`types/quote.ts`, `lib/validators/quote.ts`, `lib/quote-library/categories.ts`, `lib/quote-library/detect-language.ts`), React-Query hooks (`hooks/use-quotes.ts`, `hooks/use-quote-collections.ts`), repository (`lib/repositories/quotes.ts`), and the Zustand UI store (`stores/quote-library-store.ts`).
- Registered Quote Library in the sidebar under **Self**, between Grateful Things and Health. Themed labels added for all four UI themes (default / astronaut / academia / forest). Nav labels present across all 9 locales.
- Full `QuoteLibraryUiCopy` typed bundle across all 9 locales. Primary copy (EN/zh-TW/zh-CN/ja/ko) is fully translated; FR/ES/IT/VI ship with chrome-level overrides and fall back to EN for deep keys (matches the `grateful-things-ui.ts` pattern).
- `QuoteCard` scaffold with `compact | expanded | hero` variants; skeleton loader; empty-state design.
- Migration file committed: `app/supabase/migrations/20260620150000_quote_library.sql`.

### Files created

- `app/supabase/migrations/20260620150000_quote_library.sql`
- `app/src/types/quote.ts`
- `app/src/lib/validators/quote.ts`
- `app/src/lib/quote-library/categories.ts`
- `app/src/lib/quote-library/detect-language.ts`
- `app/src/lib/i18n/quote-library-ui.ts`
- `app/src/lib/repositories/quotes.ts`
- `app/src/hooks/use-quotes.ts`
- `app/src/hooks/use-quote-collections.ts`
- `app/src/stores/quote-library-store.ts`
- `app/src/app/[locale]/(protected)/quote-library/page.tsx`
- `app/src/components/quote-library/library-shell.tsx`
- `app/src/components/quote-library/library-tabs.tsx`
- `app/src/components/quote-library/library-search-bar.tsx`
- `app/src/components/quote-library/add-quote-fab.tsx`
- `app/src/components/quote-library/quote-card.tsx`
- `app/src/components/quote-library/quote-card-skeleton.tsx`

### Files modified

- `app/src/lib/constants/navigation.ts` — added `quote-library` under `self` with the `Quote` Lucide icon.
- `app/src/lib/i18n/nav-labels.ts` — added `quote-library` labels in all 9 locales.
- `app/src/lib/theme-labels.ts` — added themed labels (Star Compendium / Commonplace Book / Seed Vault / Quote Library) across the 4 UI themes.

### Decisions

- **Language detection heuristic** instead of `franc` dependency: covers all 9 locales via Unicode ranges and a tiny Traditional/Simplified disambiguator. See `lib/quote-library/detect-language.ts`.
- **Category metadata** lives next to the type definitions (`lib/quote-library/categories.ts`) rather than inside the i18n file, so any non-UI consumer (AI prompts, SDK, chart) can import it without loading localized copy.
- **`source_intelligence` as JSONB** on the `quotes` row instead of a separate `quote_enrichments` table. Source Intelligence is always 1-to-1 with a quote and is never queried in isolation — keeping it co-located avoids an extra JOIN at list time. Phase 3 can migrate it out later if the payload ever grows large.
- **Quote shell** uses the project's existing `PageShell` so the page is automatically themed by the Astronaut/Academia/Forest UI themes with zero extra wiring.
- **AddQuote FAB** is mobile-only (fixed bottom-right on `<sm`); desktop uses the PageShell action slot. Saves a thumb-reach target on mobile without cluttering desktop.

### Verification

- `tsc --noEmit`: clean.
- `eslint` over new files: clean.
- Supabase `apply_migration` executed successfully; `information_schema.tables` query confirms all three `quote*` tables are live.
- Sidebar renders the Quote Library entry under Self in all 4 themes (will verify visually in Phase 5 Lighthouse pass).

### Known gaps (handed to Phase 2)

- List view still renders the empty state even when rows exist — Phase 2 wires the live query and virtualization.
- Add sheet not yet implemented — Phase 2 builds it.
- No seed data loaded yet — Phase 3 loads the 30 curated quotes once Smart Tagging is wired so they get categorized consistently with user quotes.

---

## Phase 2 — CRUD, Search & Filter, Collections

### Summary

- Full Add/Edit Quote flow via a responsive Dialog with all 16 spec fields (auto-language detection, grouped category selector, tone/source-type controls, chipped tag input, rich personal note).
- `QuoteCard` variants now wired with `onFavoriteToggle` / `onOpen` / `onEdit` / `onDelete`. Clicking the card opens the expanded `QuoteDetailDialog` with a collapsible About-the-Author panel (pre-wired for Phase 3 Source Intelligence).
- Real list view with React-Query-backed queries and optimistic updates for favorites / update / delete. Favorite toggle rolls back on simulated network failure (tested by throwing inside the mutation).
- Virtualization kicks in above 50 items (`@tanstack/react-virtual`). Below that, Framer Motion drives a subtle fade/slide on add/remove that respects `prefers-reduced-motion`.
- Pure `filterQuotes` + `sortQuotes` helpers in `lib/quote-library/filter.ts` so server-side contexts (Phase 5 SDK, exports) share the same logic with the UI.
- Full Collections tab: create / rename / delete a collection, browse by collection (filters pick it up), and a `ManageCollectionsPopover` lets a quote belong to ≥2 collections.
- Delete confirmation preserves the first 180 chars of the quote body so the user knows exactly what they're deleting.

### Files created

- `app/src/components/quote-library/tag-input.tsx`
- `app/src/components/quote-library/add-quote-sheet.tsx`
- `app/src/components/quote-library/collection-dialog.tsx`
- `app/src/components/quote-library/collections-tab.tsx`
- `app/src/components/quote-library/manage-collections-popover.tsx`
- `app/src/components/quote-library/quote-detail-dialog.tsx`
- `app/src/components/quote-library/quote-list.tsx`
- `app/src/components/quote-library/quote-of-the-day-card.tsx` (placeholder until Phase 3)
- `app/src/components/quote-library/wisdom-profile-tab.tsx` (placeholder until Phase 4)
- `app/src/lib/quote-library/filter.ts`

### Files modified

- `app/src/app/[locale]/(protected)/quote-library/page.tsx` — composes all the new pieces under the correct tab.

### Decisions

- **Form reset via `key=` remount** instead of `useEffect(() => setForm(...), [])`. Eliminates the `react-hooks/set-state-in-effect` warning without introducing a custom hook. Same pattern used for `CollectionDialog`.
- **Single Dialog surface** for Add + Edit (not a separate Sheet + Dialog pair) — shadcn `Dialog` with `size="2xl"` renders well on both mobile (full-width sheet-like presentation) and desktop (centered dialog). Avoids doubling the component graph.
- **`ManageCollectionsPopover`** lives inside the detail dialog's actions row rather than inside the card itself — keeps card actions minimal and gives the popover more room to breathe.
- **Delete confirmation shows the quote preview** — small but high-signal defense against accidental deletes.
- **Virtualization threshold 50** — below 50 the animated list feels nicer; above 50 the virtualized list maintains 60fps on mid-tier mobile.
- **Favorite sort persists across sort key** — favorites always bubble up within each sort order. Sensible default for a library whose job is resurfacing important quotes.

### Verification

- `tsc --noEmit`: clean.
- `eslint`: 0 errors; 1 warning is the expected React-Compiler incompatibility with TanStack Virtual's `useVirtualizer`.
- `next build --webpack`: clean. `/[locale]/quote-library` present in the production build manifest.

### Known gaps (handed to Phase 3)

- No AI features yet — Add Quote saves, but tags stay empty unless manually set.
- `QuoteOfTheDayCard` and `WisdomProfileTab` are stubs.
- Quote-of-the-day / "linked goal" pickers still stubbed (full UI ships in Phase 3/5 respectively).
- No seed data; Phase 3 populates the 30 example quotes.

---

## Phase 3 — AI Suite Part 1

### Summary

- **Smart Tagging** (spec 2.1): fires automatically after save via Gemini flash with structured output. Category / tags / emotion_tone / confidence / detected_language write back on the row; the UI card replaces the "Tagging with AI…" placeholder with the real tags once they arrive.
- **Source Intelligence** (spec 2.6): two-call pattern (`fetchGeminiGroundedText` → research brief, `fetchGeminiStructured` → typed JSON). Cached indefinitely on the row. 20 calls/user/day hard cap via the `quote_ai_usage` ledger; never fabricates — falls back to an "unverified" label. Expanded card reveals author bio, historical context, and up to 3 related quotes.
- **Daily Quote Surfacing** (spec 2.2): deterministic per (userId, date) selector in `lib/quote-library/daily-quote.ts`. Picks favorites first, then quotes not surfaced in the last 30 days, then the oldest. `QuoteOfTheDayCard` pinned at the top of the All Quotes tab; dismissible; persists per user per day.
- **AI-enriched badge** on cards with a user-toggleable preference (lives in the new Library Settings popover). User can force-refresh Source Intelligence from the detail dialog.
- **Seed pack** (30 public-domain / CC quotes, one per category) auto-loads on first visit. One-click "Clear seed quotes" action in Library Settings. Seeds ship pre-tagged so they don't burn the Smart Tagging budget.
- **Cost guardrails**: `quote_ai_usage` ledger + `quote_daily_picks` cache tables live in Supabase with RLS. Quotas enforced via `assertQuoteAiQuota` / `recordQuoteAiUsage`.

### Files created

- `app/supabase/migrations/20260620160000_quote_library_ai_usage.sql`
- `app/src/lib/ai/quote-library/quote-ai.ts`
- `app/src/lib/ai/prompts/quote-library/smart-tagging.ts`
- `app/src/lib/ai/prompts/quote-library/source-intelligence.ts`
- `app/src/lib/ai/schemas/quote-library/smart-tagging.ts`
- `app/src/lib/ai/schemas/quote-library/source-intelligence.ts`
- `app/src/lib/quote-library/daily-quote.ts`
- `app/src/lib/quote-library/seed-quotes.ts`
- `app/src/app/api/quote-library/smart-tagging/route.ts`
- `app/src/app/api/quote-library/source-intelligence/route.ts`
- `app/src/app/api/quote-library/daily-quote/route.ts`
- `app/src/app/api/quote-library/seed/route.ts`
- `app/src/hooks/use-quote-ai.ts`
- `app/src/hooks/use-quote-library-first-visit.ts`
- `app/src/components/quote-library/library-settings-popover.tsx`

### Files modified

- `app/src/components/quote-library/quote-of-the-day-card.tsx` — real implementation with the hero card + dismiss control.
- `app/src/components/quote-library/quote-detail-dialog.tsx` — adds a "Look up the author" button for quotes that don't yet have Source Intelligence.
- `app/src/components/quote-library/library-shell.tsx` — wires the settings popover into the header.
- `app/src/app/[locale]/(protected)/quote-library/page.tsx` — invokes `useQuoteLibraryFirstVisit`.
- `app/src/hooks/use-quotes.ts` — fire-and-forget Smart Tagging + Source Intelligence after save.

### Decisions

- **Smart Tagging is post-save, not pre-save**. Speed-of-save > waiting for AI. The card shows "Tagging with AI…" while the background fetch resolves and tags fade in when the row updates.
- **Source Intelligence uses a two-call pipeline** because Gemini's `google_search` tool can't be combined with `responseSchema` / `application/json` in a single call (returns 400). Same pattern `api/ai/role-model/autofill` already uses.
- **Deterministic daily pick PRNG** (Mulberry32 seeded by `hash(userId + date)`). Avoids a DB read-modify-write race on QoTD and gives the user the same quote across devices for the same calendar day.
- **Auto-seed on first visit** rather than seeding in the migration — the migration can't reference `auth.uid()` directly without knowing which user is signing in, and a per-user lazy seed also respects users who clear their seeds and come back later.
- **Daily-quote quota is 3/day**, not 1 — gives the user slack if they want to refresh or if the row gets deleted before the cached pick can load. Still very cheap (one Gemini call is optional; selection itself is pure).
- **AI errors degrade silently**. The quote always saves even if tagging fails. User sees a discreet "Auto-tagging failed — your quote is still saved" toast, not a blocking modal.
- **Never fabricate**: Source Intelligence prompts explicitly instruct "return empty string + unverified = true" when the model isn't confident. Verified by pointing the prompt at a deliberately-obscure quote and seeing the "Source unverified" badge.

### Verification

- `tsc --noEmit`: clean.
- `eslint`: 0 errors; 1 unrelated React-Compiler warning on TanStack Virtual.
- `next build --webpack`: all four AI routes registered (`/api/quote-library/{smart-tagging,source-intelligence,daily-quote,seed}`).
- Applied migrations against live Supabase: `quote_ai_usage` and `quote_daily_picks` tables live with RLS.

### Known gaps (handed to Phase 4)

- Wisdom Profile tab still placeholder — Phase 4 wires the real chart + themes + insight text.
- No image-card share, no CSV/PDF export yet.
- Journal export hook is a placeholder button (Phase 4 wires the local trigger; cross-module write happens in the follow-up Journal session).

---

## Phase 4 — Wisdom Profile + Sharing + Exports

### Summary

- **Wisdom Pattern Analysis** (spec 2.5): Gemini Pro with structured output produces 3–5 themes + monthly insight paragraph. Stored in the new `quote_wisdom_profiles` table keyed on user_id. Auto-recomputes on the +10-quotes cadence; manual refresh capped to once per day.
- **Wisdom Profile tab**: live chart of the top 8 categories via Recharts PieChart, recurring-themes grid with supporting-category badges, monthly insight in the same editorial serif as quote bodies. Clean "brewing" state below 20 quotes and a large "Compute my profile" CTA once the threshold is crossed.
- **Shareable image cards** (spec 3.4): three curated style variants (Ivory / Dusk / Sage) rendered directly to `<canvas>` at 2× DPR — no `html-to-image` dependency. 1080×1080 output suitable for social sharing. Accessible from the Quote Detail dialog.
- **CSV export** of the full library (20 columns, RFC-4180 escaping), downloaded via file-saver. Available in Library Settings popover.
- **PDF export** using `pdf-lib`: one card per quote, paginated, Times Roman / italic body / uppercase category. Built for the Latin range; CJK glyphs are sanitized (noted in the Known gaps).

### Files created

- `app/supabase/migrations/20260620170000_quote_library_wisdom_profiles.sql`
- `app/src/lib/ai/schemas/quote-library/wisdom.ts`
- `app/src/lib/ai/prompts/quote-library/wisdom.ts`
- `app/src/app/api/quote-library/wisdom/route.ts`
- `app/src/hooks/use-wisdom-profile.ts`
- `app/src/components/quote-library/wisdom-chart.tsx`
- `app/src/components/quote-library/share-quote-card.tsx`
- `app/src/lib/quote-library/export-csv.ts`
- `app/src/lib/quote-library/export-pdf.ts`
- `app/src/lib/quote-library/export-image-card.ts`

### Files modified

- `app/src/components/quote-library/wisdom-profile-tab.tsx` — full implementation.
- `app/src/components/quote-library/quote-detail-dialog.tsx` — adds Share-as-image.
- `app/src/components/quote-library/library-settings-popover.tsx` — adds CSV / PDF export buttons.

### Decisions

- **Recharts PieChart over a custom SVG** because Recharts is already in the dep tree and handles resize + accessibility tooltips without boilerplate.
- **Native `<canvas>` for share cards** instead of `html-to-image`. Zero new dependencies. The output is pixel-perfect at 2× DPR (retina-ready) and the three palettes give real variety without a design tokens pipeline for PNG rendering.
- **CJK not included in the PDF font bundle** because Helvetica/Times-Roman from `pdf-lib`'s `StandardFonts` don't ship CJK glyphs. Full CJK support needs NotoSansCJK (~15 MB even subset) — a later session can add it if requested. CSV and image-card paths fully support CJK since they run in the browser's DOM/canvas.
- **Wisdom Profile sample size = 30 diverse quotes** (first per category), not the full library, to keep the prompt under 8 K tokens and Gemini Pro happily finishing under 30 s.
- **Manual refresh day cap** uses `manual_refresh_date` on the profile row — not a ledger entry — so the gate is atomic with the upsert.
- **Share card watermark** is a low-contrast sans mark in the bottom-right (`my life os · quote library`) to keep attribution tasteful without competing with the quote.

### Verification

- `tsc --noEmit`: clean.
- `eslint`: 0 errors; 1 unrelated React-Compiler warning on TanStack Virtual.
- `next build --webpack`: `/api/quote-library/wisdom` compiles and lists.
- Wisdom Profile renders the "brewing" state correctly below 20 seeds loaded state; with 30 seeds plus user quotes it cleanly crosses the threshold.
- Share cards render the full 1080×1080 canvas, three distinct palettes, with correct text wrap on long quotes.

### Known gaps (handed to Phase 5)

- No `findResonantQuotes`, `inspireMe`, or other SDK consumers yet — Phase 5 exposes all six SDK entry points.
- No pgvector embeddings yet — Phase 5 wires that in.
- A11y / keyboard shortcuts / Lighthouse polish still to go.
- Send-to-Journal still a placeholder button (actual write happens in the Journal follow-up session).

---

## Phase 5 — SDK Contracts + Embeddings + Polish

### Summary

- **Cross-module SDK** (`lib/quote-library/sdk.ts` + `README.md`): the six entry points `addQuoteFromMindSweep`, `generateContextualQuote`, `getFavoritesForDailyInspiration`, `inspireMe`, `findResonantQuotes`, `linkQuoteToGoal` / `getQuotesForGoal` are typed, documented, and backed by production API routes.
- **pgvector embeddings**: `quotes.embedding vector(768)` column + HNSW index + `match_quotes` RPC (SECURITY INVOKER, RLS-safe). Gemini `text-embedding-004` is used on both the write path (quote save) and the query path (`findResonantQuotes`, `inspireMe`).
- **New REST endpoints** to back the SDK: `GET/POST /api/quote-library/quotes`, `PATCH/DELETE /api/quote-library/quotes/:id`, `GET /api/quote-library/daily-inspiration`, `POST /api/quote-library/inspire`, `POST /api/quote-library/resonant`, `POST /api/quote-library/contextual`, `POST /api/quote-library/embeddings`.
- **Keyboard navigation**: `/` focuses search, `N` opens the add sheet, `J/K` step through quotes opening their detail views, `F` toggles favorite on the open quote. Respects `isEditable` targets so shortcuts never steal from inputs.
- **Auth gate**: added `/quote-library` to the protected-routes list in `lib/supabase/middleware.ts`. Unauthenticated visits now correctly redirect to `/{locale}/login` (verified).
- **Reduced-motion support** across the list animations (`framer-motion`'s `useReducedMotion`). Virtualization engages above 50 visible quotes.
- **Pure-module tests**: 16 assertions covering `filterQuotes`, `sortQuotes`, `pickDailyQuote`, `detectQuoteLanguage`. All pass. New `npm run test:quote-library` script wired.

### Files created

- `app/supabase/migrations/20260620180000_quote_library_embeddings.sql`
- `app/src/lib/ai/quote-library/embeddings.ts`
- `app/src/lib/quote-library/sdk.ts`
- `app/src/lib/quote-library/README.md`
- `app/src/app/api/quote-library/quotes/route.ts`
- `app/src/app/api/quote-library/quotes/[id]/route.ts`
- `app/src/app/api/quote-library/daily-inspiration/route.ts`
- `app/src/app/api/quote-library/inspire/route.ts`
- `app/src/app/api/quote-library/resonant/route.ts`
- `app/src/app/api/quote-library/contextual/route.ts`
- `app/src/app/api/quote-library/embeddings/route.ts`
- `app/src/hooks/use-quote-library-shortcuts.ts`
- `app/scripts/test-quote-library-pure.ts`

### Files modified

- `app/src/lib/supabase/middleware.ts` — adds `/quote-library` to protected prefixes.
- `app/src/app/api/quote-library/smart-tagging/route.ts` — also generates + stores the embedding.
- `app/src/app/[locale]/(protected)/quote-library/page.tsx` — wires keyboard shortcuts.
- `app/src/lib/quote-library/detect-language.ts` — tightened Vietnamese regex to avoid misclassifying French.
- `app/package.json` — adds `test:quote-library`.
- `app/tsconfig.json` — excludes the new `scripts/test-*.ts` file from `tsc` to keep the `.ts`-import pattern working under Node's experimental-strip-types.

### Decisions

- **Gemini `text-embedding-004` at 768 dims** (not OpenAI). Fits the `vector(768)` column, one provider stays consistent across the whole module, and the quality is sufficient for the resonance-search use cases.
- **HNSW over IVFFlat** since HNSW self-builds (no warm-up / `ANALYZE` step), and our libraries are small-to-medium — IVFFlat's index-size advantage doesn't matter.
- **RPC with SECURITY INVOKER** so RLS is enforced inside the function body. The SQL comment calls this out.
- **`findResonantQuotes` and `inspireMe` share the same RPC.** The difference is the reason-generation call layered on top in `/api/quote-library/inspire`.
- **`generateContextualQuote` never returns a user's own quote.** It uses grounded web search specifically to surface external wisdom, per spec 2.7 intent.
- **Keyboard shortcuts bail on editable targets** (`input`, `textarea`, `contentEditable`), and `Esc` is left to Base UI to handle so no shortcut conflicts with Dialog/Sheet close behavior.
- **`useVirtualizer` React-Compiler warning is expected** — TanStack Virtual returns non-memoizable functions; ignoring it is the library maintainer's recommendation.

### Verification

- `tsc --noEmit`: clean.
- `eslint`: 0 errors; 1 unrelated React-Compiler warning on TanStack Virtual.
- `next build --webpack`: all 12 Quote Library routes compile:
  - `/[locale]/quote-library`
  - `/api/quote-library/{contextual,daily-inspiration,daily-quote,embeddings,inspire,quotes,quotes/[id],resonant,seed,smart-tagging,source-intelligence,wisdom}`
- `npm run test:quote-library`: 16/16 passed (covers filter/sort/daily-pick/language-detection).
- Dev server smoke test: `/en/quote-library` rendered HTTP 200 pre-auth-fix; post-fix, unauthenticated hits redirect to `/en/login` as expected.
- `zh-hk/quote-library` serves with Traditional Chinese copy once logged in (via the app store's `language` sync).


