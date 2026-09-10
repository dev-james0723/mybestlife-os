# Travel animation repair — 8 September 2026

Execution state: **local implementation, validated; not committed, pushed or deployed.**

The Travel page now renders an interactive Earth without requiring a Google tiles key. Destination selection starts a smooth flight immediately. Google photorealistic tiles remain an optional detail layer with attribution and a bounded failure path.

## Defects repaired

- The previous globe returned `null` without a separate tiles key. A bundled Earth texture and WebGL globe now render independently; unavailable WebGL gets a visible world preview and usable destination controls.
- The mounted renderer ignored `target`, and both camera directors were disconnected. The active director now performs eased flights around the WGS84 ellipsoid, including polar and opposite-side destinations.
- Camera/control ownership, local-up synchronization, clipping planes, and angular-versus-distance limits are explicit. A renderer-level assertion verifies the chosen destination stays centered and within the visible depth range after arrival.
- WebGL detection previously allocated a new context on repeated snapshot reads. The probe now requires WebGL2, caches its result and releases the probe context.
- Empty search actions now focus the input. Search has an explicit touch button, cancellable requests, a 12-second bound, result selection, and inline errors. Tokyo, Paris and New York are coordinate shortcuts available without Places.
- Flying is independent of destination persistence. Save failures remain visible with retry; successful saves have an explicit confirmation. Stale async completions cannot replace a newer destination.
- Pause, resume, skip, replay, return to orbit and immediate pointer/wheel handoff are wired. Reduced motion settles immediately.
- Idle status no longer claims a flight is underway. Placeholder itinerary/recommendation panels were replaced by available destinations and actual nearby-place results.
- Place details use the shared accessible dialog. Escape/focus behavior works, retrieval errors can be retried, and failed place saves keep the dialog open.
- Missing geographic query parameters no longer turn into `0,0`; all three Places handlers share bounds validation.
- The search input avoids global field styling and uses 16px text to avoid iOS focus zoom. Floating capture/pet widgets are omitted on Travel, and unused Overview/Map modules load separately.

## Motion and rendering budget

- Frame-rate-independent camera interpolation with no per-frame vector allocation; telemetry updates approximately five times per second in a separate HUD subscriber.
- Demand rendering; rendering pauses when hidden or off screen, with clamped elapsed time on return.
- Mobile DPR capped at 1.25, with automatic reduction to 1 when sustained frame cost exceeds 25ms. Desktop caps are 1.75 and 1.25 respectively.
- Reduced star count on mobile, four visible POI labels at most, labels deferred until arrival, and bounded tile downloads, parsing and cache memory.
- World texture is served locally. Original source and upstream license links are in `app/public/travel/README.md`.

## Validation and evidence

All paths below are relative to the repository root.

| Check | Result | Evidence |
| --- | --- | --- |
| Doctor | Completed; existing environment warnings recorded during the run | `./scripts/doctor.sh` |
| Regression tests | 15 passed: polar/opposite-city flights, endpoint continuity, WebGL probe lifecycle, coordinate validation | `artifacts/travel-repair-2026-09-08/unit.log` |
| ESLint, changed source scope | Passed, no warnings | `artifacts/travel-repair-2026-09-08/lint.log` |
| TypeScript | Passed | `artifacts/travel-repair-2026-09-08/typecheck-final.log` and final build |
| Production route build | Passed; actual Bucket List page and text/autocomplete/nearby API routes emitted | `artifacts/travel-repair-2026-09-08/build-final.log` |
| Browser scenarios | 20 passed, no uncaught page errors | `artifacts/travel-repair-2026-09-08/browser-results.json` |
| Rejected tile provider + camera projection | Passed; globe survived a simulated 403, and Paris remained centered and inside the clipping planes | `artifacts/travel-repair-2026-09-08/tiles-failure-results.json` |
| Frame pacing | Latest short sample: median 16.7ms, p95 16.7ms, 0 of 119 intervals over 33.4ms | `artifacts/travel-repair-2026-09-08/browser-results.json` |
| Diff whitespace | Passed | `git diff --check` scoped to changed source |

The browser runs used local Supabase/Places fixtures and software WebGL in Chrome, including a 390 × 844 mobile viewport with device scale 3, desktop width, reduced motion, WebGL absence, and context loss/recovery. Simulated 503/403 responses test failures; no real account data was written. Other external resources were blocked by the fixture, producing expected resource/WASM console warnings outside the Travel renderer. Early iterations also exposed a transient development hot-reload parsing error; subsequent clean visits and the final browser run passed. Production bundling passed independently.

The frame sample measures browser frame scheduling during globe animation, not a sustained physical-iPhone GPU benchmark. Earlier samples had occasional 33ms frames. No blanket 60fps guarantee is made.

Review screenshots:

- `artifacts/travel-repair-2026-09-08/mobile-orbit.png`
- `artifacts/travel-repair-2026-09-08/mobile-london.png`
- `artifacts/travel-repair-2026-09-08/desktop-paris.png`
- `artifacts/travel-repair-2026-09-08/no-webgl.png`
- `artifacts/travel-repair-2026-09-08/denied-tiles-world.png` (isolated renderer fixture)

## Reproduction commands

From `app/`:

```sh
npm run test -- src/lib/travel-explorer/engine/flight-path.test.ts src/lib/travel-explorer/engine/capability.test.ts src/lib/travel-explorer/places/coordinates.test.ts
node node_modules/typescript/bin/tsc --noEmit --pretty false
node scripts/build-travel-verify.mjs
```

The route-build helper uses this installed Next 16 version's build entrypoint and asserts emitted routes; a `/404`-only build cannot count as a pass. It writes `.next-travel-verify` and never deploys.

Browser reproductions are in `artifacts/travel-repair-2026-09-08/browser-check.cjs` and `check-tiles-failure.cjs`. The first expects a local development server on port 3100 configured with the placeholder Supabase URL and a blank tiles key; all data writes and Places responses are intercepted. The second starts and closes its own local renderer fixture on port 3111 and explicitly denies tile requests. The temporary port-3100 server used in this run was stopped after validation. The existing port-3000 application was not stopped.

## Files, limits and next action

The exact implementation file list is `artifacts/travel-repair-2026-09-08/changed-files.json`; final source fingerprints are `source-sha256.json` in the same directory. Existing unrelated working-tree changes were preserved. Next-generated Travel-only TypeScript include entries were removed after validation.

Not performed: production deployment, Git push, production migration, account configuration changes, live Places/Supabase writes, or verification of real Google photorealistic city tiles. Real city imagery still requires a valid `NEXT_PUBLIC_GOOGLE_MAPS_TILES_KEY` and provider access. The globe and coordinate shortcuts work without that service.

`validation_unavailable` for Node 22 parity: the cached Node 22.23.2 executable terminated with exit 137 both inside and outside the sandbox. Successful build/tests/typechecking used Node 25.9.0. Physical iPhone/Safari and live provider checks remain follow-up validation.

Before a production release, review this candidate, verify the production tiles/Places configuration by metadata and real browser behavior, and run the iPhone check. The repository requires explicit approval for a push or production deployment. The installed Vercel CLI is 54.18.3; strongly recommend upgrading with `npm i -g vercel@latest` before release for compatibility. No global CLI upgrade was performed.
