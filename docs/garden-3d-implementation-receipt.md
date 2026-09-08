# My Garden 3D — local implementation receipt

Date: 7 September 2026. Execution state: local code and isolated browser fixtures. Not deployed; no live account or database writes were made by the verification scripts.

## Delivered behavior

My Garden now opens on a Three.js botanical island with a sprout companion. Players collect dew, choose delivery routes and revive three flower beds. The can holds three drops and each bed takes two. A shallow pool slows movement. Relaxed play has no deadline; the optional 90-second challenge awards route stars. Timeout supports continuation without a timer or a clean retry.

The account's real plant and growth stage appear in the island. Existing collection entries add flowers to its border. The game provides today's watering action, with the same daily limit as quick care; replaying the adventure does not multiply the watering reward. Completed tasks and journal entries each give one starting drop, capped at two. These reads fetch IDs only, not private contents.

The seven-day care display counts days without destroying past progress after a missed day. Three total care days unlock lavender, seven unlock the golden grove. Palettes, sound, battery saving and gentle-motion preferences are stored on the device; plants, inventory, collections and care history use the existing account backend. Active rounds and route stars are session-only, not a new cloud save. The daily boundary remains UTC to match the original garden data and is displayed in the interface.

Mouse/touch destinations and arrows/WASD move Sprout. Explicit destination buttons play the same simulation, including when WebGL is unavailable. Keyboard focus is scoped to the game. Expanded play uses a portal, makes the underlying app inert and traps keyboard focus. Small landscape displays enter expanded play automatically. Hidden/background play pauses; a renderer outside the viewport stops drawing. Reduced motion removes decorative movement. Battery saving caps drawing to 30 fps and DPR to 1; standard rendering caps DPR at 1.5.

Existing seed selection, fertilizer, harvest, daily chest, inventory, collection and Bio Lab tools remain available. Seed bloom estimates now follow the actual growth rules. Watering uses a compare-and-set update to avoid concurrent lost/duplicate increments; a failed daily-log write can be retried without duplicating growth. No new migrations or provider integrations are needed.

## Research

[Read the formatted research report](garden-research/garden-retention-research.html). It compares Grow a Garden, Animal Crossing, Finch, Forest, Duolingo and Wordle/NYT Games, separates reach from retention, reviews motivation research, and proposes a D7/D28 experiment focused on meaningful app activity. No retention uplift is claimed or measured. No analytics provider, live experiment, notifications, leaderboard, multiplayer system or paid asset service was introduced.

## Files owned by this change

- `app/src/app/[locale]/(protected)/garden/page.tsx`: new game as primary page content; existing secondary tools retained; remove automatic wilt-on-visit.
- `app/src/components/garden/GardenGame.tsx`: lifecycle, inputs, UI, accessibility and existing-account integration.
- `app/src/components/garden/GardenScene.tsx`: lazy client renderer, responsive camera, tap raycasting and cleanup.
- `app/src/components/garden/garden-world.ts`: authored procedural models, material sharing and static geometry merging.
- `app/src/components/garden/garden-game.module.css`: app-aligned surfaces and responsive/expanded layouts.
- `app/src/components/garden/SeedSelector.tsx`: corrected growth estimate.
- `app/src/components/garden/DailyChest.tsx`: keep identical server/client markup while hiding decoration through the reduced-motion media query; fixes the hydration mismatch exposed by the accessibility browser case.
- `app/src/hooks/use-garden.ts`: account-scoped query keys and care/activity queries.
- `app/src/lib/repositories/garden.ts`: care/activity reads, watering concurrency and retry handling, accurate growth estimates.
- `app/src/lib/garden/game.ts`, `game.test.ts`, `app/src/lib/repositories/garden.test.ts`: deterministic simulation and meaningful rule/persistence tests.
- `app/src/lib/i18n/garden-game-ui.ts`: English and Traditional Chinese copy, following the existing locale fallback mechanism.
- `app/scripts/build-garden-verify.mjs`, `verify-garden-game.mjs`, `render-garden-research.mjs`, `app/tsconfig.garden-verify.json`: repeatable local evidence workflow.
- `app/.gitignore`: one additional exclusion for `.next-garden-verify/`; existing changes preserved.
- `docs/garden-research/`, this receipt and `artifacts/game-progress.md`: research and handoff.

## Validation

