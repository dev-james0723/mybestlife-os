# My Garden V3 execution checkpoint

User authorized execution of the accepted design on 2026-09-08. The design remains `proposal.zh-TW.md`; this file records implementation evidence, not a replacement scope.

## Delivery order and evidence still required

| Stage | Required outcome | Current evidence |
| --- | --- | --- |
| P0 source authority | Opted-in source receipts, stable intentions, one-time grants, rolling limits, corrections/privacy, isolation | Candidate SQL, 26 isolated checks including 600 layout/route parity cases, plus 34 native PostgreSQL checks; versioned pause/revise/resume and explicit partial task progress implemented; explicit linked evidence now has eight browser scenarios; stable lineage and all original UI write paths remain |
| P0 playability | Real input drives habitat placement, different fish routes and observation; no-reward replay | Actual browser input completed placement and animated discovery; voluntary user observation remains |
| P1 world | Persistent objects, three species, two layouts, growth, source attribution, free rearrangement/storage | Implemented candidate: three-species SQL conditions, starter fish, 8-hour growth, owned inventory, attribution and free storage; full milestone UX remains |
| P1 UX | Enter from Garden, close-up/fullscreen, Buddy, touch/keyboard, fallback, audio and quality settings | Touch/keyboard accessible placement, fallback, close-up camera and original audio integrated; native fullscreen enter/exit passed; 320px Chinese, landscape and tablet layout checks added |
| P1 verification | Rules, real isolated SQL, source mutations, retries, migration compatibility, browser playthrough, physical devices | 8 pure rules, 26 isolated SQL checks, 34 native PostgreSQL checks, 9 browser playthrough scenarios, 5 touch intention scenarios, 3 source-choice scenarios, 12 equivalence checks and 3 actual Buddy Dock scenarios passed. Each receipt records its tested revision. Physical mobile and complete release gates remain |
| P2 | Breeding, individual traits, collections, weekly projects, additional verified connectors | Depends on P1 and specified validation gates |
| P3 | Wetland then distinct forest/greenhouse prototypes and optional push | Depends on playability/enjoyment gates; do not claim untested gates passed |
| Product study | 6–8 voluntary users, two-week beta process, actual 30-day measurement | No participant data collected; cannot replace with synthetic retention |

## Implementation boundaries

Work in the existing app and preserve unrelated dirty changes. No worker delegation under the user's local operating rule. Use the current Node 22 runtime at `/private/tmp/garden-node22/node_modules/node/bin/node` for checks. Existing V2 source and research artifacts are the starting baseline. Read-only production metadata rechecked: V2 events exist; V3 worlds/grants and planner_focus_sessions do not.

Data changes are additive candidates until isolated validation and release review. Original life modules remain authoritative; neither browser CustomEvents nor dev fixtures count as verified account progress. New rendering uses the existing renderer/animation owner and original sage/wood/stone art and Web Audio direction.

## Design artifacts used during implementation

Player promise, primary/secondary verbs, loop contract and recovery: proposal sections 3–4. Level plan and staged biomes: sections 2 and 4. UI/device/art/audio: section 10. Server contract and dynamic life cases: sections 5–7 and 9. These approved artifacts are preserved; numerical changes must be recorded with their reason.

## Calendar compatibility decision

Habit intentions use a calendar date, not Garden's 04:00 invitation day. Current implementation uses the world/account timezone, while the existing Habits page uses the device-local date. These agree in the ordinary automatic-timezone case, but explicit account/device timezone disagreement remains an integration gap; do not claim all original Habits paths are compatible yet. Garden retains 04:00 invitation windows and rolling 24/168-hour grant limits. Weekday/every-N-day validation mirrors `streak-requirements.ts`; weekly-count habits allow a deliberately chosen day, without rewarding extra repetitions of that day. The source receipt is still the authority.

## Retry/privacy implementation

Only known PostgreSQL rule rejections or revision conflicts can be cleared from the IndexedDB outbox. Unknown transport outcomes retain the same command UUID. The server locks the world and receipt and never reapplies a known command. Its command ledger stores a request hash and applied revision, returning the current world on retry; it does not copy an ever-growing world snapshot into every command. Source deletion scrubs human-readable source labels while leaving the opaque deduplication key and earned world intact.

## Current evidence

