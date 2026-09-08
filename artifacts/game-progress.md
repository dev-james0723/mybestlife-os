# My Garden 3D — implementation checkpoint

State: local implementation and validation complete. No deployment or production writes.

## Intent and constraints
- Replace the single 2D plant as the main experience with a playable Three.js sanctuary.
- Match the app's slate, lime, frosted surfaces and light/dark themes.
- Touch, mouse, keyboard; a full button-based alternative when WebGL is unavailable.
- Preserve existing account-backed plants, inventory, and collections. No new cloud provider or schema is needed.
- Respect existing uncommitted work. Only garden files and task-specific evidence/scripts are owned by this change.

## Research plan
1. Discovery: primary product sources for Grow a Garden, Animal Crossing, Finch, Forest, Duolingo; independent evidence on motivation. Complete.
2. Follow-up: distinguish concurrent use from retention, relative from absolute experiment results, and association from causation. Complete.
3. Synthesis: research report and implementation contract. Complete; see `docs/garden-research/`.
4. Implementation: pure gameplay, authored scene, responsive UI, existing account persistence. Complete.
5. Verification: 13 engine/persistence tests, scoped lint and typecheck, and optimized Garden route build pass. All 10 optimized browser scenarios pass with zero captured runtime or renderer errors, including the repaired reduced-motion chest markup.

The deep-research skill's update_plan tool is unavailable in this session; this file records the plan instead. No workers: supplied local operating rules restrict delegation unless explicitly requested.

## Decisions
- A daily seeded dew-delivery route: carry up to three drops, spend two at each of three flower beds. Tap destinations or use arrows/WASD. Relaxed by default, optional 90-second challenge.
- Round victory enables today's watering using the existing garden repository. Replays grant no additional daily growth. Direct care remains available for accessibility and short visits.
- Existing care history is a forgiving seven-day rhythm, not a reset-or-lose streak. Collection and plant growth remain durable.
- Completed tasks and journal entries are read as daily encouragement and optional starting dew; game does not modify them.
- Procedural art is intentional: custom botanical miniatures, sprout companion, pond, paths, lanterns, soft stone island. No external asset submissions.
- Saved plant/collection data sync through the existing account. Cosmetic settings remain device-local and are described that way.

## Acceptance / level plan
Player promise: a tiny place that grows with the care you give yourself.
Primary verb: guide the companion. Secondary verbs: collect dew, tend flowers, choose a route, grow the persistent plant.
Loop: gather two drops, choose a flower, deliver; capacity and optional clock create route choices; three blooms win. Failure offers instant retry or relaxed continuation without losing garden progress.
Space: bounded oval island, three separated beds, six daily-positioned drops, a pond slowing movement, central home plant and curved stepping stones. Camera keeps every objective visible in portrait and landscape.
Daily variation: stable seeded positions and a named botanical atmosphere; same day replays are consistent. Long-term: harvested plants populate the island, three appearance palettes unlock through existing care history.

## Repairs and evidence
- Merged static meshes now normalize indexed/non-indexed geometry, restoring the complete foliage.
- The 320px layout has no horizontal overflow; compact landscape uses an expanded modal with focus management.
- Offscreen detection includes the accessible destination controls, so scrolling to them does not pause play.
- Separate build/preview lifecycles prevent stale webpack cache failures; the build script refuses an occupied preview port.
- The existing daily chest now uses stable server/client markup and CSS reduced-motion hiding.
- Detailed files, commands, release boundaries and source links: `docs/garden-3d-implementation-receipt.md`.

## Remaining release work
No physical devices or live account were used in validation. The full repository typecheck has three unrelated relationship-test fixture errors. Resolve those and perform an authorized staging/device pass before deployment.
