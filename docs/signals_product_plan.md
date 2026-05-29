# Signals — Product Strategy, UX Architecture & AI System Plan

> Planning document only. No implementation code. Status: **proposal for review.**
> Author lens: product strategist · second-brain systems architect · news-personalization designer · premium UI/UX.
> Grounded in the actual MyLifeOS codebase (Next.js App Router, Supabase + RLS, Google Gemini, Liquid Glass UI).

---

## Reading guide

This document is opinionated and deliberately critical. Where the original brief proposes something that is **vague, too expensive, technically unrealistic, or likely to produce fake personalization**, I say so in a **⚠️ Critical** callout and propose a better version. The 24 requested deliverables are all covered and numbered to match the brief.

The single most important strategic fact, stated up front:

> **MyLifeOS has no news/external-content data source today.** Weather (OpenWeather/Open-Meteo), YouTube ingestion, and Gemini are wired; *news is not*. Signals is therefore mostly a **data-acquisition + ranking + grounding** problem, not a UI problem. The UI is the easy 30%. Sections 14–16 and 23 are where the project succeeds or fails.

### Locked decisions (from review)
1. **Free sources only — zero added budget.** No paid or freemium-trap news APIs. Backbone = RSS/Atom + Google News RSS + GDELT + Hacker News, all $0. Incremental Gemini cost kept near-zero — AI summarizes only the few hero items; everything else uses the source's own snippet. (§14–16)
2. **No fixed local region.** Local Signals are **GPS-driven** — detect the user's *current* location (reusing the Weather location stack), with a manual city override so the user can view *any* city. Never hardcode a target region. (§6, §15)
3. **Multi-tenant-safe architecture** — shared candidate pool + per-user RLS layer. Costs single-user nothing; scales if the OS ever multi-tenants. (§10, §14)
4. **Once-daily generation + manual refresh.** No real-time streaming/push in v1; the sole exception is free official safety/weather alerts (genuinely urgent, infra already exists). True real-time deferred to v3. (§14, §24)

---

## 1. Product Vision

**Signals is the awareness layer of the OS** — the page that tells you what changed in the world *that is worth your finite attention today*, and connects it back to the life you are already building inside MyLifeOS.

Every other page in the OS is **inward-facing** (your tasks, your notes, your Brain, your goals). Signals is the **one outward-facing sensor** — but filtered through everything the OS already knows about you, so the outside world arrives pre-sorted by relevance to *your* projects, goals, learning, and location.

The north-star feeling: *"The OS read the day for me and surfaced the three things I actually needed to know — and showed me exactly how they touch my life."*

Vision in one line: **Not more news. Better signal — and signal that knows who you are.**

---

## 2. Why the Page Is Called "Signals" (not News Feed)

This naming is **correct** and should be kept. Justification:

| "News Feed" implies | "Signals" implies |
|---|---|
| Endless, chronological, more = better | Few, curated, *less* = better |
| Engagement / time-on-page is the goal | Decision / awareness is the goal |
| Generic, same for everyone | Filtered to *your* situation |
| Passive consumption | Active relevance + action |
| Doom-scroll, anxiety | Calm, finished, "you're caught up" |

"Signal vs. noise" is the entire product thesis. The name is the promise: we extract the signal and discard the noise. It also fits the OS metaphor — a Life OS that **senses** the environment and routes meaningful inputs to the right internal system (Brain, Tasks, Projects). Keep "Signals." Subtitle/positioning copy: *"What's worth your attention today."*

---

## 3. Core User Problems

1. **Information overload & anxiety.** The user (a builder running an AI product, a music festival, and personal learning tracks) cannot read everything and feels guilt/FOMO trying.
2. **Relevance is manual.** Generic feeds force the user to be the filter. They want the OS to know "I'm building an AI second-brain app + planning D Festival + studying X" and pre-filter accordingly.
3. **No connection between consumption and action.** Reading an article and *doing something with it* (saving a note, creating a task, linking it to a project) are disconnected across apps today.
4. **Forgetting what mattered.** Important stories develop over time; the user re-reads the same thing or loses the thread.
5. **Trust erosion.** AI summaries elsewhere hallucinate; the user explicitly does not trust auto-generated news. They need verifiable, source-grounded signal.

Signals must solve #1–#4 *without* violating #5.

---

## 4. Core Philosophy (refined)

The brief's philosophy is right. I'll sharpen it into **five operating principles** that every design and engineering decision is tested against:

1. **Source-grounded, never generated.** Every card traces to a real, fetched URL with a timestamp. AI summarizes/ranks/explains — it never invents headlines, facts, quotes, or numbers. (See §15–16.)
2. **Subtraction over addition.** The product's job is to *remove* items. Hard caps on counts. A visible "you're caught up" end-state. No infinite scroll, ever.
3. **Honest personalization.** Every "why this?" must be *literally true*. If we showed something because it matches a topic you picked, we say that — we do not fabricate a connection to a project that doesn't exist. (See §11 & §23.)
4. **Calm by default.** No red badges, no fake urgency, no negativity pile-on. Awareness, not alarm.
5. **Degrade gracefully.** Like Weather's `insight.ts` (deterministic, "usable even with the API key missing"), Signals must produce *useful output with zero AI calls* — AI is an upgrade layer, not a dependency. This is already the house engineering style; Signals must honor it.

---

## 5. Page Placement Recommendation

**Recommendation: keep it in Command Center, positioned immediately after Weather and before Analytics.**

The brief's proposed grouping matches reality. The *actual* current nav (`src/lib/constants/navigation.ts`) is:

```
Command Center
  Dashboard · Brain · Daily Planner · Tasks · Weekly Review · Calendar · Weather · Analytics · Finance
```