- `artifacts/garden-v3/db/database-validation.json`: actual candidate SQL in isolated PGlite, 26 checks, migration SHA-256.
- `artifacts/garden-v3/concurrency/validation.json`: 34 native PostgreSQL 18.4 checks with distinct backend PIDs, fixture accounts only. Includes competing claims/builds, undo ordering, invitation uniqueness, operational pause/resume, bulk transaction atomicity, same-source-ID recreation, versioned intention edits, partial self-report deduplication and source-deletion races.
- `artifacts/garden-v3/playthrough/validation.json`: browser-driven test accounts, actual SQL RPCs, source rejection/recovery, lost-response retry, cross-context sync, and no-WebGL account B. This is not a live-account test or physical-device result.
- Dedicated optimized preview build: `app/scripts/build-pond-verify.mjs`, output `.next-pond-verify`, ports 3122 and 4312. Test-only credentials and loopback services; never deploy that output.
- No production migration, commit, push or deployment performed for V3.

## Required next work

[source-choices.md](source-choices.md) documents the completed-today task selector. It accepts only current Garden-day, unclaimed saved receipts from a connected module. Its three touch scenarios passed; the native PostgreSQL suite now contains 34 checks, including five source-choice cases and pause/resume coverage for the new read RPC.

Finish physical-device/performance and remaining accessibility/audio lifecycle verification; implement stable task split/recreation lineage; complete actual OS write-path checks, including the Habit account/device date mismatch and prepare an isolated release checkout. Source-aware Buddy hints and durable invitation caps now have candidate implementation and Dock/SQL evidence. Operational pause/resume scripts are locally verified; production compatibility and final release review remain. P2/P3 and real participant/retention gates remain as in the approved proposal. Do not substitute synthetic tests for enjoyment or 30-day retention evidence.


### Buddy validation after the first playable pass

Added candidate `20260908172055_garden_pond_buddy.sql`: actual growth-ready/opportunity facts, default-off consent, shared 24-hour/168-hour reservation budgets, shown-versus-reserved distinction, idempotent explicit feedback, a seven-day pause after two dismissals, and OS/Buddy/focus/quiet controls. Pure contextual companion copy, durable `buddy-settings`, UI opt-in, foreground hook, actual Dock metadata, explicit close/CTA feedback and account-indexed IndexedDB feedback queue are connected. The Leave Garden/view-toggle overlap was repaired. Actual Dock opt-in, growth invitation and offline dismissal/reload tests passed against the latest optimized build; no background notification was sent.


Unclaimed source metadata now has a 14-day lazy retention rule on the user's next Garden read. Evidence for active intentions, confirmed/over-cap settlements and earned grants is retained for safe retries and attribution. No source life record is deleted by this cleanup. Production has not received these candidate migrations.

### Release protection and recovery

`NEXT_PUBLIC_ENABLE_LIVING_POND` is explicitly opt-in and defaults off. It gates the entry, panel and new invitation calls; the fixture builder explicitly enables it. Source choice reads are restricted to connected modules, with browser assertions for rest-only and task-only consent. Unknown in-flight commands recover across pause/resume using the same UUID; the nine-scenario playthrough now covers that lifecycle.

See [release-readiness.md](release-readiness.md) for the exact migration order, OS write-path audit, tested pause/resume candidates and remaining gates. [playtest-protocol.zh-TW.md](playtest-protocol.zh-TW.md) is a ready-to-use first-study protocol, without invented participants or results. Scoped TypeScript, lint and optimized Garden/Dashboard build passed after the feature gate and consent changes.

Two harness failures were repaired without weakening assertions: initdb now uses explicit C locale/UTF8; a race-dependent test no longer chooses a cell that either build contender may occupy. A hidden positions disclosure is explicitly reopened after pause before testing its buttons. The native harness also explicitly exits nonzero after cleanup because its dependency's beforeExit hook otherwise overwrites process.exitCode.

### Dynamic intentions and chosen task scope

[dynamic-intentions.md](dynamic-intentions.md) records same-ID pause, revise, resume, planned dates, version conflict handling and explicit task-part self-report. These mutations do not grant objects themselves. Task-part confirmation leaves the source task unchanged and shares its one-time canonical award with full completion. The new `artifacts/garden-v3/intentions/validation.json` covers five touch flows through reload, source change, partial confirmation and placing the resulting object. Source-deletion races are checked with separate native PostgreSQL sessions. Explicit cross-module evidence is now implemented and separately verified below. Split/copy lineage and automatic Project/Goal changes remain.

### Accessible routes and equivalent outcomes

