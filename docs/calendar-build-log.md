# Calendar Build — Running Log (Autonomous Session)

> Started: 2026-04-23
> Mode: Autonomous (user is away). Will run Phase 1 → Phase 5 without stopping.

## ⚠️ Prompt ambiguity resolved

The user's prompt header referred to the **Quote Library** page (triggers about Smart Tagging, Wisdom Profile, Tesseract OCR, etc.), but the detailed 5‑phase spec, file list, acceptance criteria, and "BT THE WAY" orbital rotation addendum all describe the **Calendar** feature. The codebase confirms the Quote Library was already built (`docs/quote-library-build-summary.md`, `components/quote-library/`, full i18n, nav item, hooks, store, types). Following autonomous rule #1 — make the most sensible decision a senior engineer would — I am building the **Calendar** feature as specified in the detailed plan. The Quote Library references in the header are treated as stale boilerplate from a prior session. All other autonomous rules still apply to this Calendar build.

## Core architectural decisions (made autonomously)

1. **App location** — Code lives under `app/src/` (the actual Next.js 14 workspace; root repo is a launcher).
2. **Route placement** — Sidebar item `google-calendar` (URL `/google-calendar`) is renamed to `calendar` (URL `/calendar`). The existing `/google-calendar` page is kept as a legacy Google-connect surface so we don't break in-flight OAuth; the new `/calendar` is the primary destination.
3. **Calendar items** — **Runtime projection only.** No new Supabase tables in Phase 1. `projectToCalendarItems()` reads Task / Habit / Goal rows from existing tables and projects them into `CalendarItem[]`. Persisting projections is deliberately deferred per KISS / YAGNI.
4. **AI layer** — Mock only (Phase 1‑4) in `lib/calendar/ai/`. Phase 5 documents the swap points. The top-of-prompt reference to "Claude" / "Gemini with grounding" was from the stale Quote Library header and does not apply to Calendar.
5. **i18n** — Follow the existing `createLocaleCopyMap` pattern: supply English + targeted `zh-TW` / `zh-CN` overrides; the helper cascades English to the remaining 6 locales. This is the same pattern every other UI file uses.
6. **Homepage** — "Homepage" = `/dashboard` (confirmed: root redirects into it). `TodayBlock` is inserted between the date/time header and the `QuoteInspirationCard` (the closest existing "Daily Inspiration" surface).
7. **Month variants** — Implemented as three standalone components (`MonthViewComplete`, `MonthViewMinimal`, `MonthViewOrbital`) sharing the same `CalendarItem[]` contract, selected by `useMonthViewMode()` which persists to `localStorage`.
8. **Orbital rotation** — Driven by `requestAnimationFrame` inside a `useOrbitalAnimation` hook. SVG `<g transform>` updates per bubble. Respects `prefers-reduced-motion`.
9. **Accent color ("acid yellow-green")** — Mapped to Tailwind `lime-400` (`#a3e635`) with dark-mode `lime-300`. Used only in Minimal/Orbital variants; not added as a global token.
10. **Daily Planner** — Kept as-is; receives a "Back to AI Plan" link in Phase 4. No disruptive refactor to the existing 2,000+ line file.

## Files created / modified (running list)

_Updated at end of each phase._

### Phase 1 — complete ✅

