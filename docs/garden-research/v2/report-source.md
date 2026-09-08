# A garden worth entering

Research for My Best Life OS · 8 September 2026 · Product and implementation decision brief

## Decision

Build a short, explorable gardening adventure around a responsive character, a following camera, deliberate tools, and a recognisable home. Let the user's existing Buddy guide the journey. The useful combination is hands-on gardening from Farm Land, spatial resource decisions from Misland, clear world/camera composition from Slow Roads and Bruno Simon, and forgiving daily participation informed by Duolingo's experiment. These sources justify design hypotheses; they do not establish a retention uplift for My Best Life OS.

Assumptions: this is a solo mini-game inside a personal life OS, typically played for 2–5 minutes on a phone or computer. Account achievements and user trust matter more than endless session length. Retain the app's slate, lime, botanical forms and frosted surfaces. No ads, multiplayer, paid randomness or mandatory daily attendance are needed.

## Browser games: mechanics worth adapting

| Reference | What the primary source supports | Application to Garden | Evidence limit |
| --- | --- | --- | --- |
| [Slow Roads](https://slowroads.io/) | Its live 2.4.2 page describes a procedural scenic driving escape. The changelog documents chase-camera orbit/zoom, speed-relative field of view, touch support, rendering controls and mobile rendering fixes. The live scene was entered: the road framed the next decision, the car remained central, and controls occupied the edges. | Follow the character through layered scenery; keep the route ahead readable. Offer camera rotation, zoom, a home view and measured quality settings. | Firsthand entry/visual inspection, not a complete driving playtest. No cohort retention data found. Its optional free-drive philosophy is inspiration for post-quest wandering. |
| [Bruno Simon's Folio 2025 source](https://github.com/brunosimon/folio-2025) | The author publishes the ordered input, physical-player, camera, world-zone, weather, foliage, interaction, audio and render update pipeline. | One simulation owner; input before motion, camera after motion, event-driven feedback. Use recognisable landmarks and a coherent world rather than detached controls. | Source architecture is verified. Stars/forks do not measure game retention; no audience-retention claim is made. |
| [Misland on Poki](https://poki.com/en/g/misland) | Gathering resources, trading, upgrading tools, hiring helpers and defending the island; WASD/arrows or mouse drag; phones, tablets and desktop supported. The page displayed 4.4 from about 80,900 votes. | Short trips with a capacity constraint, a useful reason to return home, visible improvement and learnable routes. A small gathering limit should create choices without becoming a chore. | Votes indicate substantial audience response, not DAU, unique players or retention. Combat and automated labour are not required for this garden. |
| [Farm Land by Homa on CrazyGames](https://www.crazygames.com/game/farm-land) | Plant, water, harvest, sell and expand; later animals and helpers. Mouse drag/WASD/arrows. Browser phone/tablet/desktop support and account-based saves are documented. The page lists landscape orientation. | Make actions change plant state visibly. Give earned materials a lasting use in world decoration and discoveries. Make saves and their failure state understandable. | Publisher support statements do not prove every device. Landscape-only is a limitation to improve on. This is Homa's Farm Land, not the similarly named Farm Land 3D. |
| [Growden.io](https://growden.io/) | The official entry page describes planting, watering, harvesting and playing with friends; it promises offline growth. | A return visit should reveal lasting progress and something to do. Account-backed achievements can change the world while the user lives their life elsewhere in the OS. | Only the entry page was verified. No verified retention or offline-growth implementation data; do not copy its promise without a server rule. |
| [Townscaper browser demo](https://oskarstalberg.com/Townscaper/) | The official demo exists, but its accessible entry text says mobile WebGL builds are unsupported. | Low-friction world shaping is a useful reference to investigate, but not evidence for cross-device compatibility. | Do not use this demo to claim all-device support or a challenge/retention loop. |

The earlier [Garden research report](../garden-retention-research.html) covers Grow a Garden, Animal Crossing, Finch, Forest and Wordle/NYT Games. Those wider examples support visible accumulation, companion attachment and bounded daily variety. They are complementary references, not substitutes for the browser-specific comparisons above.

## What the retention evidence actually says

Duolingo reports an A/B test that separated daily goals from maintaining a streak: one lesson was sufficient. It reports a **3.3% relative increase in Day 14 retention**, a **1% relative increase in daily active learners**, and fewer users meeting their larger daily goals. Those are company-reported experiment outcomes, not percentage-point changes or a transferable guarantee. The article's separate association between a seven-day streak and next-day use is observational. [Duolingo: Improving the streak](https://blog.duolingo.com/improving-the-streak/).

Application: make one small action count; offer optional mastery rather than requiring a lengthy route. Preserve past achievements after missed days. Measure both revisits and useful OS activity: a game that raises visits but displaces habits/tasks is not automatically successful. Avoid claiming that rendering quality or popular farming mechanics cause retention.

Proposed evaluation after release: assign consenting eligible users consistently to existing Garden or the adventure; compare D7/D28 meaningful return, task/habit/journal participation, invitation dismissals, accessibility success, crashes and session length. Define exposure and meaningful activity before the test. Report absolute and relative differences with uncertainty; segment new/returning users and device class. No experiment has been run and no new tracking provider is introduced by this research.

## Implementation decisions

1. Enter a close, third-person world with a visible player and the actual account Buddy. Explore the home glade, pond, orchard and butterfly trail. Rotate the camera and return it home when needed.
2. Plant three beds, fetch water, water each, explore while crops mature, harvest, then deliver a small basket. The first objective is close to spawn. Water capacity and optional timed trails create choices; empty supplies are recoverable.
3. A butterfly trail adds observation and timing: approach calmly, then guide it through successive meadow stops. A failed timed attempt can be retried without erasing gardening.
4. Real task, habit and journal activity produces clearly labelled daily encouragement/benefits. Existing plant type/stage and individual collected plants are visible. Fetch completion signals, not private writing.
5. Persist adventure actions, discoveries and decoration selection in dedicated account data. Process repeat actions idempotently; restore on another device; surface unsaved progress and retry after network failure.
6. Buddy invitations are optional, limited, and suppressed during focus, quiet hours and Garden play. Use the existing in-app Buddy surface with a direct Garden CTA. Do not imply push delivery while the app is closed unless a supported, permissioned channel is implemented and tested.
7. Prefer authored natural forms and reusable materials to effects. Target <=150 mobile draw calls, <=300k triangles, adaptive DPR up to 2, one shadow light and no mandatory postprocessing. Measure rather than certify all hardware.

## Source and gap ledger

Accessed 8 September 2026. All links above are primary creator/product/distributor sources. Slow Roads: live UI version 2.4.2, changelog dated 15 June 2026; entry and scene visually inspected. Bruno: current public README (undated). Misland: listing update October 2024, vote count is a time-sensitive snapshot. Farm Land: browser release February 2023, current listing/FAQ. Growden: current entry page, undated. Townscaper: current demo entry, undated. Duolingo: current article body, original publication date not exposed in retrieved body.

Searches: bounded primary-source discovery for Slow Roads controls/mobile, Bruno Folio game loop, Misland, Homa Farm Land, Growden, Townscaper web demo; exact follow-up to the Duolingo experiment. Search results containing similarly named games and unsupported student reports were excluded. Highest-impact mechanics/retention claims were checked directly on their primary pages. Stop reason: additional general game lists are unlikely to change the design; the remaining consequential evidence must come from implementing and testing this game with its accounts/devices.

Open gaps: public D7/D30 data for these web games; physical-device performance; whether the new loop improves this app's retention. All remain unproven. Browser listing support, visual appeal and local tests cannot settle those questions.