`artifacts/garden-v3/equivalence/validation.json` records twelve checks across actual keyboard activation with mute, touch with reduced motion, and touch without WebGL. All three build the same two starter layouts, follow different routes from the same three anchors after moving the stone, save observations, confirm a chosen rest, build the same perch and discover all three species. Audio contexts remain suspended during these muted flows. Fish routes are now also shown in position order, with explicit no-motion instructions. These are isolated browser tests, not a screen-reader audit, physical-device performance test or voluntary enjoyment study.

### Keyboard focus recovery

Actual keyboard probing found that opening the pond left focus on the Garden HUD, while Escape from inside the pond dropped focus to document.body. Pond entry now focuses the named region; Escape and the explicit close control restore the entered world's focus. `artifacts/garden-v3/focus/validation.json` records four passed browser checks, including Tab/Shift-Tab wrapping. The current optimized Garden/Dashboard build, scoped TypeScript and lint passed after this change. This does not replace a real screen-reader audit.


### Current implementation: linked evidence and pond immersion

[implementation-update.zh-TW.md](implementation-update.zh-TW.md) is the current user-facing checkpoint. The latest test-only optimized build and scoped TypeScript passed. Eight linked-evidence browser scenarios passed: a negative wrong-Habit-occurrence case, lost-response retry, shared attribution, persistent building, a later linked Gratitude record, second-context readback, repeated completion without another grant, and deleting the original source without losing its earned object. Eight immersion checks passed across reduced-motion touch and keyboard input. Observe now hides arrangement grid/ghosts and displays the actual three selected anchors; an optional focus control collapses the tools without losing route or placement state. No new renderer, animation loop or audio owner was added.

The previous Habit failure came from the fixture using database current_date instead of the linked occurrence. The fixture now saves the explicit occurrence and first proves a different date cannot claim it. This repairs the test, not the unresolved original Habits device/account date mismatch. No new SQL mutation was needed for these UI changes; the existing 34-check native receipt hashes still match the candidate migrations.


### Shared-worktree validation protection

A source-hash audit found that concurrent work changed GardenAdventure after the first successful browser run, then AdventureScene/adventure-world during revalidation. Added `garden-pond-build-evidence.mjs`: the optimized build records transitive source inputs, and serve/fixture setup refuse a mismatched checkout. It correctly stopped the equivalence suite before its final mode rather than issuing a misleading current-source receipt. The next complete pass runs from `/private/tmp/garden-pond-verified-ic2gto0c`, a frozen local test candidate with copied source/public assets and shared installed dependencies. No source files are copied back over concurrent work. Results must identify the frozen build, not imply every later workspace edit was tested.


The frozen candidate completed all 31 browser checks (8 linked evidence, 8 immersion, 12 equivalence, 3 layout), optimized build/scoped TypeScript and targeted lint. Receipts and screenshots were copied to `artifacts/garden-v3/`; `implementation-validation.json` identifies the exact candidate. At receipt time the shared checkout had newer changes to adventure-world.ts, gardener-motion.ts and pet-motion.ts, explicitly outside this pass. Do not rebuild repeatedly to chase concurrent changes; reconcile them when preparing the scoped release candidate. Current bounded next task is original Habits calendar integration, followed by Task lineage.


### Habit source-calendar integration candidate

Implemented captured `source_calendar` for new Habit selections and evidence links, server-date/IANA validation, preserved occurrence/zone during same-Habit revisions, midnight-based saved-today eligibility, and date/zone attribution on earned objects. Source triggers record completion facts without guessing frequency from the world timezone; new selections/links validate their calendar frequency. Old outbox commands remain compatible. `habit-calendar.md` records the contract. New native coverage passed 42 checks and PGlite passed 26; four new calendar unit tests plus eight spatial rules passed. The original Habits route is now included in the scoped build for a browser check of its existing repository writes, undo, re-completion and cross-calendar readback; this UI validation is still underway.


### Habit calendar completed locally

The original Habits Today checkbox flow now passes all five browser scenarios: device calendar selection against another account date, original repository save, Garden grant/build, original undo/re-completion without another award, and second-calendar readback with original attribution. Eight linked-evidence regressions also passed. Native PostgreSQL has 42 passing checks; PGlite 26; relevant units 12. A recovered frozen candidate at `/private/tmp/garden-calendar-verify-2xdsbkcc` passed Garden/Dashboard/Habits optimized build. `artifacts/garden-v3/habit-calendar-validation.json` is the exact receipt; only tsconfig.json differed from the workspace at final comparison. Next bounded implementation is Task split/copy/recreate lineage. Other Habit inputs, production compatibility and release/player gates remain. No migration, commit, push or deployment was executed in this pass.
