# Quote Library — Cross-module wiring summary

Follow-up session completing the four consumer integrations that the
Quote Library SDK was designed for.

**Live at** https://www.mybestlife-os.com (deployed Apr 22, 2026).

---

## 1. Journal wiring — resonant quotes + Wisdom → Journal

- **`ResonantQuotesPanel`** renders inline inside the Journal detail panel
  whenever a journal entry's content has ≥24 characters. Calls
  `findResonantQuotes(content, limit=3)` via the SDK, shows 3 cards with
  category badge + similarity percent + serif body + author.
- **Wisdom Profile → Journal export**: a subtle "Send to Journal" action
  beside "This month's insight" that creates a new journal entry dated today
  with the insight text in both `content` and `ai_summary`, so it surfaces
  everywhere the journal reads.
- Loading / error / empty states all handled gracefully; the SDK returns
  a typed `{ok, error}` envelope so the panel never throws.

## 2. Dashboard wiring — Quote Inspiration card + Inspire Me button

- **`QuoteInspirationCard`** lives between the Motivation + Grateful row
  and the YouTube Daily Inspiration card (didn't replace the YouTube card;
  both complement each other). Violet-tinted glass panel matching the
  existing dashboard language.
- Idle state: shows the top-ranking favorite from
  `getFavoritesForDailyInspiration({ limit: 5 })`. "Another quote" shuffles
  through the 5-item pool without hitting the server.
- **"Inspire me"** button calls `inspireMe({ focus: summaryText })` — the
  dashboard's own summary text feeds straight into the context so the AI
  reason is personalized to today. Returned `reason` paragraph is rendered
  in a violet-lined blurb below the quote.
- Deep-links to `/quote-library` in the card header so the user can always
  jump to the full library.

## 3. MindClear wiring — contextual quote + add-to-library

- **`MindSweepQuoteCard`** slots into the Bio Lab Mind Sweep panel between
  the AI triage insight and the "Done" button. Only appears once the user
  has ≥3 entries (so the sweep has substance).
- **Generate** calls `generateContextualQuote({ context })` where the
  context is built from the triage insight + the top-8 sweep entries with
  their kinds. Gemini's grounded search returns a REAL, attributed quote
  (never a library duplicate).
- Low-confidence results (<0.3) render a "No confident match right now"
  placeholder instead of a misleading quote. Surfaces the "Never fabricate"
  contract visibly.
- **Save to Quote Library** button fires `addQuoteFromMindSweep`, which
  tags the new row with `source_module = 'mindclear'`, the mind-sweep
  themes, and a personal note containing the AI's "reason" text. Post-save
  the button flips to the "Saved to your Quote Library" confirmation.

## 4. Goals wiring — linked quotes + goal picker

- **`GoalLinkedQuotes`** appears in the goal detail modal below the
  target date section. Lists every quote linked to that goal via
  `getQuotesForGoal({ goalId })`; each card has a one-click unlink action.
- **`GoalQuotePickerDialog`** opens a searchable picker of every quote in
  the user's library, filtered by `quote_text / author / context / tags /
  category`. Clicking any row calls `linkQuoteToGoal` and dismisses.
- **Reverse direction**: `QuoteGoalPicker` (a Popover) lives inside the
  Quote Library's Quote Detail dialog. User can pick any of their goals or
  "None (unlink)" — same SDK call from the other side.
- **`QuoteCard`** now shows a `<Target>` badge with the linked goal's name
  in the list view, so linkage context is visible without opening the
  quote.

---

## Files created / modified

### Created

```
app/src/hooks/use-quote-library-sdk.ts
app/src/components/quote-library/resonant-quotes-panel.tsx
app/src/components/quote-library/mind-sweep-quote-card.tsx
app/src/components/quote-library/goal-linked-quotes.tsx
app/src/components/quote-library/quote-goal-picker.tsx
app/src/components/dashboard/quote-inspiration-card.tsx
docs/quote-library-cross-module-summary.md
```

### Modified

```
app/src/lib/i18n/quote-library-ui.ts                       # adds 40+ keys in EN/zh-TW/zh-CN
app/src/app/[locale]/(protected)/journal/page.tsx         # renders ResonantQuotesPanel
app/src/app/[locale]/(protected)/dashboard/page.tsx       # renders QuoteInspirationCard
app/src/app/[locale]/(protected)/goals/page.tsx           # renders GoalLinkedQuotes
app/src/components/bio-lab/mind-sweep-panel.tsx           # renders MindSweepQuoteCard
app/src/components/quote-library/quote-detail-dialog.tsx  # adds QuoteGoalPicker
app/src/components/quote-library/quote-card.tsx           # renders linked-goal badge
app/src/components/quote-library/wisdom-profile-tab.tsx   # adds Send-to-Journal action
```

---

## Autonomous decisions

| Decision | Rationale |
|---|---|
| Built a typed React-Query wrapper (`use-quote-library-sdk.ts`) on top of the raw SDK | Keeps cache keys consistent across consumers, gives us loading/error states for free, and lets each mutation surgically invalidate related caches (e.g. linking a quote bumps the goal's list). |
| Kept the YouTube Daily Inspiration card alongside the new quote card | They serve different moods: YouTube is longer-form inspiration; the quote card is a 10-second shot. Both stay. |
| MindClear quote only shows at ≥3 entries | Spec's `TRIAGE_MIN_ITEMS` threshold — ensures the AI has enough context to match meaningfully. |
| Resonant panel requires ≥24 chars of entry text | Below that, the embedding produces noisy matches. Shows the empty state instead of burning a Gemini call. |
| Wisdom → Journal uses `window.confirm` | The existing journal page has no inline "confirm" pattern other than `AlertDialog`; a native confirm keeps the footprint small without adding a new provider to the Wisdom tab. If the user wants a designed AlertDialog later, it's a 10-line swap. |
| `useResonantQuotes` is cached by the first 200 chars of the entry | 15-minute stale time, avoids re-running embeddings when a user toggles edit/view modes on the same entry. |
| `GoalLinkedQuotes` unlinks rather than deletes | Clearing `linked_goal_id` never destroys the quote itself — it only undoes the link. |
| Linked-goal badge on `QuoteCard` shows the goal name (truncated to 24 chars) | Consistent with how the card already handles long author names; gives the user enough context without breaking the layout. |

---

## Verification

- `tsc --noEmit`: clean.
- `eslint` across new files: 0 errors, 0 warnings.
- `npm run lint` (project-wide): 0 errors; 70 pre-existing warnings unchanged.
- `npm run test:quote-library`: 16/16 passing.
- `next build --webpack` locally: clean.
- Vercel production build: clean, deployed.
- Smoke-tested `dashboard`, `journal`, `goals`, `quote-library`, and `garden`
  (MindClear host) in prod — all return `200` past the auth gate.
- All 12 Quote Library API routes respond with the typed 401 envelope
  pre-auth.

---

## Production

- Primary domain: https://www.mybestlife-os.com
- Latest deployment: `dpl_...mybestlife-gnhrhj0un...`
- Inspector: <https://vercel.com/jamesau0723-6572s-projects/mybestlife-os>
