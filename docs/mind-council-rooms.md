# Mind Council rooms

## What changes

The creation workspace keeps the question, recommendations, per-advisor selection and Run Council together. The existing single-advisor chat, profiles, custom advisor creation and deep links remain available through the advisor library. No global sidebar or project-map components are changed.

A new room accepts 2–4 advisors. It opens in a viewport-centered, responsive dialog with a generated scene on the left and a durable conversation on the right. Run Council starts the first question once. Scene generation and text discussion are separate requests, so an unavailable image provider does not prevent chatting.

The room image contains the selected advisors, in left-to-right roster order, and an anonymous seated foreground participant seen from behind. The participant is not an attempted likeness of the account owner. The actual account avatar is an independent overlay; it is never sent to the image service. Four fixed scene prompts cover a sunset library, garden room, city loft and coastal retreat. Surprise mode avoids the most recently created setting when possible.

Profile buttons, mention highlights and typing indicators are DOM/CSS overlays, not baked into the image. The image is contained without cropping. Overlay positions are normalized seat anchors, not facial recognition. Generative models can vary likeness and placement; exact facial alignment is not guaranteed. A failed generation stays an explicit error and is never replaced silently with unrelated figures or SVG people.

Save room adds the room to the account's saved library. Messages are written before they are displayed, including in a draft room. Saved rooms reopen the same roster, original scene object and transcript without triggering a fresh image generation. Closing an unsaved room asks for confirmation. Saving while the image is still generating is supported.

## Shared conversation, not independent answers

Full-name @mentions select the responding advisors, including a single participant within a larger Council. Multiple mentions preserve mention order. Without mentions, everyone responds. A selectable exchange mode runs two bounded rounds; in round two each advisor can respond to the preceding advisors. Every subsequent model call sees earlier persisted messages. A neutral summary follows a multi-advisor turn. The model context uses the most recent 48 messages; the durable room transcript is capped at 400 messages.

The server streams actual preparation statuses and complete persisted contributions over NDJSON. It does not simulate token streaming or pretend the real person is speaking. Interrupted turns retain their existing messages and resume only the unfinished steps of the latest turn. Stop/close disconnects further generation. A per-room lease prevents competing tabs from interleaving turns. Leases expire after six minutes to recover from a crashed worker.

## Gemini-only scene generation

Mind Council room scene generation uses Gemini only. `generateCouncilScene` delegates to the existing `generateGeminiInlineImage` helper in `app/src/lib/ai/gemini-image-generate.ts`, using `getGeminiServerApiKey()` from the existing text helper. There is no provider switch, alternate image service, separate image API credential or duplicate image-generation HTTP implementation in Mind Council.

The scene adapter supplies exactly one Gemini model, a 4:3 aspect ratio, the route's abort signal and a 32,000,000-character inline-data limit. It does not silently retry a different model or provider on refusal, quota exhaustion or failure. The shared helper's new controls are optional; other callers can still supply their existing explicit Gemini model chains without opting into the scene-specific settings. Intermediate thought images are skipped, and cancellation or timeout propagates instead of making another request.

Images are converted to 1440×1080 WebP using contain rather than crop. The scene endpoint still handles ownership, private storage, quota/lease checks and saved-scene reuse; its API contract is unchanged. Existing saved scenes remain accessible without regeneration.

## Deployment prerequisites

This branch includes source only. It does not apply production migrations, change billing, configure secret values, or deploy to production.

1. Review and apply `app/supabase/migrations/20260911010000_mind_council_rooms.sql` to an isolated development/preview database first. It creates four RLS-protected tables, a claim/quota RPC, and a private `mind-council-scenes` bucket. Test account separation before production rollout.
2. Text replies and room images reuse the existing server `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`. No additional image-service credential is required. An optional `MIND_COUNCIL_TEXT_MODEL` overrides the existing planner text model.
3. The only room image-model override is `MIND_COUNCIL_GEMINI_IMAGE_MODEL`, defaulting to `gemini-3.1-flash-image`. The scene request uses 4:3 framing. Confirm that the existing deployment key can access this image model; an available text model does not itself verify image-model access.
4. No ChatGPT connector connection is required for the application's scene endpoint. Image calls use the application's existing server-side Gemini integration and its provider account.
5. The host must support the routes' 300-second maximum duration. The image call has a 240-second timeout; a meeting has a 270-second total deadline. Lower hosting limits may interrupt requests; retries preserve completed text contributions.

Gemini model and image-generation configuration references: https://ai.google.dev/gemini-api/docs/image-generation and https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/image-generation. Successful production image calls have not been established by the source-only tests.

## Privacy and bounded costs

All room, transcript, scene and quota operations use the authenticated account and explicit ownership checks. Room images stay in private storage and are delivered through an authenticated same-origin route. Composite foreign keys prevent associating one user's messages with another user's room. No service-role key is exposed or required by these endpoints.

An account may attempt 12 scene generations and 100 meeting turns in a rolling 24-hour window, with at most three attempts per room scene and 50 new room records per day. Attempt receipts are append-only for authenticated clients. Reopening a ready room consumes no scene quota. Quota limits are protective application defaults, not a statement of provider pricing or a spending guarantee. Repeated failed attempts can still consume provider quota.

## Validation

Run from `app/`:

```sh
npm ci --ignore-scripts
node scripts/test-council-rooms.cjs
node scripts/test-council-rooms-gemini.cjs
npm run typecheck
npx --no-install eslint src/lib/ai/gemini-image-generate.ts src/lib/mind-council/room-*.ts src/components/mind-council/Council*.tsx src/components/mind-council/mind-council-experience.tsx src/app/api/mind-council/rooms
```

The Gemini regression script executes the actual shared image helper and room scene adapter, with synthetic credentials and mocked HTTP/text/auth dependencies. It covers helper reuse, single-model Gemini routing, both existing key names, model override, 4:3 framing and real WebP contain conversion, old helper request defaults/fallback chains, error/quota mapping, no provider switching, final-image extraction, encoded-size limits and cancellation/timeout propagation. It never calls a live image provider.

`app/scripts/council-rooms-db.test.sql` is exclusively for a **new disposable PostgreSQL database**. It creates minimal auth/storage fixtures; do not run that test script against an existing Supabase project. The feature's GitHub Actions workflow runs these fixtures on a disposable PostgreSQL 16 service.

The tests cover four-advisor validation, exact/Unicode mentions, peer-visible context, bounded rounds, durability-before-display, partial retry, cancellation, database ownership, private image access, saved-scene reuse, writer leases and quota enforcement. Real-provider generation quality, provider account permissions and production deployment require a separate authenticated acceptance test.

The browser regression script mounts the actual CouncilWorkspace/CouncilRoom components and CSS in an isolated Vite fixture. It substitutes only the API responses and Next's image/navigation adapter, then checks selection, centering, typing/mention state, keyboard selection, reduced motion, desktop/tablet/mobile geometry and saved-room reuse. Its screenshots deliberately use a blank synthetic image fixture, not an AI scene. It does not validate production authentication, provider output or full Next.js server rendering.