Insert as:

```
Command Center
  Dashboard · Brain · … · Calendar · Weather · ▶ Signals ◀ · Analytics · Finance
```

**Why here:**
- Command Center = "things you check to orient your day." Signals is exactly that — a daily orientation surface, like Weather.
- Weather and Signals are conceptually twins (both = "external world → decisions for today"), and Weather is the proven architectural template (§9, §19). Adjacency reinforces the mental model.
- It sits one hop from **Brain** (the integration partner) and **Dashboard** (where the widget lives).

**Icon:** `Radar` or `Rss`/`Antenna` (Lucide). I'd use **`Radar`** — it reads as "scanning the environment," distinct from the `Brain` and `CloudSun` icons already in the group, and avoids the "RSS = old feed reader" connotation.

**⚠️ Critical — the one thing to reconsider:** Command Center is getting crowded (9→10 items). If it grows further, consider a sub-group **"Horizon"** (or "Awareness") containing **Weather + Signals** — the two outward sensors. I would *not* do this yet (premature nesting hurts discoverability for a brand-new feature), but flag it as the natural future split. Do **not** call the group "News."

---

## 6. First-Time Onboarding Flow

**⚠️ Critical — the brief's onboarding is too long.** Five multi-select questions (purpose, topics, data consent, volume, tone) before any value is a 5-screen quiz. New-feature onboarding should deliver a real result in **under 60 seconds**. Cutting questions also avoids *fake precision* — asking "what tone: deep analysis vs. executive summary?" on day 1, before the user has seen a single card, produces noise, not preference.

### Refined flow — 3 required steps + deferred tuning

**Step 0 — One-screen promise (no input).** "Signals finds the few things worth your attention each day — from the world, your city, and your own projects. Never random, always from real sources." → *Continue*.

**Step 1 — Purpose (pick up to 3).** Drives section emphasis + initial topic seeding. Options from the brief are good; cap at 3 so it's a *priority* signal, not a checkbox dump:
`Understand the world · Track AI & technology · Career awareness · Finance & markets · Arts & culture · Law & policy · Education · Personal projects · Discover new ideas · Avoid overload`

**Step 2 — Topics (pick 3–8, with smart defaults).** Pre-select topics inferred from Step 1 *and* from existing Life OS data (see below) so the list arrives half-filled — this demonstrates the OS "already knows you" from second one.
`AI · Technology · Business · Startups · Finance · World affairs · Law · Education · Music · Arts · Design · Culture · Science · Climate · Health · Travel · Local (Hong Kong)`

**Step 3 — Data consent (explicit, granular, the trust moment).** This is the only screen that must stay detailed, because it's the privacy contract. Default **everything OFF except topics**; let the user opt in:
- ☐ Use my **Brain** topics & notes to personalize
- ☐ Use my **active Projects & Goals**
- ☐ Use my **Calendar** (upcoming events → timely signals)
- ☐ Use my **Tasks**
- ☐ Use my **Location** for local signals *(GPS detects your current city; override to any city anytime — see §15)*
- ☐ Learn from my **reading behavior** in Signals
- Always available: **"Use no personal data — topic-only mode."**

**Then immediately show a real Top 3** built from topics + global importance (personalization ramps later). First-run must end in *value*, not a settings screen.

**Deferred (not in onboarding):** Volume (Top-3-only / Light / Balanced / Deep) and Tone (Calm / Executive / Analytical / Local-first / etc.) move into **Settings**, surfaced via a one-time non-blocking nudge after a few days ("Want shorter or deeper signals? Tune it here"). Defaulting to **"Light briefing" + "Calm and minimal"** is the safe start.

**Smart pre-seeding (the magic moment):** Before Step 2, run a *local, deterministic* scan of existing data — Brain node labels, active project names, goal titles, note tags, `japanese-study` (→ Education/Japan), `career` data (→ Career/AI), `finance` interests — and pre-check matching topics. No AI call needed for v1; it's keyword/tag matching. This makes onboarding feel personal instantly and truthfully.

---

## 7. Full Page Structure

Top-to-bottom, with **hard count caps** (the anti-feed guardrail). All sections respect the user's volume setting; the caps below are the "Light briefing" default.

| # | Section | Cap | Purpose | MVP? |
|---|---|---|---|---|
| 0 | **Header + "caught up" state** | — | Greeting, date, last-updated time, daily "done" affordance | ✅ |
| 1 | **Daily Top 3** (hero) | 3 | The product's reason to exist | ✅ |
| 2 | **World Signals** | 5 | High-signal global stories | ✅ |
| 3 | **Local Signals** | 3–5 | City-level (HK) + official alerts | ✅ |
| 4 | **Personal Signals** | 5 | Tied to your projects/goals/brain | ✅ |
| 5 | **Brain-Linked Signals** | 3 | How signals connect to your Brain | ⏳ v2 (basic save-to-brain in v1) |
| 6 | **Follow-Up Tracker** | — | Developing stories you're tracking | ⏳ v2 |
| 7 | **Signal Memory** (control surface) | — | Inspect/reset what the system learned | ⏳ v2 |

**End-of-page state:** *"That's your signal for today. You're caught up."* — a deliberate terminal screen. No "load more." This is a feature, not a limitation.

