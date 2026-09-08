# A garden worth returning to

Research and product direction for My Best Life OS · 7 September 2026

## The decision

Build a short, playable 3D garden adventure around visible, lasting growth. The best fit is a small sanctuary with a companion, daily variety, a collectible garden and optional skill challenges. Let a useful real-life action make the next visit easier. Measure whether the game brings users back to meaningful activity in the app, rather than assuming more game time is a success.

The research supports this direction as a hypothesis. It does not establish that any borrowed mechanic will improve this app’s retention. Viral reach, concurrent players, downloads, self-reported enjoyment and controlled retention experiments are different kinds of evidence.

## What successful products actually show

| Reference | Evidence and strength | Transfer to My Garden | What to avoid |
| --- | --- | --- | --- |
| **Grow a Garden** | Roblox’s December 2025 review reports **21.6 million simultaneous players in July 2025**. Its official game listing promotes growth while players are offline. Strong evidence of enormous reach; neither source provides cohort retention attributable to this mechanic. | Plants that visibly develop; a world that feels worth revisiting; collection milestones; a simple first action. | Copying event-driven urgency, stock scarcity or platform-wide viral assumptions. |
| **Animal Crossing: New Horizons** | Nintendo documents real-time seasons, collecting creatures, island customization and daily island activity. This is a well-established product design reference, not an experiment isolating its retention drivers. | A familiar home, botanical variation, personal expression and a permanent collection that changes the world. | A daily chore list so long that maintaining the game becomes work. |
| **Finch** | Its help center explains that completing self-care goals earns energy or stones and supports the companion’s growth. Primary evidence of the product loop, with no public controlled retention estimate in the reviewed material. | A friendly companion; a completed task or reflection gives the game a gentle boost. Show the link between care for the user and care for the garden. | Pretending that playing a game is proof of improved wellbeing. |
| **Forest** | The official product describes growing trees during focus sessions and a forest representing accumulated focus. Its website reports 60 million users, a self-reported reach measure. | Make useful time and completed actions visible in a growing place. Keep personal progress durable. | Withering as the central motivator, or making focus harder to access behind a game. |
| **Duolingo** | A reported A/B test separated streak continuation from a larger daily goal. Completing one lesson was enough; **Day-14 retention increased 3.3% relatively**, with overall daily active learners increasing 1%. The same report notes that fewer learners met their larger daily goals. | A small daily action should count. Keep the optional challenge separate from the daily care reward. Track real app outcomes alongside returns. | Treating 3.3% as percentage points, or importing that effect estimate into another product. |
| **Wordle / NYT Games** | Axios reports the Times’ figures of over eight billion game plays in 2023, including 4.8 billion Wordle plays. These are plays, not unique users or a retention rate. This is an adjacent daily ritual reference, not a close genre match. | A recognizably fresh daily trail, consistent within a day, and a satisfying stopping point. | Assuming a daily refresh alone recreates Wordle’s social distribution. |

