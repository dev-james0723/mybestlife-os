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

## Deployment prerequisites

This branch includes source only. It does not apply production migrations, change billing, configure secret values, or deploy to production.

1. Review and apply `app/supabase/migrations/20260911010000_mind_council_rooms.sql` to an isolated development/preview database first. It creates four RLS-protected tables, a claim/quota RPC, and a private `mind-council-scenes` bucket. Test account separation before production rollout.
2. Text replies use the existing server `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`. An optional `MIND_COUNCIL_TEXT_MODEL` overrides the existing planner text model.
3. Image generation uses a server API provider, not a ChatGPT connector login. Connecting OpenArt to ChatGPT does **not** configure this application's backend or transfer credits to it.
4. Optional `MIND_COUNCIL_IMAGE_PROVIDER` is `openai` or `gemini`. Without an override, an available `OPENAI_API_KEY` selects OpenAI; otherwise the existing Gemini key is used. No provider fallback is attempted on refusal.
5. `MIND_COUNCIL_OPENAI_IMAGE_MODEL` defaults to `gpt-image-2.5-sunburst`, medium quality, 1536×1152, WebP. `MIND_COUNCIL_GEMINI_IMAGE_MODEL` defaults to `gemini-3.1-flash-image`, 4:3. Provider/account access and generation cost must be verified in the deployment account. The API format is REST; no new SDK dependency is required.
6. The host must support the routes' 300-second maximum duration. The image call has a 240-second timeout; a meeting has a 270-second total deadline. Lower hosting limits may interrupt requests; retries preserve completed text contributions.

Model IDs and request formats were checked against the official OpenAI image-generation and Google Gemini image-generation documentation during implementation. Successful production provider calls have not been established by the source-only tests.

## Privacy and bounded costs

All room, transcript, scene and quota operations use the authenticated account and explicit ownership checks. Room images stay in private storage and are delivered through an authenticated same-origin route. Composite foreign keys prevent associating one user's messages with another user's room. No service-role key is exposed or required by these endpoints.

An account may attempt 12 scene generations and 100 meeting turns in a rolling 24-hour window, with at most three attempts per room scene and 50 new room records per day. Attempt receipts are append-only for authenticated clients. Reopening a ready room consumes no scene quota. Quota limits are protective application defaults, not a statement of provider pricing or a spending guarantee. Repeated failed attempts can still consume provider quota.

## Validation

Run from `app/`:

```sh
npm ci --ignore-scripts
node scripts/test-council-rooms.cjs
npm run typecheck
npx --no-install eslint src/lib/mind-council/room-*.ts src/components/mind-council/Council*.tsx src/components/mind-council/mind-council-experience.tsx src/app/api/mind-council/rooms
```

`app/scripts/council-rooms-db.test.sql` is exclusively for a **new disposable PostgreSQL database**. It creates minimal auth/storage fixtures; do not run that test script against an existing Supabase project. The feature's GitHub Actions workflow runs these fixtures on a disposable PostgreSQL 16 service.

The tests cover four-advisor validation, exact/Unicode mentions, peer-visible context, bounded rounds, durability-before-display, partial retry, cancellation, database ownership, private image access, saved-scene reuse, writer leases and quota enforcement. Real-provider generation quality, provider account permissions and production deployment require a separate authenticated acceptance test.

The browser regression script mounts the actual CouncilWorkspace/CouncilRoom components and CSS in an isolated Vite fixture. It substitutes only the API responses and Next's image/navigation adapter, then checks selection, centering, typing/mention state, keyboard selection, reduced motion, desktop/tablet/mobile geometry and saved-room reuse. Its screenshots deliberately use a blank synthetic image fixture, not an AI scene. It does not validate production authentication, provider output or full Next.js server rendering.
