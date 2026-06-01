# Bucket List → Dream-to-Reality OS — Roadmap

**Phase 0 plan.** Phased delivery for evolving the existing Bucket List into the Dream OS.
Each phase is independently shippable, additive, and preserves every working feature listed
in [`bucket-list-dream-os-architecture.md`](./bucket-list-dream-os-architecture.md) §2.

Companions: [architecture](./bucket-list-dream-os-architecture.md),
[ai-policy](./bucket-list-ai-policy.md), [data-model](./bucket-list-dream-os-data-model.md).

---

## Guiding constraints (apply to every phase)

- Do **not** duplicate existing fields; reuse the data spine.
- Do **not** break existing Bucket List features (run the existing QA from
  `bucket-list-build-summary.md` §7 every phase).
- Do **not** create fake buttons — ship a control only when its capability is real.
- Do **not** auto-create projects/tasks/budgets/calendar events without confirmation.
- Do **not** fake live flight prices; do **not** present AI travel research as verified.
- Generated images are labeled AI; memories are never invented.
- Quality gates per phase: `tsc --noEmit` clean, scoped ESLint clean, EN+zh-TW strings,
  unit/route tests for new code, no regression to the cross-module SDK consumers.

---

## Phase 0 — Architecture (this set of docs)

**Deliverable:** the four `docs/bucket-list-dream-os-*.md` files. No application code, UI,
or migrations.

**Exit:** plan reviewed and agreed.

---

## Phase 1 — Data & provenance foundation

**Goal:** land the additive schema so later phases have somewhere to write.

- One idempotent, additive migration (data-model §8): new `bucket_items` columns,
  `bucket_dream_assets` table, `bucket-dream-images` storage bucket + policies, extended
  `bucket_ai_usage` kinds.
- Extend `types/bucket-list.ts`, `lib/repositories/bucket-list.ts`
  (`bucketDreamAssetsRepository`, normalizer updates), and Zod schemas.
- Regenerate Supabase types.

**No user-visible change.** **Exit:** migration applies cleanly; types compile; existing UI
unaffected.

**Risk:** native-enum vs TEXT+CHECK mismatch — new columns use TEXT+CHECK, existing enum
columns untouched.

---

## Phase 2 — AI Dream Capture

**Goal:** minimal-typing capture.

- Routes: `capture` (text/voice) and `capture-image` (screenshot/inspiration), both returning
  an editable draft, **persisting nothing**.
- `DreamCapturePanel` inside `add-dream-sheet.tsx`: text box, paste-image, file upload,
  browser voice→text. Draft populates the existing form for review + save.
- Inspiration uploads stored as `bucket_dream_assets` rows.
- Quota kinds `dream_capture`, `dream_capture_image`; non-AI fallback = current manual form.

**Exit:** a user can type a phrase or paste a screenshot and get a reviewable dream draft;
nothing is saved until they confirm.

---

## Phase 3 — Dream image / cover system

**Goal:** choose, upload, or generate a cover with clear provenance.

- Route `cover-image` (`generateGeminiInlineImage` → upload to `bucket-dream-images` →
  `bucket_dream_assets` row with `is_ai_generated=true`).
- `DreamCoverPicker`: catalog/keyword (existing resolver) · upload · generate.
- `dream-cover-background.tsx` + cards/hero render the **"AI-generated visual"** badge
  whenever `cover_image_is_ai`/asset `is_ai_generated`.
- Cover resolution priority wired (architecture §7).

**Exit:** every cover surface shows correct provenance; AI covers are always labeled.

---

## Phase 4 — Dream Intelligence Hub

**Goal:** per-dream reasoning that's explainable and overridable.

- Route `intelligence` (rule pass + `fetchGeminiStructured`) and `next-step`.
- Cache to `readiness_state` / `readiness_reason` / `intelligence_signals` /
  `last_intelligence_at`; honor `readiness_overridden`.
- `DreamIntelligenceCard` in Detail Hub Overview: readiness, why-it-matters (with optional
  AI restatement, labeled), next best step (routes to Activate, confirmed), reframes.
- Dismiss/override controls.

**Exit:** opening a dream shows its state, reason, and a concrete next step; user overrides
stick.

---

## Phase 5 — Page-level Dream Intelligence

**Goal:** the overview behaves like a coach.

- `PageIntelligenceBar`: Ready / Dormant / Blocked / Emotionally-important rollup from cached
  signals via the SDK.
- Readiness chip on cards; readiness filter in `type-filter-tabs.tsx`.
- Feed `getDashboardBucketSummary()` so the Dashboard widget reflects the same intelligence.

**Exit:** the page surfaces which dreams to push/revisit/unblock; dashboard parity.

---

## Phase 6 — Activation Engine upgrade

**Goal:** confirmed dream→work conversion with a preview.

- Route `activate/preview` (proposes project/tasks/savings/calendar/note; **no writes**).
- `ActivationPreview` inside `activate-dream-modal.tsx` shows exactly what will be created.
- On confirm: client writes via existing repositories (`projectsRepository`,
  `tasksRepository`, `financeRepository`, `goalsRepository`, calendar/Google Calendar,
  knowledge/notes), records `bucket_item_integrations`, writes back soft FKs, optionally adds
  `brain_edges`.

**Exit:** no cross-module record is ever created without the user confirming the preview.

---

## Phase 7 — Travel Explorer polish

**Goal:** richer, trustworthy travel planning.

- Editable, regenerable itineraries (`BucketTripPlan`); never auto-applied to calendar.
- Flight watch: keep estimate labeling; optional real `FlightWatchProvider` adapter behind
  `bucket_settings.preferred_flight_provider`. Only live quotes show without the estimate
  label.
- Destination intelligence keeps the `unverified` disclaimer.

**Exit:** travel UX is richer; estimates and AI research remain clearly labeled; no fake live
prices.

---

## Phase 8 — Realized Dreams / Memory Timeline

**Goal:** completed dreams become a reflective timeline.

- Timeline view of realized dreams (`completed_at` order) with reflections, mood, photos.
- Richer reflection capture; AI summary labeled as a recap of the user's own words.
- Optional Dashboard memory tile.

**Exit:** a completed dream becomes a faithful memory; nothing invented.

---

## Sequencing notes

- Phases 1→3 are the capture/visual track; 4→5 the intelligence track; 6 the activation
  track; 7→8 travel/memory. After Phase 1, the tracks can be parallelized if needed.
- Every phase ends with the existing 10-step manual QA plus its own new tests, and a check
  that Dashboard / Projects / Finance SDK consumers still work.
- Real flight-API integration (Phase 7) is optional and isolated behind the existing
  provider interface, so it never blocks the rest.
</content>