**Created**
- `app/src/lib/calendar/types.ts` — full type system, `CalendarItem` discriminated union, `MonthViewMode`, `OrbitalDay`, `DayContext`, AI output contracts.
- `app/src/lib/calendar/orbital.ts` — `computeOrbitalLayout()`, `orbitalPosition()`, deterministic seeded ellipse math.
- `app/src/lib/calendar/projection.ts` — `projectToCalendarItems()`, per-day mappers, `buildDayContext()`, `computeFreeWindows()`, `classifyDayLoad()`.
- `app/src/lib/calendar/ai/index.ts` — typed stubs `summarizeDay`, `detectConflicts`, `findFreeWindows`, `generatePlan` with mock latency.
- `app/src/lib/calendar/mock/week.ts` — full sample week of mock tasks / habit occurrences / milestones / reminders anchored on `new Date()`.
- `app/src/lib/calendar/mock/ai.ts` — mock AI outputs with realistic shape.
- `app/src/lib/calendar/sources/{tasks,habits,milestones}.ts` — DB row → CalendarSource mappers (wired in Phase 5).
- `app/src/hooks/use-calendar.ts` — `useCalendarItems`, `useDayContext`, `useItemsPerDate`, `useUpcomingItems`, `useWeekItems`.
- `app/src/hooks/use-month-view-mode.ts` — `localStorage`-persisted variant selector (SSR-safe).
- `app/src/hooks/use-orbital-animation.ts` — `requestAnimationFrame`-driven per-bubble angular progression, `prefers-reduced-motion` + `pausedDates` + `visibilitychange` pause-on-hidden.
- `app/src/lib/i18n/calendar-ui.ts` — new i18n copy file (en + zh-TW + zh-CN; cascades to the other 6 locales).
- `app/src/app/[locale]/(protected)/calendar/page.tsx` — Phase 1 landing stub (full tabs come in Phase 3).

**Modified**
- `app/src/lib/constants/navigation.ts` — nav item renamed `google-calendar` → `calendar`, URL `/google-calendar` → `/calendar`.
- `app/src/lib/i18n/nav-labels.ts` — added `calendar` label in all 9 locales.
- `app/src/lib/theme-labels.ts` — added `calendar` themed label in all 4 themes (default / astronaut / academia / forest).

**Key decisions**
- Orbital layout uses a 1000×1000 SVG viewbox centered on (500, 500). Each bubble gets a seeded ellipse (`radius_x`, `radius_y`), initial angle, revolution period (80–120s, scaled by √ring per Kepler-lite), and random direction. Seed derives deterministically from the date string so the layout is identical render-to-render.
- Animation layer separates static layout (`orbital.ts`) from per-frame angular state (`use-orbital-animation.ts`). UI consumes the product via `orbitalPosition(day, angles[day.date])`.
- `CalendarItem` is a **runtime** projection — no Supabase migrations. If persistence becomes necessary, a new `calendar_items` view can wrap the projection.
- Acceptance criteria verified: no `any`; discriminated union narrows via `source_type`; `MonthViewMode` + `OrbitalDay` shapes match spec; `DayLoad` enum values match spec; sidebar shows "Calendar"; TS + ESLint clean.

Continuing to Phase 2 immediately per autonomous-mode rule #2.

### Phase 2 — complete ✅

**Created**
- `app/src/hooks/use-today-context.ts` — orchestrates projection + AI summary + conflicts for today with independent skeleton states.
- `app/src/components/calendar/day-load-badge.tsx` — pill and dot variants for `DayLoad` enum.
- `app/src/components/calendar/calendar-event-tile.tsx` — shared tile / row / chip shape used by every Calendar surface.
- `app/src/components/calendar/timeline-preview.tsx` — ordered mini-timeline with empty-state fallback.
- `app/src/components/calendar/free-window-chips.tsx` — "Nh free M–N" chip row.
- `app/src/components/calendar/ai-summary-card.tsx` — skeleton → fade-in (Framer Motion, `prefers-reduced-motion` safe).
- `app/src/components/calendar/today-block.tsx` — premium homepage block.

**Modified**
- `app/src/app/[locale]/(protected)/dashboard/page.tsx` — `<TodayBlock />` inserted between the date/time header and Motivation / Grateful grid per spec.
- `app/src/app/globals.css` — appended **Calendar liquid-glass accent layer** (scoped to `[data-calendar-surface]`): lime accent (`#D4FF3A`), dark-glass variant (spec § 8.3), orbital radial gradient, specular top-edge highlight, TODAY pulse animation, lime CTA helper, reduced-motion guards.

