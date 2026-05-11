# Quote Thumbnail Pipeline

Cinematic background generator for the Quote Library. Every saved quote gets
its own emotionally-relevant editorial thumbnail, asynchronously rendered
via Gemini and stored in Supabase Storage.

## Architecture

```
Save Quote
    │
    ▼
quotes.thumbnail_status = 'pending'
    │
    ▼  (POST /api/quote-library/generate-quote-thumbnail, fire-and-forget)
generateQuoteThumbnail()
    │
    ├── analyzeQuoteWithGemini()              → structured visual direction
    ├── generateQuoteThumbnailPromptFromDirection()  → final image prompt
    ├── generateQuoteThumbnailImage()         → Gemini renders PNG bytes
    ├── uploadQuoteThumbnailToSupabase()      → public bucket URL
    └── update quotes.thumbnail_*             → row carries everything
```

Failure paths short-circuit cleanly:

- Missing API key → `thumbnail_status = 'fallback'` + deterministic gradient
  metadata persisted, error captured in `thumbnail_error`.
- Gemini analysis fails → same fallback path.
- Image rendering or upload fails → `thumbnail_status = 'failed'`,
  `thumbnail_error` set, retryable through the **Regenerate thumbnail**
  button or `/api/quote-library/regenerate-quote-thumbnail`.

## Files

| File | Responsibility |
| --- | --- |
| `fallback.ts` | Deterministic mood-family classifier + dark gradient palettes. |
| `analyze.ts` | Gemini structured-output prompt + Zod validator. |
| `image.ts` | Gemini image generation with model fallback chain. |
| `upload.ts` | Supabase Storage upload + cleanup helpers. |
| `pipeline.ts` | End-to-end orchestrator: generate / regenerate / backfill. |

## Environment variables

- `GEMINI_API_KEY` (required, server-only). Aliased: `GOOGLE_GENERATIVE_AI_API_KEY`.
- `GEMINI_QUOTE_THUMBNAIL_MODEL` (optional). Defaults to
  `GEMINI_SCHEDULE_IMAGE_MODEL`, which itself defaults to
  `gemini-2.5-flash-image`. The pipeline retries with
  `gemini-2.0-flash-preview-image-generation` on quota exhaustion.
- `GEMINI_HABITS_FLASH_MODEL` (optional, shared with smart-tagging). Used by
  the analyzer; defaults to `gemini-2.5-flash`.

## Running migrations

```bash
cd app
npm run db:link    # one-time
npm run db:push
```

The new migration is `supabase/migrations/20260702000000_quote_library_thumbnails.sql`.
It adds:

- 10 columns to `public.quotes` (see migration file).
- The `quote-thumbnails` Storage bucket with public read + owner-write RLS.

## Backfilling

The auth'd backfill endpoint processes a small batch per request:

```bash
# Logged in as the user, via the browser / curl with cookies
curl -X POST \
  -H 'Content-Type: application/json' \
  --cookie "$(grep -E 'sb-' .cookies)" \
  -d '{"limit": 8}' \
  http://localhost:3000/api/quote-library/backfill-quote-thumbnails
```

Pass `{"force": true}` to re-roll thumbnails that already exist. Repeat
until the response shows `summary.processed === 0`.

For a programmatic loop you can invoke `backfillMissingQuoteThumbnails()`
directly from a server action:

```ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { backfillMissingQuoteThumbnails } from "@/lib/quote-library/thumbnail/pipeline";

const supabase = await createServerSupabaseClient();
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  await backfillMissingQuoteThumbnails({
    supabase,
    userId: user.id,
    limit: 12,
  });
}
```

## Pipeline version

`thumbnail_version` is stored alongside every successful run so future
prompt-template upgrades can target old rows for re-rendering. Bump
`QUOTE_THUMBNAIL_PIPELINE_VERSION` in `upload.ts` whenever the prompt or
image model changes meaningfully.
