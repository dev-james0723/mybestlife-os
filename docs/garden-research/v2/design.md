# Garden adventure — design and implementation contract

## Player promise
A little world you can step into, explore with your Buddy, and make more beautiful through the care you give yourself.

Feeling: curious, tactile, restorative. Primary verb: tend. Secondary verbs: walk, dash, explore, collect, guide, harvest, decorate. Every 5–30 seconds: choose a nearby bed or resource, approach, perform a deliberate tool action and see a response. Over 2–5 minutes: restore three beds, discover the pond/orchard, guide a butterfly and deliver a basket. A shorter visit can stop after any saved action.

## Core loop contract
The player plants, gathers water, tends and harvests a garden while limited can capacity, growing time and optional trail timing create route choices. Success grants a persistent day's expedition stamp, botanical discoveries and lasting decoration milestones. Failure in a timed trail costs only that attempt; retry is immediate. Daily care and previous stamps are never removed. A skilled player combines trips, tends beds before exploring, and times the optional trail; beginners can use relaxed play and explicit destination controls.

Proof obligations: the primary action is real input (E/action button), proximity alone does not farm plants; planting/watering/harvesting have distinct states/animations. Interaction hints name the nearby target and next step. All required resources are renewable. No external account activity is required to finish the game. Actual app activity gives bounded support, never fabricated completions.

## World plan
Ground-plane playable oval roughly 32 by 27 units, with a pond that blocks walking and a stone-lined walkable edge. Four landmarks: home glasshouse and account plant (south), three planting beds (west/centre/east), pond/refill point (east), orchard and discovery glade (north). Trees, roots, stone ledges, grass, fence/arch and lanterns compose foreground, middle and background. The first bed and a sign are visible from spawn. A follow camera with limited pitch/yaw/zoom keeps the character and next few seconds of travel in frame; a home/reset control recovers orientation.

First 30 seconds: enter, meet Buddy, choose a bed, plant, see water prompt. 30–90 seconds: capacity decision, second bed, first harvest or discovery. 90–180 seconds: trail timing, basket delivery, durable reward. Afterward: optional challenge replays and decoration placement remain playable. The daily seed varies butterfly trail and forage positions, while account habits and journal activity add trail flowers and pond lilies. Core landmarks remain stable.

## Systems and ownership
Pure deterministic TypeScript simulation and intent reducer; input -> fixed 1/60 simulation -> queued gameplay events -> account mutation/outbox -> camera/animation -> renderer. Custom circle ground collision is appropriate; no dynamic rigid-body stacks/slopes/platforming in this design. Dash is horizontal burst with recharge, not a physics jump. All graphics derive from accumulated simulation time (the relevant deterministic principle of the installed `three` skill). Browser rAF schedules display but does not independently own gameplay state.

Dedicated account state and an idempotent action ledger are required. A migration candidate must be locally exercised before production approval. No writes into Buddy stats or unrelated profile JSON. Reads/requests are bound to the authenticated user; a switch of account clears the old simulation and pending writes. Save conflict merges earned facts, not last-writer overwrites. Time boundary matches existing UTC Garden and is disclosed. Missing activity data is unknown, not zero accomplishment.

## Visual and UI direction
Botanical miniatures with authored leaf contours, layered petals, ribbed pots, weathered timber, stone paths and soft textile character details. Reuse actual Buddy identity/face art; author a companion with matching species/colour and recognisable silhouette. Slate/lime app surfaces, frosted menus, restrained cream labels. UI: compact objective upper-left, supplies upper-right, camera/pause/fullscreen controls at edges, joystick and contextual action bottom corners, brief Buddy speech above the lower HUD. Menus scroll on small screens; controls respect safe areas.

Quality: antialiasing, DPR up to 2, 2048 desktop/1024 mobile shadow, shared/merged world materials and instanced foliage. Adaptive reductions must be based on a sustained sample with hysteresis. Sound is opt-in and event-driven; muted/reduced-motion play conveys the same information through text/shape.

## Acceptance evidence
Target matrix: desktop 1440x900, laptop 1280x720, phone 390x844, small phone 320x740, tablet 820x1180, landscape 844x390; light/dark, keyboard/mouse/touch, reduced motion, no WebGL, native fullscreen accepted/rejected, rotation, enter/exit/focus restore. Real-input full expedition, optional challenge failure/retry, decoration, motion frames and renderer metrics. Database tests must cover auth/RLS, account A/B, two devices, duplicates, partial network failures/retries, day rollover and legacy account state. Buddy tests include event reactions, CTA, opt-out, quiet hours, cooldown and focus suppression. Full build, scoped and repository checks, inspected captures and a calibrated visual scorecard are required before completion.