**Key decisions**
- Re-read full `liquid_glass_ui.md` (mid-session) and aligned all Calendar surfaces on the **existing** `GlassPanel` + `--surface-glass` system instead of introducing parallel tokens. Only Calendar-specific additions (lime, orbital gradient, dark glass variant) sit behind `[data-calendar-surface]` so nothing leaks to unrelated features.
- `TodayBlock` uses spec § 7's signature entrance (`y:8→0`, 400ms easeOut) with a `useReducedMotion` guard.
- AI summary card loads async independently of the calendar projection so the block can show skeleton + items concurrently (calendar projection is fast; summary is "slow").
- Weather chip is lazy — shows only when `useWeather()` returns `status: "ok"`; all chips degrade silently if weather / timezone resolve to empty.
- Quick actions: "Plan My Day" uses `.calendar-lime-cta` (spec § 8.4); "Quick Add" links to `/daily-planner#quick-add`; "Open Calendar" opens `/calendar?tab=today` (the tab param will be honored in Phase 3).

**Visual description (desktop, dark mode)**
A tall glass panel with a faint specular top edge, floating between the dashboard's greeting header and the Motivation / Grateful grid. Left-aligned a violet calendar-clock icon well, "TODAY · Thursday, April 23" title. Right-aligned: muted `Intl.DateTimeFormat().resolvedOptions().timeZone` chip, temperature chip, and a color-coded Day Load badge (e.g. "Focus-heavy" = indigo). Optionally an amber alert strip when overdue or conflicts are present. Below, a violet-tinted AI summary card fades in after ~600ms with a 2–3 sentence paragraph + rounded highlight pills. Below that, a two-column grid: the day's mini-timeline (up to 5 rows) on the left, free-window chips on the right. Bottom row: outline "Quick Add", lime-on-black "Plan My Day", ghost "Open Calendar".

**Visual description (mobile, 375px)**
The header stack collapses — date + DayLoad on one row, chips wrap. The two-column body collapses to a single column (timeline first, free windows below). Quick-action buttons wrap to two rows. All spacing halves; block padding stays generous (20 → 24px).

Continuing to Phase 3 immediately per autonomous-mode rule #2.

### Phase 3 — complete ✅

**Created**
- `app/src/components/calendar/tabs/today-tab.tsx` — expanded full-page Today with dedicated overdue / conflicts / free-windows panels and CTA row.
- `app/src/components/calendar/tabs/agenda-tab.tsx` — chronological list (next 14 days) with pinned overdue strip.
- `app/src/components/calendar/tabs/week-tab.tsx` — 7-column grid for desktop; **collapses to AgendaTab with an explainer GlassPanel on mobile** (per acceptance criterion and KISS).
- `app/src/components/calendar/tabs/month-tab.tsx` — shell that picks between `MonthViewComplete / Minimal / Orbital` based on `useMonthViewMode`. Variant switching is a 200ms Framer Motion crossfade.
- `app/src/components/calendar/tabs/ai-plan-tab.tsx` — Phase 4 placeholder with lime CTA button.
- `app/src/components/calendar/month/month-view-toggle.tsx` — segmented `Complete | Minimal | Orbital` pill; active pill uses the lime accent (`--calendar-lime`).
- `app/src/components/calendar/month/month-view-complete.tsx` — classic 7-column month grid: date number + up to 3 tiles + "+N more" overflow chip, DayLoad dot top-right, overdue red pip, today cell tinted lime-soft, selected cell ringed in lime; click opens a right-side Framer Motion slide-in panel with full day agenda.
- `app/src/components/calendar/month/month-view-minimal.tsx` — dots-only grid (no text in cells) with today in a lime circle and a `layoutId` lime selection bar; persistent right-side dark-glass Agenda panel with grouped "TODAY / TOMORROW / EEE, MMM D" sections and a fixed `+ New Event` footer.
- `app/src/components/calendar/month/month-view-orbital.tsx` — **signature variant**. SVG orbital canvas (1000×1000 viewbox on `calendar-orbital-canvas` with deep forest/teal radial gradient + specular highlight), TODAY center circle with lime glow pulse, 10 surrounding day bubbles revolving on their seeded ellipses, hover tooltip, bubble pause on hover/selection, slow counter-rotating decorative dashed rings (stopped under reduced motion), and the UpcomingPrioritiesPanel docked below.
- `app/src/components/calendar/month/upcoming-priorities-panel.tsx` — dark-glass bottom panel for the Orbital variant with color-coded priority badges (Deadline/Milestone/Focus/Habit/Reminder/Event) and "View Full List →" link jumping to Agenda.