Sources: [Roblox’s 2025 review](https://about.roblox.com/newsroom/2025/12/roblox-replay-decoded-search-style), [official Grow a Garden listing](https://www.roblox.com/games/126884695634066/Grow-a-Garden), [Nintendo’s official game overview](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-games/Animal-Crossing-New-Horizons-1438623.html), [Finch’s self-care approach](https://help.finchcare.com/hc/en-us/articles/37935669335309-Our-Approach-to-Self-Care), [Finch goal completion](https://help.finchcare.com/hc/en-us/articles/37779940291213-Creating-and-Completing-Goals), [Forest](https://www.forestapp.cc/), [Duolingo’s experiment](https://blog.duolingo.com/improving-the-streak/), [NYT Games figures reported by Axios](https://www.axios.com/2024/01/29/wordle-nyt-games-news-media-layoffs).

## Why the design needs choice, progress and kindness

A 2024 meta-analysis by Li, Hew and Du covered 35 independent interventions and 2,500 participants. It found a small positive effect of gamification on intrinsic motivation, Hedges’ g = 0.257, with substantial design questions around autonomy and competence. Its population was educational, so it cannot directly predict behavior in a personal productivity application. It supports testing a game with meaningful choices and clear feedback rather than assuming points alone create motivation. [Original research, Educational Technology Research and Development](https://link.springer.com/article/10.1007/s11423-023-10337-7).

Duolingo also documents mechanisms that protect a streak during an absence or service issue. The relevant design lesson is flexibility: returning should be approachable after an interruption. My Garden therefore emphasizes days of care over the past week and keeps growth after missed days. It does not penalize the user by destroying a plant. [Duolingo’s streak protection](https://blog.duolingo.com/protecting-streaks-from-site-issues/).

These are design inferences, not causal claims about My Best Life OS. A companion can create emotional attachment, but that attachment should support the person’s goals. A timer can make a route interesting, but should be optional. Collecting can create anticipation, but rewards should be legible and attainable.

## The proposed play loop

**Within the first 30 seconds:** meet Sprout, choose relaxed or timed play, move to a visible dew drop, and watch the watering can fill. A flower bed takes two drops; the can holds three. Players choose whether to collect an extra drop before crossing the island or deliver immediately. The pond slows movement, making route choice matter without trapping the player.

**Within one visit:** revive three flower beds. The relaxed mode has no deadline. The optional 90-second challenge gives one to three route stars, while earning the same daily plant care as relaxed play. Timeout offers a retry or continuation without a timer; completed beds remain intact when continuing. Finishing makes the island visibly bloom, then offers today’s water for the account’s growing plant.

**Across days:** a date-based seed changes drop positions and the trail identity. Care is limited to the existing daily boundary. A seven-day rhythm makes accumulated effort visible. Three care days open the lavender palette, seven open the golden grove. Harvested plants add flowers to the island, and existing species unlock through the collection. The palette is a local preference; plant growth and care records belong to the account.

**Outside the game:** a completed task and a journal entry each add one starting drop, capped at two. They are optional. The garden checks only whether those records exist, without copying task descriptions or journal content into the game. Users can go directly to the task or journal page. Quick care remains available for short visits and accessibility.

## Visual and device direction

The app’s existing reference is slate and lime with translucent surfaces, subtle borders and restrained motion. The game carries that language into a botanical miniature: a layered stone island, moss, stepping stones, a shallow pool, sculpted trees, a little bench, lanterns and a soft sprout companion. It is intentionally authored with procedural geometry, so it needs no downloaded asset packs or external generation service.

Tap-to-walk works on phones and tablets; mouse and arrow/WASD controls work on desktop. A destination list provides an equivalent button-based route through the game. When WebGL is unavailable, that same simulation and reward path remain available. Rendering should respect reduced motion, pause on backgrounding and when the game scrolls out of view, cap pixel ratio, and offer a battery-saving mode.

Responsive emulation can establish layout and input correctness. It cannot establish performance on every real phone, GPU, browser, assistive technology or embedded webview. A physical-device pass is still needed before a broad release claim.

## How to determine whether it works

Run an opt-in randomized test among eligible new users, with existing Garden as the comparison. Define cohort, exposure and assignment before reading outcomes. Choose a minimum detectable effect and sample size from current baseline traffic; no baseline or sample size is invented here.

Primary outcome: **D7 and D28 return with a meaningful action** (a saved task completion, journal entry or other explicitly agreed app action), measured from initial exposure. Count a user once per day. Secondary outcomes: first adventure completion, return to care, task/journal transitions, completed action after a garden visit, seed-to-first-harvest conversion, and returning after a missed day. Guardrails: task completion per active user, time-to-useful-action, abandonment, performance errors, accessibility failures and user-reported pressure.

Suggested event contract for a later analytics implementation: garden_viewed, adventure_started(mode), adventure_finished(mode, duration_bucket), adventure_paused, care_saved, life_action_opened(type), palette_selected and renderer_fallback(reason). Never include journal content, task titles or arbitrary identifiers. No new tracking service or live experiment is installed as part of this change. Existing care logs can support historical care counts, but are insufficient to infer causal retention uplift.

Do not declare success from a higher garden session duration alone. A useful result would combine better sustained app participation with unchanged or better real-life task outcomes and acceptable user sentiment. Stop or revise an experiment that produces more checking but less useful activity.

## Research boundaries and stopping decision

Discovery covered six products and motivation research. Follow-up checked the highest-impact numbers against original Roblox and Duolingo sources, separated relative changes from percentage points, and reviewed disconfirming evidence: Duolingo’s lower goal completion and the small motivation effect in the meta-analysis. Nintendo’s US explore page timed out twice; the official UK overview was readable and used instead. Public Finch and Forest material establishes their mechanics but not independently audited retention. No platform’s private cohort data was available.

Research stopped when each implementation decision had a relevant source or a clearly marked design inference, and the remaining missing data required this app’s own experiment. Source access date: 7 September 2026. Source dates: Roblox 16 December 2025; Nintendo and Forest undated live product pages; Finch July 2025 help articles; Duolingo experiment November 2020; Duolingo protection November 2021; Axios 29 January 2024; Li, Hew and Du 16 January 2024.
