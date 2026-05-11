# Quote Library SDK

Cross-module contracts that other pages consume to pull from, or push to,
the user's personal wisdom library.

**Surface is stable.** Dashboard / MindClear / Journal / Goals each have their
own follow-up Cursor session that imports only from this module — never from
the underlying API routes, Zustand store, or React-Query hooks.

```ts
import {
  addQuoteFromMindSweep,
  findResonantQuotes,
  generateContextualQuote,
  getFavoritesForDailyInspiration,
  getQuotesForGoal,
  inspireMe,
  linkQuoteToGoal,
} from "@/lib/quote-library/sdk";
```

Every function returns a `SdkResult<T>` discriminated union:

```ts
type SdkResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
```

Consumers should branch on `res.ok` before using `res.data`.

## Function reference

### `addQuoteFromMindSweep(input)`

Used by MindClear (spec 2.7) when the user taps **Add to Quote Library** on a
quote that surfaced mid-session.

**Input**

```ts
{
  text: string;
  source_author?: string | null;
  source_context?: string | null;
  personal_note?: string | null;
  mindSweepContext?: {
    sessionId?: string;
    mood?: string;
    themes?: string[];
  };
}
```

**Output** — `{ quote: Quote }`.
The newly-inserted row with `source_module = 'mindclear'`. Smart Tagging +
Source Intelligence fire asynchronously after the row is returned.

### `generateContextualQuote(input)`

Used by MindClear to surface an **external** quote (not from the user's
library) matching a context string.

**Input** — `{ context: string; language?: string }`
**Output** — `{ quote_text, source_author, source_context, reason, confidence }`

Backed by Gemini with Google Search grounding — always attributed. When the
model cannot verify, `confidence` drops below 0.3 and `source_author` is
`null`.

### `getFavoritesForDailyInspiration({ limit? })`

Used by the Dashboard Daily Inspiration card.

**Output** — up to `limit` (default 5, max 20) favorite quotes, preferring ones
not surfaced in the last 14 days.

### `inspireMe(context)`

Used by the Dashboard "Inspire me" button.

**Input**

```ts
{
  focus?: string;
  mindSweepSnippets?: string[];
  selfProfileSummary?: string;
}
```

**Output** — `{ quote: Quote | null; reason: string }`.

Uses `match_quotes` (pgvector) to find the best resonance, then Gemini Flash
to generate a short reason. Falls back to a random favorite when the context
is empty or the library has no embeddings yet.

### `findResonantQuotes({ journalEntryText, limit?, threshold? })`

Used by the Journal page (spec 2.3).

**Output** — array of `ResonantQuoteMatch` objects sorted by cosine
similarity. Empty array when the library is empty or no matches meet the
threshold.

### `linkQuoteToGoal({ quoteId, goalId })`

Sets `quotes.linked_goal_id`. Pass `goalId: null` to clear the link.

### `getQuotesForGoal({ goalId })`

Lists every quote linked to a goal.

## Authentication + RLS

All routes route through `/api/quote-library/*` and use the cookie-based
session. Every query scopes to `auth.uid()` via the RLS policies on the
`quotes`, `quote_collections`, `quote_collection_items`, `quote_ai_usage`,
`quote_daily_picks`, and `quote_wisdom_profiles` tables.

## Cost guardrails

Per-day per-user caps (see `lib/ai/quote-library/quote-ai.ts`):

| Kind                   | Cap  |
| :--------------------- | ---: |
| source_intelligence    |   20 |
| smart_tagging          |  100 |
| daily_quote            |    3 |
| wisdom                 |    2 |
| inspire                |   30 |

All caps reset at UTC midnight. Over-quota responses return HTTP 429 with
`{ error: "quota_exceeded", kind, limit, used, resets_at }`.