**Modified**
- `app/src/app/[locale]/(protected)/calendar/page.tsx` — replaced Phase 1 stub with real tabbed page. Tabs: Today · Agenda · Week · Month · AI Plan. Active tab uses a `layoutId` lime pill (Framer Motion) with a soft lime glow. Tab state is persisted to the URL via `?tab=`, so the deep-links from `TodayBlock` (`?tab=ai-plan`, `?tab=today`) work end-to-end. Wrapped in `<Suspense>` so `useSearchParams` is safe under Next 16.

**Key decisions**
- **Liquid-glass conformance** — every outer surface is `<GlassPanel>` + `calendar-specular-highlight`. Event tiles inside stay as solid-fill pills (design principle #3: readability over glass). The Orbital canvas and the Minimal Agenda / Upcoming Priorities panels use the `.calendar-glass-dark` variant (spec § 8.3) for the "smoked glass at night" feel.
- **Orbital rotation** — `computeOrbitalLayout()` seeds each bubble deterministically from its date string. `useOrbitalAnimation` advances per-bubble angles every frame via `requestAnimationFrame`, skips paused bubbles (hover or selected), and halts when the document is hidden. The decorative rings counter-rotate at 0.2× speed. `prefers-reduced-motion` freezes everything including the TODAY pulse. This satisfies the "BT THE WAY" orbital-physics addendum fully.
- **SVG coordinate approach** — all bubbles share the same 1000×1000 viewbox centered on (500,500). `orbitalPosition()` turns an angle + ellipse params into `{x, y}`. CSS positions the tooltip by sampling the same function. No DOM circles in a loop; one `<motion.g>` per bubble.
- **Week view mobile** — collapses to AgendaTab rather than forcing horizontal scroll. A GlassPanel explainer makes the degradation intentional.
- **Tab state in URL** — `?tab=month` etc. is canonical; no `localStorage` for tab selection (bookmarkable, back-button-friendly). Only the Month *variant* persists (`useMonthViewMode` → `localStorage`).
- **Active tab indicator** — single `layoutId="calendar-tab-pill"` element Framer-Motion-slides between tabs, with a soft `var(--calendar-lime-glow)` drop shadow.

**Visual description**

*Desktop — Today tab*: Two-column grid. Left: large glass header with date + DayLoad badge, then a violet-tinted AI summary card (skeleton → fade-in), then a full timeline panel. Right: stacked amber overdue panel, free-window chips panel, a conflicts panel (green check if none), and the CTA row (Quick Add outline / lime "Plan My Day" / ghost "Back to Daily Planner").

*Desktop — Agenda tab*: Amber overdue block at top, then grouped date headers (uppercase muted text) with item rows below each. Items are row-variant tiles: source icon well, title + subtitle, tiny overdue pip.

*Desktop — Week tab*: 7-column grid, each column ~ 420px tall. Today's column has a lime-tinted background and a lime circle date badge. Each column shows stacked tile-variant items.

*Desktop — Month / Complete*: Dense 6×7 month grid, day cells show date + up to 3 tiles + overflow chip + DayLoad dot + overdue pip. Today is lime-tinted; click any cell → slide-in right panel from the edge showing full day agenda.

*Desktop — Month / Minimal*: 70/30 split. Left is a spacious 6×7 grid of rounded-square "dot" cells — each shows just a date number and up to 3 coloured source-type dots; today gets a lime-glowing disc; the selected day has a sliding lime bar. Right is a persistent dark-glass Agenda panel with TODAY / TOMORROW sections, event cards with time range + bold title + subtle subtitle, and a fixed "+ New Event" footer.

*Desktop — Month / Orbital*: A dark forest-teal radial canvas fills the top. The TODAY center circle glows lime, pulsing softly. Ten surrounding day bubbles revolve on their own ellipses (no two in lockstep). Hover a bubble → it stops, tooltip appears "MMM D · N Events". Click → selects, slight 1.05× scale, lime ring. Below, a dark-glass "Upcoming Priorities" panel lists the next seven days' items with color-coded priority pills on the right.

*Mobile (375px)*: Tab strip wraps; each tab shrinks to icon + short label. Today tab body collapses to a single column. Agenda tab is identical. Week tab collapses to Agenda with an explainer notice. Month / Complete stays as a 7-column grid (cells shrink) and the slide-in panel becomes fullscreen. Month / Minimal collapses to a 7-column grid with the Agenda panel stacked below. Month / Orbital keeps the radial canvas aspect-ratio'd (16:10) and the priorities panel below — both remain readable.

**Acceptance criteria verified**
- [x] All 4 (5) tabs render without errors with mock data
- [x] Month toggle switches between three variants
- [x] Selected variant persists after refresh (localStorage)
- [x] Complete: tiles, overflow chip, load dot, overdue pip, right-side slide-in
- [x] Minimal: grid shows dots only, right Agenda always visible, "+ New Event" pinned at bottom, day click updates panel
- [x] Orbital: SVG TODAY at center, bubbles at organic positions from `computeOrbitalLayout`, keyboard-focusable, hover tooltip, bottom panel with colored badges, entrance stagger from center outward
- [x] Variant switching uses 200ms crossfade
- [x] Week collapses to Agenda on mobile (decision documented above)
- [x] All strings through i18n
- [x] Orbital background uses dark green/teal gradient, not the default dark token
- [x] 0 TypeScript errors, 0 ESLint warnings

Continuing to Phase 4 immediately per autonomous-mode rule #2.

### Orbital enhancement pass (mid-Phase 4, user-requested)

The user asked for (a) a photo-realistic galaxy backdrop, (b) bubbles properly separated like planets in a solar system, and (c) cursor/touch parallax.

**Done**
- Generated a custom deep-teal spiral-galaxy image (`/public/calendar/orbital-galaxy-bg.png`, ~1.5 MB) that matches the Calendar palette (off-centre core, teal/forest-green nebula, rich starfield).
- Added `useParallax(ref, { maxOffset, smoothing, disabled })` hook — `requestAnimationFrame`-driven smoothing of pointer / touch position, normalised to `[-1, 1]`, scaled to pixels, with `prefers-reduced-motion` opt-out.
- Orbital canvas now has three depth layers that parallax at different speeds via CSS custom properties `--pan-x` / `--pan-y`:
  1. **Galaxy image** — slowest, 1.0× pan (via `next/image` with `fill`).
  2. **Decorative dashed rings** — 0.35× pan (foreground-ish).
  3. **Bubbles + TODAY** — 0.15× pan in the *opposite* direction, so they feel like a fixed foreground.
- Rewrote `computeOrbitalLayout` to **bin bubbles into 2 rings by proximity (|Δ|≤2 → ring 1; |Δ|≤5 → ring 2)**, assign evenly-spread initial phases per ring, share direction per ring, and widen spacing (`BASE_RADIUS 180→235`, `RADIUS_STEP 85→115`). With 10 surrounding bubbles this gives ≥200 SVG-units of centre-to-centre clearance within each ring and ≥115 units between rings — no "stitched together" stacks at any phase.
- TODAY circle now has a soft lime radial-gradient halo behind the solid disc for extra luminance on a starfield background.
- Each orbiting bubble gets a small black backplate + drop shadow so it reads cleanly over bright star clusters.
- Galaxy layer styling: over-sized by 6% on all sides so parallax translation never exposes the vignette edge; a radial darkening overlay at the centre keeps the TODAY circle high-contrast regardless of where the galaxy's bright core happens to sit.
- `prefers-reduced-motion` disables all parallax translations and the TODAY pulse (already inherited by bubble rotation).

**Files modified**
- `app/src/lib/calendar/orbital.ts` — new ring-binning layout algorithm, `minCenterGap()` helper.
- `app/src/hooks/use-parallax.ts` — new parallax tracking hook (pointer + touch).
- `app/src/components/calendar/month/month-view-orbital.tsx` — galaxy image layer, parallax wiring via `CSSProperties` vars, darker bubble fills + drop shadows, radial gradient halo behind TODAY.
- `app/src/app/globals.css` — `[data-orbital-galaxy / -rings / -bubbles]` layer styles, parallax transforms, reduced-motion guard.
- `app/public/calendar/orbital-galaxy-bg.png` — generated galaxy asset.
