# Bucket List → Dream-to-Reality OS — AI Policy

**Phase 0 plan.** This document defines how AI is used, grounded, quota'd, and kept safe
across the Dream OS. It binds every AI route and component. It is grounded in the app's
actual AI stack (`app/src/lib/ai/gemini-text.ts`, `gemini-image-generate.ts`,
`lib/ai/bucket-list/bucket-ai.ts`) and the four existing bucket-list routes.

Companion: [`bucket-list-dream-os-architecture.md`](./bucket-list-dream-os-architecture.md),
[`bucket-list-dream-os-data-model.md`](./bucket-list-dream-os-data-model.md).

---

## 1 · Provider & models — Gemini only

The app uses **Google Gemini (Generative Language API, `v1beta`) exclusively.** There is no
other LLM provider, and the Dream OS introduces none.

| Use | Model (default) | Helper |
| --- | --- | --- |
| Structured JSON (capture, reframe, intelligence, next-step, brief/plan extraction, reflection summary) | `gemini-2.5-flash` (`GEMINI_HABITS_FLASH_MODEL`) | `fetchGeminiStructured` |
| Multimodal structured (screenshot/inspiration capture) | `gemini-2.5-flash` | `fetchGeminiStructuredFromParts` (inline image bytes) |
| Grounded research (destination brief, trip plan) | `gemini-2.5-pro` then flash fallback | `fetchGeminiGroundedText` (+ `google_search`) |
| Image generation (dream covers) | `gemini-2.5-flash-image` → `gemini-3.1-flash-image` fallback | `generateGeminiInlineImage` |

Model ids are env-overridable (`GEMINI_PLANNER_MODEL`, `GEMINI_HABITS_FLASH_MODEL`,
`GEMINI_HABITS_PRO_MODEL`, `GEMINI_ASSET_IMAGE_MODEL`, `GEMINI_TEXT_FALLBACK_MODELS`). The
shared client already handles fallback chains on 404 / 5xx / quota / empty output.

**API key:** `GEMINI_API_KEY` (or `GOOGLE_GENERATIVE_AI_API_KEY`), server-only. Missing key →
`getBucketAiKeyOrFail()` returns a typed failure (`503`/`500`); the UI degrades gracefully.

---

## 2 · The two-call grounding rule

Gemini's `google_search` tool **cannot** be combined with `responseSchema` /
`responseMimeType: application/json` in one call (the API returns 400). Any route that needs
**both live facts and typed output** uses the established two-call pattern:

1. `fetchGeminiGroundedText` — gather facts from the web (free-form text).
2. `fetchGeminiStructured` — extract a typed JSON object from the research notes (no tools).

This is exactly how `trip-plan` and `destination-brief` work today, and how any new grounded
flow must work. **Only grounded output may carry travel/destination facts**, and even then it
is labeled (see §5).

---

## 3 · Structured output is validated at the boundary

Every AI route validates the model's output with **Zod at the route handler** before it is
returned to the client or written to Supabase. The Gemini `responseSchema` is best-effort
shaping; Zod is the contract. The existing routes already do this (e.g. the reframe
`smaller_versions` schema, the brief/plan schemas). New routes follow suit:

| Route | Validated output (shape summary) |
| --- | --- |
| `capture` / `capture-image` | `{ title, type, why_this_matters?, suggested_tags[], suggested_cost_band?, suggested_cover_keyword? }` — a draft, never persisted by the route. |
| `cover-image` | `{ imageUrl, storagePath, prompt, modelUsed, isAiGenerated: true }` — bytes uploaded; `bucket_dream_assets` row written with `is_ai_generated=true`. |
| `intelligence` | `{ readiness_state, readiness_reason, emotional_weight?, signals[] }` — cached onto the dream; respects user override. |
| `next-step` | `{ step, rationale, suggested_action_kind }` — suggestion only. |
| `activate/preview` | `{ project?, tasks[], savings_goal?, calendar[], note? }` — a preview; **no writes.** |

Malformed model output → `gemini_invalid_structured_output` → shaped by `bucketAiError`
(502) and a friendly client toast.

---

## 4 · Quotas & cost control

Per-user, per-day, per-kind caps are enforced via `bucket_ai_usage`
(`assertBucketAiQuota` → 429; `recordBucketAiUsage` after success). Quotas live in
`BUCKET_AI_DAILY_LIMITS` (`lib/ai/bucket-list/bucket-ai.ts`).

Existing caps: `destination_brief 20`, `trip_plan 10`, `reframe 20`,
`reflection_summary 30`, `smart_tag 60`, `inspire 30`.