Sections 1–4 are the MVP page. 5–7 are layered in v2 once data and behavior exist to power them (you cannot show "what the system learned" on day 1 — there's nothing learned yet; faking it would violate principle #3).

---

## 8. Daily Top 3 Signals — Design

The hero. **Exactly three**, regenerated once per day (see §14 for the generation pipeline and cost control).

### Card anatomy (expanded state)
```
┌─────────────────────────────────────────────┐
│ [Topic chip] [Breaking|Developing|Analysis]  │  ← labels, never alarming colors
│                                               │
│ Headline (real, from source)                  │
│ Source · Publication time · "checked 7m ago"  │
│                                               │
│ ▍AI summary (2–3 sentences, source-grounded)  │
│                                               │
│ Why it matters   → 1 line, general importance │
│ Why it's for you → 1 line, TRUE personal tie  │
│ Suggested action → e.g. "Save to Brain › AI…" │
│                                               │
│ [Save] [Dismiss] [More like this] [Less] [↗]  │
│ Why this signal? (expandable transparency)    │
└─────────────────────────────────────────────┘
```

### Behavior
- **Collapsed by default** (headline + source + one relevance line + topic chip); smooth expand on tap (Framer Motion, matching the app's `data-stagger` / card-expand idiom).
- **One action is primary** per card (usually "Save to Brain" or "Create task"), styled as the accent CTA; the rest are quiet.
- **"Why this signal?"** is always present and *literally true* (§11). If it's topic-only, it says so.

### ⚠️ Critical — the cold-start honesty problem
On day 1, with an empty Brain and zero reading history, **true personal relevance is mostly unavailable.** The brief's example ("shown because you saved three notes about AI product strategy this week") is impossible for a new user. **Do not fake it.** Day-1 Top 3 = `global importance + onboarding topic match + a blind-spot pick`, and the "why" reads honestly: *"Matches a topic you chose (AI)."* Personalization deepens as Brain/behavior accumulate. Designing for honest cold-start is what separates this from every fake-personalized news app.

---

## 9. Dashboard "Today's Signals" Widget — Design

**Mirror the existing `DashboardWeatherWidget` exactly** (`src/components/calendar/dashboard-weather-widget.tsx`). It's the proven pattern and gives instant visual consistency. That widget's own docstring — *"A decision hint, not a weather app"* — is the template; Signals' is **"a decision surface, not a feed."**

- **Shared data hook** (`useTodaysSignals`) reading the *same* cached Daily Top 3 as the full page (Weather does this with `useWeatherSummary`) — no second computation, no drift.
- **States:** loading (skeletons) → error (retry + "Open Signals") → content. Copy through a `getSignalsWidgetCopy(language)` module (bilingual EN/zh-TW, matching `getWeatherWidgetCopy`).
- **Content:** the 3 cards, ultra-compact — headline (1–2 lines), topic chip, source · time, **one** relevance line. No summary, no actions in the widget (those live on the page).
- **Interaction:** tap a card → navigate to `/signals` and **deep-link/highlight** that card (`/signals?focus=<signalId>` → scroll-to + brief ring highlight). Tap header → `/signals`.
- **Placement on Dashboard:** near `TodayBlock` (which already hosts the weather widget), as a sibling "Today's Signals" block. Calm, three rows, finished.
- **Guardrail:** the widget shows **only** the Top 3 — never a longer feed. This is enforced by the data contract (the hook returns at most 3).

---

## 10. News Card / Signal Card Structure (data + display contract)

A single `Signal` shape powers every section; sections differ only by which fields they emphasize and how they were selected.

**Display fields (all sections):** headline · source name + favicon · publication time (relative + absolute on hover) · topic chip(s) · region · content-type label (`breaking | developing | analysis | opinion`) · canonical link (↗) · "last checked" time.

**Conditional fields:** AI summary (2–3 sentences) · "why it matters" · "why it's for you" + relevance basis · suggested action · multi-source confirmation badge ("3 sources reporting") · Brain-connection strip (v2).

**Conceptual data model** (architecture, not code — Supabase tables, all RLS-scoped to `auth.uid()` except the shared candidate pool):

```
signal_sources         shared, read-only-ish: provider, name, domain, region,
                        feed_url, quality_tier, language, enabled
signal_items           shared candidate pool (deduped): source_id, url(canonical),
                        title, snippet, published_at, fetched_at, topics[],
                        region, content_type, dedupe_hash, raw_excerpt
signal_summaries       shared per-item AI summary cache: item_id, summary,
                        why_it_matters, model, generated_at   ← cached, reused
user_signal_prefs      per-user: followed_topics[], hidden_topics[],
                        preferred_sources[], muted_sources[], volume, tone,
                        local_location, data_consent{brain,projects,calendar,
                        tasks,location,behavior}, language
user_daily_signals     per-user per-day: date, section, item_id, rank, score,
                        why_personal, relevance_basis(enum), shown_at
user_signal_actions    per-user: item_id, action(save|dismiss|more|less|
                        not_relevant|too_political|too_negative|too_shallow|
                        already_known|mute_source|follow_topic|open|to_brain|
                        to_task), created_at   ← powers Signal Memory
signal_followups       per-user: topic_or_story_key, first_seen, last_update,
                        update_count, linked_item_ids[]
```

The **shared candidate pool + shared summary cache** is the key cost-control decision (§14, §23): fetch and summarize an article **once**, personalize per-user **cheaply**.

---

## 11. Personalization Logic (transparent + honest)

**Inputs**, in priority order, each gated by an explicit consent toggle (§6, §17):
1. Onboarding topics & purpose (explicit, always on)
2. In-Signals actions (save/dismiss/more/less, topic follows/mutes) → Signal Memory
3. Brain topics & node embeddings *(consent)*
4. Active Projects & Goals titles/tags *(consent)*
5. Calendar context — upcoming events as timely relevance *(consent)*
6. Tasks *(consent)*
7. Knowledge Base / Notes content *(consent)*
8. Location → local section *(consent)*
9. Reading behavior over time *(consent)*

### How it actually works (and stays cheap + honest)
- **Personal fit = embedding similarity, not LLM judgment.** Reuse the existing Gemini `text-embedding-004` infra (`src/lib/brain/embeddings.ts`, `brain_node_embeddings`). Build a per-user "interest vector" set from Brain nodes + project/goal titles + followed topics. Score each candidate by cosine similarity to those vectors. This is deterministic, reproducible, cheap, and — crucially — lets the "why" be *literally derived* ("closest to your Brain node: *AI Product Strategy*").
- **The LLM does NOT rank.** Asking Gemini "rank these 200 for this user" is expensive, non-reproducible, and a hallucination vector. The LLM only (a) summarizes the *already-selected* items from fetched text, and (b) writes the relevance explanation *from the computed basis* — it's told the basis, it phrases it; it doesn't invent it.

### "Why this signal?" — the honesty contract
Every personalized card carries a machine-derived `relevance_basis`, and the displayed reason must match it exactly:
| basis | example copy |
|---|---|
| `topic_match` | "Matches a topic you follow: AI" |
| `brain_similarity` | "Connects to your Brain node *AI Product Strategy*" |
| `project_match` | "Relevant to your project *D Festival*" |
| `calendar_proximity` | "You have *Law school deadline* in 6 days" |
| `behavior` | "You saved 3 signals about EdTech this week" |
| `global_importance` | "Major global story today" |
| `blind_spot` | "Outside your usual topics — a deliberate broadening" |

**⚠️ Critical — fake personalization is the cardinal sin here.** If the only reason is "it's a popular AI story," the card must say `topic_match`, not pretend a project connection. The "creepy vs. helpful" line is crossed not by *using* data but by *overclaiming* what the data says. The transparency table above is the safeguard; it should be enforced in code (the reason string is generated *from* the basis enum, never free-written by the LLM).

---

## 12. Ranking Model

### The brief's proposed model
```ts
type SignalScore = {
  globalImportance, localRelevance, personalRelevance, urgency,
  actionability, longTermValue, novelty, sourceQuality,
  diversityBoost, noisePenalty, totalScore: number
}
```

**⚠️ Critical — 10 weighted floats is over-engineered and creates fake precision.** With no training data and no labels, you cannot justify 10 weights; you'd be inventing numbers that *look* rigorous but are guesses, and several dimensions aren't independently measurable from a headline (e.g., `actionability`, `longTermValue`, `urgency` overlap heavily and would mostly be LLM guesses → cost + hallucination + non-reproducibility). Keep the 10-dim *vocabulary* as a north star, but ship a leaner model.

### Recommended MVP model — 5 computable dimensions + 2 modifiers
Each computed **deterministically or via embeddings**, not by asking an LLM for a number:

| Dimension | How it's computed (no LLM scoring) | Range |
|---|---|---|
| **Importance** | Source-tier weight × multi-source corroboration count × recency decay. (Many quality sources reporting = important.) | 0–1 |
| **Personal fit** | Max cosine similarity between candidate embedding and user interest vectors (Brain/projects/topics). | 0–1 |
| **Freshness** | Time-decay from `published_at` (and boost if it's a *new development* of a tracked story). | 0–1 |
| **Source quality** | Static per-source tier (curated allowlist; see §15) + user preference/mute adjustments. | 0–1 |
| **Locality** | Match to user's city/region when location consent is on (else 0, no penalty). | 0–1 |

**Modifiers (applied after the weighted sum):**
- **Noise/negativity penalty** — down-rank clickbait patterns, pure-opinion, and *excess* negativity (cap how many heavy/negative items can appear; protects principle #4). Heuristic + small classifier, *not* censorship — the item still exists, it just doesn't crowd the day.
- **Diversity / blind-spot** — enforce topic spread in the Top 3 (no 3-of-a-kind) and reserve ~1 slot every few days for a high-quality item *outside* the user's topics (basis = `blind_spot`). This is the explicit anti-filter-bubble mechanism.

`total = w1·Importance + w2·PersonalFit + w3·Freshness + w4·SourceQuality + w5·Locality`, then apply modifiers, then **MMR-style diversity selection** for the final 3/5.

**Default weights are a starting heuristic, exposed to tuning, and honestly labeled as heuristics — not presented as a trained model.** Volume/tone settings shift weights (e.g., "Local-first" raises `Locality`; "Career-focused" raises career-topic fit).

### What each *original* dimension maps to (so nothing is lost)
- `globalImportance` → **Importance**; `localRelevance` → **Locality**; `personalRelevance` → **Personal fit**; `sourceQuality` → **Source quality**; `novelty` → **Freshness** + dedupe; `diversityBoost`/`noisePenalty` → **Modifiers**.
- `urgency`, `actionability`, `longTermValue` → **deferred to v2/v3.** These need either LLM judgment (cost/hallucination risk) or behavioral signal we won't have at launch. Adding them in MVP would be fabricated precision.

**The model must avoid (per brief, all addressed):** pure popularity (we use source-tier + corroboration, not raw clicks) · clickbait (noise penalty) · filter bubbles (blind-spot slot) · same topic daily (diversity selection) · negativity overload (negativity cap) · opinion-as-fact (content-type label + opinion down-rank).

---

## 13. Brain Page Integration

This is the **genuinely defensible, novel** part of Signals — and MyLifeOS is unusually well-positioned because the Brain already has an embeddings + relationship engine (`src/lib/brain/relationship-engine/*`, `brain_node_embeddings`, typed edges, 3D sphere).

### Signals → Brain (write path) — *basic version is MVP*
- **MVP: "Save to Brain"** creates a Brain node from the signal (title, AI summary, source URL, topics), then rides the *existing* pipeline: embed via `text-embedding-004` → store in `brain_node_embeddings` → the relationship engine auto-generates edges (taxonomy/entity/time/explicit) to existing nodes. No new graph code needed — Signals just produces a well-formed node and lets Brain do what it already does.
- **Also MVP-light:** "Create task from signal" (→ Tasks), "Add to project" (→ Projects). These are simple inserts into existing entities.
- **v2:** generate summary note, "link to existing node" (uses embedding search to suggest targets), follow-up/reflection prompts.

### Brain → Signals (read path / personalization) — *v2*
Brain content becomes a personalization input (§11): active/recently-opened nodes, dense knowledge clusters, user tags, project-linked nodes, unfinished research threads → all feed the user interest vectors. Example (real to this user): a dense cluster around *AI music education* should raise EdTech / music-tech / learning-science / education-policy candidates.

### Signal Connections strip — *v2/v3, do not promise in MVP*
The "connected Brain nodes" strip per card requires the embedding-match read path to exist and be fast. **⚠️ Critical:** showing a connections graph on every card in MVP is a performance + cost trap (an embedding search per card per render). v1 should ship the *write* direction (save → node → auto-edges, which is high-value and cheap). The *read* direction (live "this connects to your 4 nodes" strip) is v2 once we cache per-signal matches.

---

## 14. Life OS Data Integration (+ the daily generation pipeline)

### Data sources (all already in the app, via existing hooks)
`useTasks` · `useProjects` · `useNotes` · goals · Brain nodes/embeddings · Calendar/Google Calendar · `finance` · `ideas` (Idea Capture) · `japanese-study` · `career` · Knowledge Base. Each is read **only with the matching consent toggle on.**

Concrete, *honest* relevance mappings (no fabrication):
- **Calendar** → "You have *D Festival* in 5 days" raises event-adjacent signals (timely, high-value, and verifiably true).
- **Projects/Goals** → title/tag → topic + embedding match.
- **Idea Capture / Brain** → recurring themes → interest vectors.
- **Japanese Study / Career / Finance** → seed topics (Japan/education, AI/career, markets) the user verifiably engages with.

### ⚠️ Critical — the generation architecture (this is the cost & feasibility crux)
**Do NOT run a per-user LLM ranking job over a fresh fetch each time the page opens.** That's slow, expensive, non-reproducible, and rate-limit-fragile. Instead, a **two-tier daily pipeline** (this is the single most important engineering recommendation in the document):

**Tier A — shared, once per day (Vercel cron; crons already exist in `vercel.json`):**
1. Fetch from all enabled providers (RSS + news APIs, §15) → normalize (reuse the `NormalizedIngest` provider pattern from `lib/knowledge/providers/`) → dedupe by URL/title hash → write to shared `signal_items`.
2. For items that clear an importance floor, generate **one** AI summary + "why it matters" → cache in `signal_summaries` (reused across all users; cheap because deduped + capped).
3. Compute embeddings for candidates (batch).

**Tier B — per-user, cheap, on first open each day (or end of cron):**
4. Score candidates against that user's interest vectors + prefs (deterministic + cosine; no LLM) → select World/Local/Personal + Top 3 with diversity → write `user_daily_signals`.
5. Page & widget read `user_daily_signals` (fast, cached). Re-open during the day = instant, identical (reproducible).

This makes cost ≈ *O(articles)* for summaries (shared) + near-zero per user, instead of *O(users × articles)* of LLM calls. It also satisfies "regenerated once per day" and graceful degradation: if AI is down, Tier B still ranks deterministically and shows source headlines + the rule-based summary fallback (mirroring `insight.ts`).

---

## 15. Source & Accuracy Rules

**Non-negotiable:** every card = a real fetched item with `source`, `published_at`, canonical `url`, `last_checked`. No card without a source row. (Enforced at the data layer — a `Signal` cannot exist without a `signal_items` row.)

### ⚠️ Critical — there is no news source today; it must be built from 100% free sources
The app has Gemini + Weather + YouTube but **no news data**. Per the budget decision, the entire source layer is **free, no paid tiers**. The good news: free, location-flexible sources are strong enough for this product.

| Layer | Free source (cost = $0) | Why / caveats |
|---|---|---|
| **Backbone** | **RSS/Atom** from quality outlets; **Google News RSS** (`?hl=&gl=&ceid=` for language+country, or a city/topic search query) | RSS is free, keyless, legally safe (headline + snippet + link). Google News RSS is the key unlock: it serves a feed for **any city/topic/country** — this is what makes GPS-driven local work at $0. |
| **World** | **GDELT 2.0 DOC API** (free, no key, geo-tagged, global) + Google News RSS top stories | GDELT = global coverage + geo filtering, no key. Optional free-with-key upgrades only if ever wanted: **Guardian Open Platform**, **NYT API** (both $0). |
| **Tech / AI** | **Hacker News (Algolia) API** (free, no key), ArXiv, GitHub Trending, official blog RSS | Ideal for an AI builder; free, high quality. |
| **Local (dynamic, GPS-driven)** | Google News RSS scoped to the detected city/region + GDELT geo filter, layered with a **region registry** of curated official feeds where they exist | See dynamic-local design below. |
| **Official alerts (the breaking exception)** | Weather warnings (already wired: OpenWeather/Open-Meteo) + government alert feeds where free | Genuinely urgent + free → allowed to refresh more often than the daily cycle. |

**Dropped** (would add cost or break ToS): NewsAPI.org (free tier is dev-only), GNews / NewsData.io / Mediastack (freemium traps that meter quickly). Not worth the budget risk when Google News RSS + GDELT cover the same ground free.

### Dynamic local — how GPS-driven "any city" works at $0 (reuse the Weather stack)
The app **already** solves location, for free, in `src/lib/weather/openweather.ts`: `navigator.geolocation.getCurrentPosition` (permission-checked) → **IP fallback via ip-api.com (no key)** → **reverse-geocode** lat/lon to a place name (Open-Meteo / OpenWeather geocoding, free). Signals reuses this verbatim:

1. **Detect** current location (GPS → IP fallback → null). Never *require* GPS — if denied, fall back to IP-level city, then to manual entry.
2. **Reverse-geocode** to `city, region, country, lang`.
3. **Fetch local** = Google News RSS scoped to that city/region (+ GDELT geo filter), in the region's language (EN / zh-TW supported).
4. **Layer official feeds** from a small **region registry** (`region → [feeds]`) where curated free feeds exist (e.g., a Hong Kong entry → HKO warnings / GovHK / RTHK / transport; other regions added over time). When no registry entry exists, local still works via Google News RSS — just without the curated official layer.
5. **Manual override:** a city search (reuse the existing `WeatherLocationSearch` pattern) lets the user pin **any** city and view its local signals.

**⚠️ Honest limits (state these in the UI, don't fake precision):**
- **Granularity is city/region, not district.** GPS gives coordinates, but free *local-news* sources resolve at city/metro level at best. Show "Local — <City>", never a fabricated "District: X".
- **Local depth varies by region & language.** Google News RSS covers virtually any city, but the *quality/volume* of genuine local reporting differs widely; curated official feeds only exist where registered. The "why this" stays honest ("Local to your current location: <City>").
- **Copyright / ToS.** Store headline + snippet + link only; AI-summarize from the publisher's own snippet/description or transiently-fetched text; attribute prominently; always drive clicks to the source.

### Accuracy rules
- **Multi-source corroboration:** when ≥N sources report the same story (clustered by similarity), show "*N sources reporting*" — this *is* the importance signal and the trust signal.
- **Conflict:** when sources disagree, say so explicitly — *"Sources differ on the likely impact. Here are the main interpretations,"* with links to each. Never resolve a genuine disagreement into false certainty.
- **Content-type label** on every card: `breaking | developing | analysis | opinion`. Opinion is labeled and down-ranked relative to reporting; never presented as fact.
- **No certainty inflation:** summaries use hedged language matching the source; if the snippet is thin, the card says "Summary limited — open source for detail" rather than embellishing.

---

## 16. AI Behavior Rules

These are hard rules for every Gemini call in Signals (consistent with `gemini-errors.ts` / fallback-model patterns already in the repo):

1. **Summarize only provided source text.** The prompt receives the fetched snippet/text; instruction: *"Summarize only what is in the text below. Do not add facts, numbers, names, or quotes not present. If the text is insufficient, say 'Summary limited.'"* Never summarize from a headline alone.
2. **Never generate headlines, dates, sources, stats, or quotes.** Those come from the fetched item, never the model.
3. **Explanations are phrased, not invented.** The "why it's for you" is generated *from* the computed `relevance_basis` (§11); the model rewrites a known true fact into a sentence — it does not decide *why* something is relevant.
4. **No scoring by LLM** (ranking is deterministic/embeddings — §12).
5. **Graceful degradation, always.** If Gemini is unavailable/over quota, fall back to: source's own snippet as the "summary," rule-based "why it matters," deterministic ranking. The page must work with zero AI — the `insight.ts` doctrine.
6. **Model + fallback chain** via existing `GEMINI_TEXT_MODEL` / `GEMINI_TEXT_FALLBACK_MODELS`; summaries cached (`signal_summaries`) so each article is summarized once.
7. **Cost ceiling (free-budget rule):** AI summarizes **only the hero items** — the Daily Top 3 (and optionally the single top World item) — generated once per day and cached/shared. Every other section uses the **source's own snippet** verbatim (deterministic, $0); a fuller AI summary is generated lazily only if the user expands that card. This keeps incremental Gemini cost effectively zero, honoring the free-only decision.

---

## 17. Personalization Controls

A dedicated **Signals → Settings** surface (and quick controls on cards). All writes are per-user, RLS-scoped.

**Settings panel:**
- Followed topics · Hidden topics
- Preferred sources · Muted sources
- Local location (city-level) · Language (EN/zh-TW)
- **Feed intensity:** Top-3-only · Light · Balanced · Deep
- **Reading depth / tone:** Calm · Executive · Analytical · Local-first · Global-first · Career-focused · Learning-focused
- **Life OS data usage** — the same granular toggles as onboarding (Brain / Projects / Calendar / Tasks / Location / Behavior), changeable anytime
- **Reset personalization** · **Clear reading history** (both must actually wipe `user_signal_actions` / interest vectors — §18)

**Per-card quick feedback** (each writes a `user_signal_actions` row → Signal Memory):
`More like this · Less like this · Not relevant · Too political · Too negative · Too shallow · Already know this · Mute this source · Follow this topic · Save this topic`

**⚠️ Note:** every one of these controls must have a *visible effect the user can perceive* within a day or two, or it's theater. Map each to a concrete weight/filter change (e.g., "Too negative" → raises the negativity penalty for that user; "Mute source" → hard filter). If a control can't yet change anything, don't ship it yet.

---

## 18. Privacy & Trust Considerations

Grounded in the existing constraints (Supabase RLS per `auth.uid()`, AES-256-GCM token crypto, Vercel serverless — see `memory/project_kb_constraints.md`):

- **Consent-gated by default.** Every Life OS data source is OFF until the user opts in (§6). Topic-only mode is always available and fully functional.
- **All user signal data is RLS-scoped** to the user; the only shared tables are the source-grounded candidate pool + summary cache (no personal data in them).
- **Inspectable & resettable.** Signal Memory (§7 / v2) is a *control surface*, not a hidden profile — the user can see what topics/sources are up/down-weighted and reset/clear history for real.
- **Location honesty & control.** GPS is **optional** (IP fallback, then manual entry) and never required. Detection resolves to city/region only — never a fabricated district. The user can override to any city, or turn location off entirely (topic-only local, or no Local section) (§15).
- **No third-party ad/tracking, no behavioral data leaving the OS.** Personalization is computed inside the user's own OS.
- **Trust UI:** prominent source attribution, "last checked" time, multi-source badges, conflict disclosure, content-type labels — trust is a *visible* property of every card.
- **The anti-creepiness rule:** we may *use* data, but we never *overclaim* it (§11). Truth in the "why" is the entire trust model.

---

## 19. UI / UX Direction (Liquid Glass)

**⚠️ Useful clarification:** `liquid_glass_ui.md` is a *CryptoNest* spec — a dark-photo, lime-accent crypto dashboard. The MyLifeOS app implements a **softer, theme-aware** descendant of it: `bg-card/70` glass with subtle borders, tint panels (`GlassTintPanel`), `data-stagger` Framer Motion entrances, Lucide icons, light/dark support. **Signals should match the app's *implemented* glass (theme-aware, accessible), drawing the *language* (translucency, calm, premium, stagger-in) from the spec — not the literal dark-photo/lime crypto styling.** Reuse `GlassStatCard`, `GlassEntityCard`, `GlassTintPanel`.

Signals should feel: **premium · calm · intelligent · editorial · high-signal · trustworthy · finished — not addictive, not chaotic.**

- **Surfaces:** translucent glass cards over the app's existing background; generous whitespace; editorial typography (Inter, tabular-nums for times/counts).
- **Daily Top 3 hero:** the visual centerpiece — larger glass cards, clear hierarchy (headline → grounded summary → why/action), staggered fade-in (the spec's signature load animation, already idiomatic via `data-stagger`).
- **Topic chips & labels:** quiet pills (like the weather widget's `MetricPill`), never shouting.
- **Source labels:** always visible, with favicon + "checked Xm ago."
- **Relevance line:** subtle, secondary text — present but calm.
- **Card expansion:** smooth height/opacity transition; no jarring modals for reading.
- **Brain-connection indicators (v2):** subtle, not a loud graph — small node-link hint that expands on demand.
- **Responsive:** desktop = bento/multi-column for World/Local/Personal; tablet = 2-col; mobile = single column, Top 3 first. (The app already uses `sm:`/`xl:` breakpoints and `data-stagger`.)

**Avoid (per brief):** doom-scroll/infinite feed · clickbait cards · fake urgency · red-alert overload · social engagement bait. **Calm-tech accessibility:** honor `prefers-reduced-motion`; ensure contrast on glass (the spec flags white-on-glass dips below WCAG AA — use the app's theme-aware foreground tokens, not pure white on translucency).

---

## 20. MVP Scope (v1)

**Goal: ship the honest, source-grounded core — and prove the daily pipeline + Brain write-path.**

Must-have:
- Signals page with **Daily Top 3 · World · Local · Personal** (caps enforced; "caught up" end-state)
- **Dashboard "Today's Signals" widget** (mirrors Weather widget, shared hook, deep-link)
- **3-step onboarding** (purpose · topics-with-pre-seed · consent) → ends in a real Top 3
- **Two-tier daily pipeline** (cron fetch + shared summary cache → cheap per-user selection)
- **Source-grounded summaries** with the §16 AI rules + deterministic fallback (works with AI off)
- **Deterministic 5-dim ranking** + diversity/negativity modifiers (§12)
- Card actions: **Save · Dismiss · More like this · Less like this**, plus **"Why this signal?"** (truthful)
- **Basic Save-to-Brain** (creates a node → existing embedding + relationship-engine pipeline)
- Topic preferences + mute source; **topic-only mode** works fully
- **Real sources only.** If a provider isn't wired, show **clearly-labeled demo/sample data** ("Sample signal — connect a source") — never unlabeled fabricated news.

**Explicitly out of MVP** (to avoid faking): Signal Memory dashboard, Follow-Up Tracker, Brain→Signals read-path & connections strip, multi-dim urgency/actionability scoring, calendar/finance personalization. These need accumulated data or expensive infra; shipping them empty would violate principle #3.

---

## 21. Version 2 Roadmap

- **Brain node linking (read path):** "connects to your Brain node X" via cached embedding matches; connections strip on cards.
- **Follow-Up Tracker:** cluster developing stories (`signal_followups`); "this AI-regulation story developed 4× this month"; "you saved this last week — here's what changed."
- **Signal Memory** as a visible, resettable control surface.
- **Project / Calendar relevance** (timely event-adjacent signals; project-tag matching).
- **Weekly Signal Reflection:** a calm digest ("what you tracked, saved, ignored this week") — fits the existing Weekly Review rhythm.
- **Opposing viewpoints / source-quality layer:** per-story "here are differing interpretations"; explicit source-tier surfacing.
- **Time-budget modes** fully wired (intensity/tone change weights + counts).

## 22. Version 3 Roadmap

- **Full Brain graph integration:** signals as first-class graph citizens in the 3D sphere; knowledge-evolution timeline.
- **AI trend detection:** longitudinal pattern detection across your saved signals + Brain ("your attention is shifting toward EdTech").
- **Opportunity / risk alerts:** *carefully* — opt-in, source-grounded, never speculative ("a policy that may affect your *D Festival* timeline").
- **News-to-task automation:** suggested tasks/reminders from developing stories (human-confirmed, never auto-created silently).
- **Multi-source credibility analysis** (beyond static tiers).
- **Cross-page intelligence engine:** the OS-wide layer connecting Dashboard · Brain · Calendar · Weather · Tasks · Finance · Projects — Signals as one sensor feeding a shared relevance graph. (This is the long-term moat, but only credible after v1/v2 prove the data quality.)

---

## 23. Risks & Tradeoffs

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **No news source exists; acquisition is the whole project.** | 🔴 Critical | Resolved to **100% free**: RSS + Google News RSS + GDELT + Hacker News (no keys/budget). The remaining work is integration, not procurement (§15). |
| 2 | **Hallucinated summaries** despite "no fake news." | 🔴 Critical | Summarize only fetched text; hedge; "Summary limited"; deterministic fallback; prominent source link (§16). |
| 3 | **Fake personalization / overclaimed "why."** | 🔴 Critical | `relevance_basis` enum drives copy; LLM phrases, never invents; honest cold-start (§8, §11). |
| 4 | **Cost blow-up** (per-user LLM ranking/summarizing). | 🟠 High | Two-tier pipeline: shared dedup'd summaries cached; per-user = deterministic + embeddings (§14). |
| 5 | **Local granularity/quality varies by region.** | 🟡 Med | GPS → city/region via the reused Weather stack; Google News RSS covers any city free; curated official feeds layered via a region registry; honest city-level labeling, GPS never required (§15). |
| 6 | **Copyright/ToS** on stored/summarized content. | 🟠 High | Snippet + link + transient text; attribute; drive clicks to source (§15). |
| 7 | **Filter bubble** from personalization. | 🟡 Med | Mandatory diversity selection + periodic blind-spot slot (§12). |
| 8 | **Over-scoping** (10-dim model, Memory/Tracker/graph at launch). | 🟡 Med | Lean MVP (§20); defer data-dependent features until data exists. |
| 9 | **Overlap with existing pages** (YouTube Radar, Business Analyst). | 🟡 Med | Position Signals as the *daily awareness* layer; reuse provider/digest patterns; feed "track this topic" into Business Analyst rather than rebuilding it. |
| 10 | **Empty/cold start feels broken.** | 🟡 Med | Topic pre-seeding from existing data; topic-only mode delivers value with zero personal data; clear sample-data labeling. |
| 11 | **Negativity/anxiety** despite calm intent. | 🟡 Med | Negativity cap, calm visual language, "caught up" terminal state, no red badges (§4, §12, §19). |
| 12 | **Single-user vs. multi-tenant assumption.** | 🟡 Med | Architecture (shared pool + per-user layer) scales either way; confirm before optimizing (see open questions). |

### Key tradeoffs (chosen positions)
- **Deterministic ranking over LLM ranking** — sacrifices some nuance for reproducibility, cost control, and honesty. *Right call for v1.*
- **Daily batch over real-time** — sacrifices "breaking-news immediacy" for calm, cost, and the "once a day, then you're done" philosophy. *Right call* — Signals is not a breaking-news terminal; if real-time is ever needed, a narrow "breaking" exception can be added later.
- **RSS-first over premium APIs** — sacrifices some coverage/recency for zero cost and clean licensing. *Right call to start.*
- **Honest cold-start over impressive-but-fake personalization** — sacrifices day-1 "wow" for long-term trust. *The defining choice of the product.*

---

## 24. Final Recommendation

**Build it — the concept is strong, differentiated, and uniquely suited to MyLifeOS** because the Brain embeddings + relationship engine already exist, Weather is a proven template, and the OS holds exactly the personal context that makes "better signal" possible. The name "Signals" is right.

**But build it in the order the data allows, not the order the brief lists.** Concretely:

1. **Solve data acquisition first** (§15). Until at least RSS + HN + one quality world API are flowing with deduplication, there is no product — only UI. Spike this before anything else.
2. **Build the two-tier daily pipeline** (§14) — the architectural decision that makes the whole thing affordable and reproducible.
3. **Ship the honest MVP** (§20): Top 3 + World/Local/Personal, the Weather-twin dashboard widget, deterministic ranking with truthful "why," grounded summaries with deterministic fallback, and basic Save-to-Brain.
4. **Defer everything data-dependent** (Signal Memory, Follow-Up Tracker, Brain read-path, graph strip, multi-dim scoring) to v2/v3 — shipping them empty would betray the product's core promise of honesty.

**The features I'd push back on hardest** (and have proposed better versions for): the 10-dimension ranking model (→ 5 computable dims + modifiers), the 5-question onboarding (→ 3 steps + deferred tuning), district-level local news (→ honest city-level + official alerts), the per-card live Brain-graph strip in MVP (→ write-path first, read-path v2), and LLM-as-ranker (→ embeddings + deterministic, LLM only summarizes/explains).

**The one belief to hold onto:** the value is not in showing news — it's in the *honesty of the filter and the truth of the "why."* Every shortcut that fakes relevance or invents content destroys the only thing that makes Signals worth more than the feed it replaces.

---

### Decisions (resolved with you)
1. **Audience → multi-tenant-safe architecture.** Shared candidate pool + per-user RLS layer. Single-user pays nothing for it; it scales if the OS ever opens up. (No further input needed — chosen for you.)
2. **News budget → free sources only, no added spend.** RSS + Google News RSS + GDELT + Hacker News; incremental Gemini cost held near-zero by summarizing only hero items. All paid/freemium-trap APIs dropped (§15–16).
3. **Locale → GPS-driven, no fixed region.** Detect the user's current city (reusing the Weather location stack), let them pin any city, never hardcode a target. EN + zh-TW for summaries, with room for the detected region's language (§15).
4. **Cadence → once-daily + manual refresh.** No real-time streaming/push in v1; the lone exception is free official safety/weather alerts (urgent + already wired). Real-time deferred to v3 (§14).