- `./scripts/doctor.sh`: completed. Node 25.9.0 is installed, while the repo requests Node 22. Docker/Tailscale/gh authentication warnings are unrelated to this implementation. No environment secrets printed.
- `npm run test -- src/lib/garden/game.test.ts src/lib/repositories/garden.test.ts`: **13 tests pass**, including 365 completable daily routes, capacity, pause, timeout continuation, boundaries, concurrent saves and partial-write retry.
- Scoped ESLint across all changed Garden TS/TSX files: **pass**.
- `npx tsc -p tsconfig.garden-verify.json --noEmit --pretty false`: **pass** for Garden entrypoints and their transitive application imports.
- `node scripts/build-garden-verify.mjs`: **pass**, optimized Garden route confirmed in the route manifest. This is a test-only compile/generate build with placeholder service configuration and local auth bypass. It must never be deployed. The script requires scoped TypeScript validation first and refuses rebuilding while the preview port is occupied.
- Full `npx tsc --noEmit --pretty false`: **blocked by three existing errors** in `src/lib/repositories/relationships-compatibility.test.ts` at lines 13, 19 and 24. The supplied insert fixtures omit required `RelationshipInsert` fields. Those unrelated files were already modified before this work and were not changed here. This is not a passing full-app release check.
- Final optimized browser matrix: **10 scenarios pass**, with zero captured runtime or renderer errors and no horizontal overflow in the tested layouts. Includes keyboard and touch movement, victory, sound, watering/reload, rotation, reduced-motion Chinese UI, WebGL fallback, empty account, service recovery and timeout continuation/retry. Evidence: `artifacts/garden-3d/optimized/results.json`. Browser data is intercepted fixture data, not live persistence validation.
- The formatted research report and six-row comparison table were opened, checked and visually inspected. Screenshot evidence is in the same optimized evidence directory.
- Scoped `git diff --check`: **pass**.

## Reproducing the browser check

From `app/`, run `node scripts/build-garden-verify.mjs`, then `node scripts/build-garden-verify.mjs serve` in a separate terminal. Once the loopback server is ready:

```sh
GARDEN_VERIFY_URL=http://127.0.0.1:3100 GARDEN_VERIFY_OUT=../artifacts/garden-3d/optimized GARDEN_VERIFY_SCOPED_BUILD=1 node scripts/verify-garden-game.mjs
```

The harness covers real keyboard/touch input, destination-driven victory, opted-in sound events, watering with reload, phone rotation, landscape expansion, 320/390/820/844/1440-wide views, light/dark themes, Chinese copy, reduced motion, unavailable WebGL, empty data, service failure/recovery and timed retry/continuation. It captures motion frames and checks canvas pixels, renderer metrics, overflow and runtime errors. It also checks and captures the research HTML opening and comparison table. The reference pictures are evidence of the tested states, not a claim of pixel-perfect baseline regression testing.

## Known boundaries and next action

Renderer snapshots show 79–82 draw calls and roughly 52,000–56,000 triangles in the tested states. The instantaneous diagnostic FPS field can include startup/resize spikes; it is not a sustained performance benchmark or a device certification.

Physical iOS/Safari and Android hardware testing is `validation_unavailable`: no physical mobile devices are attached to this environment. Browser emulation verifies responsive layout and input but does not certify every device or GPU. Other languages use the existing English fallback; the Simplified Chinese locale currently shares Traditional Chinese game copy.

Live authenticated persistence is `validation_unavailable`: validation deliberately uses isolated fixtures to avoid modifying the user's production data. The game reuses the existing backend schema and permissions, but production schema/authorization was not inspected. Legacy chest/fertilizer/harvest operations retain their existing multi-request backend semantics; stronger transactional guarantees for those operations are a separate database change.

No commit, push, migration, production deployment, paid generation, global tool installation or notification was performed. Next: review the local game and report, resolve the unrelated repository type errors, then perform an authorized staging/account and physical-device pass before release. Vercel CLI is 54.18.3; upgrading with `npm i -g vercel@latest` is strongly recommended before deployment, but no global upgrade was run.

Skills actually read: Three.js game director, gameplay systems, graphics builder, UI designer, debug/profiler and QA/release, with their relevant gameplay/UI/authoring/budget/debug/release/motion references; Deep Research. The `three` HyperFrames adapter skill was inspected and ruled out because this is a live game, not a video composition. Installed Next 16 lazy-loading documentation was read before implementation.