Proposed caps for new kinds (tune after observing real usage):

| Kind | Daily cap | Rationale |
| --- | --- | --- |
| `dream_capture` | 60 | Cheap flash call; capture should feel free. |
| `dream_capture_image` | 30 | Multimodal, slightly heavier. |
| `cover_image` | 15 | Image generation is the most expensive; generous for personal use, protects the bill. |
| `intelligence` | 40 | Batched/cached; recompute is occasional. |
| `next_step` | 40 | Light flash call. |

Quota enforcement is **best-effort, fail-open** (matches existing behavior): if the usage
read fails we over-allow rather than block the user. Acceptable at personal-use scale; revisit
if abuse risk appears. Quota-exhausted returns HTTP 429 with a typed body and the existing
"Daily AI cap reached. Try again tomorrow." toast.

---

## 5 · Trust & labeling rules (binding)

These map 1:1 to the architecture safety rules (§14) and are enforceable in code:

1. **AI images are always labeled.** Any generated cover renders an "AI-generated visual"
   badge. `bucket_dream_assets.is_ai_generated = true` and `bucket_items.cover_image_is_ai`
   drive it. Generated visuals are inspiration, never a photo of the user's real experience.
2. **No fake live flight prices.** The mock provider's output is labeled "Estimated — not a
   live fare". Only a real, configured `FlightWatchProvider` may show a price without the
   estimate label. `bucket_flight_quotes.mode` (`exploratory` vs `live`) and `provider`
   distinguish them.
3. **Travel research is AI research, not verified truth.** Grounded briefs/plans carry the
   existing `unverified` flag and render with "AI research — verify before booking". Never
   present ungrounded output as factual destination/price information.
4. **Memories are never invented.** `reflection-summary` paraphrases only the user's supplied
   reflection text. The model is instructed (system prompt) to add no events, places, dates,
   or feelings the user did not state. Captions on memory photos are user-authored only.
5. **AI never auto-creates cross-module records.** Capture, intelligence, next-step, and
   `activate/preview` routes are **read/propose only** — they perform no Project / Task /
   Budget / Savings / Calendar / Note writes. Those happen client-side only after the user
   confirms the Activation preview.
6. **Suggestions are dismissable & overridable.** Readiness state can be set by the user
   (`readiness_overridden = true`) and AI must not clobber it. Signals can be dismissed.
7. **Provenance is recorded.** `capture_source`, `cover_image_source`, `model_used`, and the
   `unverified` flags make AI involvement always inspectable.

---

## 6 · Prompting conventions

- **System instruction** carries the role, the labeling/safety constraints (e.g. "do not
  invent facts; if uncertain, say so and set unverified"), and the output contract; the user
  turn carries the dream's data. Same shape as existing routes.
- **Temperature:** low for structured/extraction (0.3–0.4, as the helpers default), moderate
  for grounded research (0.5).
- **Locale-aware:** routes pass the user's `AppLocale` (via `BucketAiContext`) so output is
  generated in the user's language. UI strings come from `bucket-list-ui.ts`
  (`createLocaleCopyMap`, EN base + per-locale overrides, EN fallback).
- **Minimal-typing capture:** the capture prompt is tuned to infer `type`, a first
  why-it-matters line, tags, and a cost band from a short phrase or an image, returning a
  *draft the user edits* — it never assumes the draft is final.

---

## 7 · Error handling & degradation

Reuse the existing error surface (`gemini-errors.ts`, `bucketAiError`):

- HTTP `gemini_http_*` → 502 via `bucketAiError`; billing/quota messages via
  `formatGeminiBillingUserMessage` (no secrets, links to AI Studio).
- Region-blocked (`isGeminiRegionBlocked*`) → fail gracefully to the non-AI path.
- **Every AI feature has a non-AI fallback:** capture → manual form; cover → catalog/keyword
  image (`resolve-bucket-dream-image.ts`); intelligence → rule-only signals; reframe/brief/
  plan → simply unavailable with a clear message. The product is fully usable with AI off.

---

## 8 · Testing the AI layer

(See architecture §16 for the full strategy.) AI-specific gates:

- Zod boundary tests: malformed Gemini output is rejected, not persisted.
- Quota tests: 429 at cap; fail-open on usage-read error.
- Grounding tests: `unverified` propagates from grounded → structured → client.
- Safety tests: generated covers always set `is_ai_generated`; capture/intelligence/
  next-step/preview routes perform **zero** Supabase writes to other modules (spy on
  repositories); reflection summary contains no content absent from the input.
- Locale tests: routes honor `AppLocale`; new UI strings exist in EN + zh-TW.
</content>
