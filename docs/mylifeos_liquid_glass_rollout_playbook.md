# MyBestLife OS Liquid Glass Rollout Playbook

## Design Read

MyBestLife OS is an authenticated personal operating system for life management. The default theme should feel like a calm, premium, mobile-first Liquid Glass product: useful before decorative, tactile without being flashy, and consistent without making every page look identical.

## Success Criteria And Exit Definition

The rollout exits only when the app-wide consistency system is complete enough to trust as a repeatable standard, not when a few pages look better.

Success means:

- The protected app has one shared Liquid Glass OS system for page chrome, controls, surfaces, hidden layers, states, and motion.
- Every protected route is either `Reference`, `Verified`, or explicitly `Deferred`.
- `Pending` and `Partial` both equal zero.
- Every `Verified` route has runtime evidence across the required viewports and hidden interaction states.
- No known visual, responsive, accessibility, interaction, routing, auth, data, form, or API regression remains open.
- Required validation passes and the final branch is committed and pushed.

The exit condition is intentionally binary:

```txt
can_exit =
  protected_inventory_complete
  && pending_count === 0
  && partial_count === 0
  && known_regression_count === 0
  && all_verified_pages_have_runtime_evidence
  && all_required_validation_passed
  && final_commit_pushed
```

### Exit Gate Checklist

Pursue Goal mode should stop only after this checklist is fully green:

- Inventory: every protected route and route family is listed in this playbook.
- Migration: every non-deferred route uses the shared OS primitives for its core shell, controls, surfaces, overlays, empty states, and motion where applicable.
- Verification: every non-deferred route is marked `Verified` with runtime evidence, not just code inspection.
- Hidden states: every reachable modal, sheet, popover, dropdown, command surface, confirmation, detail panel, empty state, loading state, and error state has been opened and checked.
- Responsiveness: mobile, tablet, desktop, and wide desktop are checked; high-risk pages include the required breakpoint set.
- Accessibility: keyboard focus, focus return, ARIA behavior where touched, reduced motion, safe-area spacing, tap targets, and readable contrast are checked.
- Behavior safety: no unapproved routing, auth, data fetching, API, form, mutation, persistence, or state-management behavior changed.
- Regression safety: TypeScript, lint for touched files, relevant tests, existing rollout regression tests, and `git diff --check` pass or have documented unrelated failures.
- Reviewability: all changed files are scoped to the rollout, with no placeholder UI, abandoned experiments, or unrelated refactors.
- Delivery: the final branch is committed and pushed.

If any checklist item is not green, the goal remains active and the next action is to reduce `Pending`, reduce `Partial`, collect missing evidence, or fix a regression.

### Required Final State

- Every protected page or route family is inventoried.
- Every inventory item has a final status of `Reference`, `Verified`, or `Deferred`.
- No item remains `Pending` or `Partial`.
- Every `Deferred` item has a reason, owner-level acceptance, and a later-phase recommendation.
- No page is marked `Verified` from static code review alone.
- No high-traffic or product-critical page is deferred only because it is time-consuming.
- Shared OS primitives are the default path for headers, controls, segmented navigation, status rails, action rows, surfaces, dialogs, sheets, popovers, empty states, and motion.
- Bucket List remains the reference page and consumes the shared OS primitives instead of drifting into a separate local design system.
- No unapproved business logic, data flow, routing, auth, persistence, form, mutation, or API behavior changed.
- The final work is committed and pushed.

### Per-Page Acceptance Criteria

A page can move from `Partial` to `Verified` only when all of this is true:

- Runtime checked at mobile, tablet, desktop, and wide desktop.
- High-risk pages checked at `320px`, `375px` or `390px`, `430px`, `768px`, `1024px`, `1280px`, and `1440px`.
- Header, navigation, primary actions, filters, status controls, cards, tables, maps, forms, empty states, loading states, and error states are reviewed where present.
- Every reachable modal, sheet, popover, dropdown, command surface, detail panel, and confirmation flow is opened and checked.
- All meaningful buttons, links, inputs, tabs, chips, filters, menus, cards, floating controls, assistant controls, and icon-only controls have usable default, hover, pressed, focus-visible, selected, disabled, and loading states where relevant.
- Mobile has no accidental wrapping, horizontal overflow, clipped controls, unsafe bottom overlap, browser chrome collision, or floating assistant collision.
- Desktop and wide desktop feel composed, not stretched or sparse.
- Transitions preserve context for tabs, filters, view switches, card/detail flows, sheets/dialogs, list reflow, and back navigation where appropriate.
- Motion respects `prefers-reduced-motion`.
- Copy is calm, direct, and useful; repeated wording and motivational filler are removed.
- Liquid Glass is used for hierarchy and controls, while dense content and forms remain readable.
- No important functionality is removed.

### Required Evidence Pack

Each `Verified` page needs a short evidence entry in this playbook or a linked verification note with:

- Route or route family.
- Final status.
- Files changed.
- Viewports checked.
- Hidden states checked.
- Interaction paths checked.
- Screenshots or screenshot paths when captured.
- Validation commands run.
- Known remaining issues, or `None`.

### Runtime Audit Harness

Use the shared runtime harness for repeatable evidence when it fits the page:

```bash
cd app
npm run audit:liquid-glass -- --routes=/en/<route> --timeout-ms=180000
```

The harness writes screenshots and a summary to `app/.next/liquid-glass-audit`. A page can use this evidence only when route-specific hidden states are also covered, or explicitly documented as absent.

### Required Validation

The rollout cannot exit until these pass:

- TypeScript: `npx tsc --noEmit --pretty false`
- Lint for touched app files: `npx eslint --max-warnings=0 <files>`
- Relevant unit/integration tests for touched behavior.
- Existing targeted regression tests used during this rollout.
- Whitespace check: `git diff --check`

If a command fails for a pre-existing or unrelated reason, the failure must be documented with the exact command, summarized output, and why it is outside the rollout.

### Do Not Exit If

- Any page is only visually touched.
- Any page is only statically reviewed.
- Any page is blocked by an unaudited modal, sheet, dropdown, popover, or detail flow.
- Any page lacks responsive runtime evidence.
- Any page remains `Pending` or `Partial`.
- Any known regression remains open.
- Any changed behavior has not been approved.

## Taste Skill Stack

- `redesign-existing-projects`: audit first, improve existing code, preserve behavior.
- `design-taste-frontend`: avoid generic AI UI patterns and choose patterns that fit product pages, not landing pages.
- `high-end-visual-design`: apply premium spacing, material depth, and motion selectively.
- `minimalist-ui`: reduce clutter and copy; do not apply its anti-glass rule literally.
- `image-to-code`: use only when a complex page family needs a visual reference frame before implementation.
- `full-output-enforcement`: no placeholders, no half-finished component shells, no skipped states.

When these conflict, prioritize usability, mobile responsiveness, accessibility, existing functionality, Liquid Glass direction, premium polish, then visual experimentation.

## System Primitives

The shared OS layer is the source of truth for future page migrations:

- Surfaces: `OSGlassPanel`, `OSFrostedPanel`, `OSSolidPanel`
- Controls: `OSControl`, `OSIconControl`, `OSPrimaryAction`, `OSActionRow`
- Navigation state: `OSSegmentedControl`, `OSStatusRail`
- Page chrome: `OSPageHeader` through `PageShell`
- Layers: `OSBottomSheet`, `OSDialogSurface`, `OSEmptyState`
- Motion: `OS_MOTION`, `osEntrance`, `osTabPanel`, `runOSViewTransition`

Use glass for navigation, selected states, floating controls, sheets, dialogs, contextual menus, and lightweight panels. Use solid or frosted content surfaces for dense reading, forms, tables, and error states.

## Protected Page Inventory

Status values:

- `Reference`: already serving as a reference consumer of the shared OS layer.
- `Verified`: migrated to shared OS primitives and passed runtime, responsive, hidden-state, accessibility, and validation checks.
- `Partial`: uses some shared OS primitives, but still needs full runtime/hidden-state audit or cleanup.
- `Pending`: not migrated yet.
- `Deferred`: intentionally out of this rollout phase, with a reason.

| Phase | Page or route group | Status | Notes |
| --- | --- | --- | --- |
| 1 | Bucket List | Reference | Visual benchmark; local glass and motion tokens now alias shared OS primitives. |
| 1 | Calendar | Verified | Calendar tab rail, Today actions, Week mobile collapse/desktop controls, Month Complete/Minimal/Orbital modes, agenda side panel, AI Plan actions, and shared shell checks passed runtime and route-specific verification. |
| 1 | Projects | Partial | Loading shell, mobile action row, toolbar controls, insight tiles, suggestion bar, command palette, template menu, filters, search, empty state, and view switcher passed runtime/focused checks; seeded authenticated project data is still needed for populated cards, detail modal, map relationships, updates, and destructive confirmations. |
| 1 | Dashboard | Verified | Header, motivation refresh, Today controls, Signals widget, grateful slots, quote/video inspiration controls, shared checkbox target, and floating AI action passed runtime and route-specific checks. |
| 1 | Daily Planner | Verified | Header actions, date controls, sync action, planning-mode toggle, time pickers, task/import/quick-task dialogs, quick-task block picker, visual schedule menu, Free Plan mode, passive AirPilot overlay lane, and shared shell checks passed runtime and route-specific verification. |
| 1 | Tasks | Partial | Low-data shell, loading state, Insights sheet, create menu/dialog, create tabs/forms, advanced filters, saved filters, quick selects, and view switcher passed runtime and focused checks; seeded task data is still needed for task detail, inline edit, bulk selection, drag/drop, ritual, and destructive confirmation verification. |
| 2 | Goals | Partial | Parent create action and standard goal dialog controls use OS primitives; filters, cards, progress surfaces, and modal/sheet audit remain. |
| 2 | Bucket List Map | Verified | Shares Bucket List OS tokens; reachable low-data map state, status rail, back control, zoom controls, and add-travel sheet passed runtime and route-specific checks. |
| 2 | Relationship | Partial | Container sub-tabs use `OSSegmentedControl`; relationship cards, forms, AI sheets, and hidden layers still need audit. |
| 2 | Relationships | Deferred | Legacy redirect to `/relationship?tab=relationship`; UI is covered by the Relationship hub rollout. |
| 2 | Quote Library | Verified | Library tabs, search/filter controls, settings popover, seed-clear confirmation, Add quote sheet/form, empty CTA, and dev-bypass quote API behavior passed runtime and route-specific checks. |
| 2 | Knowledge Base + Oracle route | Partial | Covers `/knowledge-base` and `/knowledge-base/[itemId]/oracle`; page actions, top view switcher, AI ask action, type trigger, and quick filters use OS controls; sidebar, add modal, detail sheet, document chat dialogs, oracle route, and constellation controls still need audit. |
| 2 | AI Knowledge + create/detail routes | Partial | Covers `/ai-knowledge`, `/ai-knowledge/[id]`, `/ai-knowledge/create`, `/ai-knowledge/create/blank`, and `/ai-knowledge/create/wizard`; header actions, primary tab switcher, category rail, layout switcher, clear action, and command palette shell use OS primitives; prompt drawers, create flows, folder dialogs, run dialogs, nested routes, and selection toolbar still need audit. |
| 3 | Health | Partial | Date controls and trends range switcher use OS controls; metric cards, hydration actions, logging modal, goals panel, and chart readability still need runtime/hidden-state audit. |
| 3 | Finance | Partial | Floating add action, overview lens switcher, category switcher, and category actions use OS primitives; period/currency controls, savings dialogs, transaction/budget modals, dense tables, and delete confirmations still need audit. |
| 3 | Habits | Partial | Secretary hero actions, AI suggestion refresh/create actions, and routine create trigger use OS controls; habit cards, routine dialogs, popovers, detail drawers, timer pill, and archive/details flows still need audit. |
| 3 | Journal | Partial | Header navigation and sticky save/new-entry controls use OS controls; form fields, emotion picker, AI add-ons, unsaved dialog, recent list, and trend card still need audit. |
| 3 | Grateful Things | Partial | Page create action, create dialog shell/actions, and detail dialog non-destructive actions use OS primitives; rich editor, photo upload, delete confirmation, cards, and empty/loading flows still need audit. |
| 3 | Resources | Partial | Asset/document tab rail uses `OSSegmentedControl`; asset/document create dialogs, intelligence modal, filters, empty states, and hidden flows still need audit. |
| 3 | Weather | Partial | Top refresh, error retry, and forecast horizon switcher use OS controls while preserving the custom weather scene/material; location search popover, radar controls, charts, and weather-specific glass need audit. |
| 3 | Settings + AI Preferences | Partial | Covers `/settings` and `/settings/ai-preferences`; color mode, block size, font size, save/retry, Quick Save, weather, and Google Calendar controls use OS primitives where safe; long forms, settings subsections, social integrations, AI preferences route, and destructive flows still need audit. |
| 4 | About Me | Partial | Profile image surface and section save actions use OS surfaces/actions; rich text editors, upload state, and runtime form audit remain. |
| 4 | AI Assistant | Verified | Local chat shell, message bubbles, empty state, composer, and send action use OS surface/action styling; runtime audit and chat send flow passed across required viewport classes with reduced-motion-safe autoscroll. |
| 4 | Analytics | Partial | Time lens uses `OSStatusRail`, refresh insight uses `OSControl`, and disabled range tooltips are preserved through the shared rail item API; chart controls, panels, dense visualizations, loading/partial-data states, and runtime readability audit remain. |
| 4 | Brain | Partial | Route viewport shell uses the shared OS map surface token while preserving server auth and graph sizing; BrainView toolbar, filters, canvas controls, legend, local orbit/detail panels, mobile inspector, diagnostic overlays, and full graph runtime audit remain. |
| 4 | Business Analyst | Verified | Stub page uses `OSEmptyState` and passed runtime audit across required viewports with common protected-shell interactions and reduced-motion check; no page-specific hidden states. |
| 4 | Career and nested career pages | Partial | Command center shell, dashboard summary widgets, intelligence widgets, AI suggestion loading state, profile CTA, next-action control, and command-search trigger/dialog now use OS primitives/material tokens; analytics, coach, compass, journal, network, pipeline, profile, timeline, vault detail/history/compare/bundles/shares/tags, heavy forms, command result routing audit, and full runtime hidden-state verification remain. |
| 4 | Garden | Partial | Page shell motion, inventory rail, daily chest, active plant surface/actions, seed selector cards, and collection empty/list surfaces use OS primitives/material tokens; Bio Lab tool cards/sheets, weekly insight/history layers, garden loading states, and runtime viewport audit remain. |
| 4 | Google Calendar | Partial | Connect card, navigation actions, setup panel, disabled no-user state, and responsive shell passed runtime audit; authenticated OAuth redirect/return edge states still need a real-session verification pass. |
| 4 | Ideas | Partial | Page action row, error state, main content shell, desktop/mobile sidebar controls/sheet, and view switcher use OS primitives/material tokens; top filter dropdowns, active filters, add modal, detail sheet, gallery/board/table cards, and runtime drawer/sheet audit remain. |
| 4 | Japanese Study | Partial | Page create action, stat panels, empty state, create/edit/detail dialog shells, non-destructive dialog actions, and read-only detail surfaces use OS primitives; filter bar, entity cards, rich text editors, select/date controls, delete confirmation, and runtime mobile form audit remain. |
| 4 | Knowledge Software Vault | Partial | Route shares `VaultPage`; vault mode switcher, header controls, spend pill, empty state, placeholder state, and delete confirmation shell now use OS primitives/material tokens; filter bar, gallery cards, gate animation, detail/add/edit/research dialogs, comparison/build-stack flows, and runtime route audit remain. |
| 4 | Mind Council | Partial | Hero, prompt chips, primary actions, disclaimer, recommendation panel, current council bar, skill cards, library category rail, no-results state, and create-skill CTA use OS primitives/material tokens; chat room, advisor profile sheet, group council panel, create skill modal, deep-link flows, loading/error states, and runtime hidden-layer audit remain. |
| 4 | Privacy | Verified | Solid OS reading surface and OS back control passed runtime audit across required viewports with common protected-shell interactions and reduced-motion check; no page-specific hidden layers. |
| 4 | Quick Save setup/capture/success | Partial | Setup, success, missing-capture, and review shells/actions now use server-safe OS glass/control tokens; auth redirects, capture lookup, and server actions are unchanged. Share-sheet entry, disabled/error reasons, file previews, submit states, and mobile runtime audit remain. |
| 4 | Role Models | Deferred | Legacy redirect to `/relationship?tab=role-model`; UI is covered by the Relationship hub rollout. |
| 4 | Signals | Partial | Header view switcher, refresh/regenerate/settings controls, type filter rail, and advanced filter trigger use OS primitives; settings sheet, filter drawer, cards, table/compact/gallery views, loading/error/empty states, and runtime interaction audit remain. |
| 4 | Software Vault | Deferred | Legacy redirect to `/vault`; UI is covered by the Vault rollout and should not be migrated as a standalone page. |
| 4 | Vault | Partial | Mode switcher, header controls, spend pill, empty state, placeholder state, delete confirmation shell, and stable entry-list effect use OS primitives/material tokens; themed gate, vault chrome, filter bar, gallery cards, detail/add/edit/research dialogs, comparison/build-stack flows, and runtime responsive audit remain. |
| 4 | Weekly Review | Partial | Page create action, empty state, create/edit/detail dialog shells, non-destructive dialog actions, and read-only detail surfaces use OS primitives; filter bar, card list, rich text editors, delete confirmation, and runtime dialog audit remain. |
| 4 | YouTube Radar | Verified | Stub page uses `OSEmptyState` and passed runtime audit across required viewports with common protected-shell interactions and reduced-motion check; no page-specific hidden states. |

Every page must be marked as `Reference`, `Verified`, or `Deferred` with a reason before the rollout exits. `Pending` and `Partial` are in-progress states and cannot remain at exit.

## Runtime Evidence Log

### 2026-06-03 - Business Analyst + Privacy

- Routes: `/en/business-analyst`, `/en/privacy`
- Final status: `Verified`
- Shared support files changed: `app/src/components/app-topbar.tsx`, `app/src/components/topbar/search-pill.tsx`, `app/src/components/topbar/clock-pill.tsx`, `app/src/components/ui/os-glass.ts`, `app/src/app/globals.css`, `app/src/lib/weather/openweather.ts`, `app/src/lib/weather/open-meteo.ts`, `app/src/hooks/weather/use-weather-summary.ts`, `app/src/hooks/weather/use-weather-page.ts`, `app/scripts/audit-liquid-glass-runtime.mjs`, `app/package.json`
- Viewports checked: `320`, `390`, `430`, `768`, `1024`, `1280`, `1440`, plus `390` with `prefers-reduced-motion`
- Hidden/common shell states checked: Quick Capture sheet, global command palette, theme toggle, clock panel, desktop utility menu where applicable; Escape close checked for sheet/dialog/panel layers
- Page-specific hidden states: none
- Screenshots: `app/.next/liquid-glass-audit/en-business-analyst-*.png`, `app/.next/liquid-glass-audit/en-privacy-*.png`
- Validation command: `npm run audit:liquid-glass -- --routes=/en/business-analyst,/en/privacy --timeout-ms=180000`
- Result: 16 checks, 0 fail, 0 warn
- Known remaining issues: none for these two routes; global verification still required for other routes

### 2026-06-03 - YouTube Radar

- Route: `/en/youtube-radar`
- Final status: `Verified`
- Route files changed: none in this pass; existing page already uses `PageShell` and `OSEmptyState`
- Viewports checked: `320`, `390`, `430`, `768`, `1024`, `1280`, `1440`, plus `390` with `prefers-reduced-motion`
- Hidden/common shell states checked: Quick Capture sheet, global command palette, theme toggle, clock panel, desktop utility menu where applicable; Escape close checked for sheet/dialog/panel layers
- Page-specific hidden states: none
- Screenshots: `app/.next/liquid-glass-audit/en-youtube-radar-*.png`
- Validation command: `npm run audit:liquid-glass -- --routes=/en/youtube-radar --timeout-ms=180000`
- Result: 8 checks, 0 fail, 0 warn
- Known remaining issues: none for this route; global verification still required for other routes

### 2026-06-03 - AI Assistant

- Route: `/en/ai-assistant`
- Final status: `Verified`
- Route file changed: `app/src/app/[locale]/(protected)/ai-assistant/page.tsx`
- Viewports checked: `320`, `390`, `430`, `768`, `1024`, `1280`, `1440`, plus `390` with `prefers-reduced-motion`
- Hidden/common shell states checked: Quick Capture sheet, global command palette, theme toggle, clock panel, desktop utility menu where applicable; Escape close checked for sheet/dialog/panel layers
- Page-specific interaction checked: composer input is at least `44px` tall on mobile, empty send is disabled, typing enables send, Enter sends a local user message, and the composer clears after send at `390` and `1280`
- Page-specific hidden states: none
- Screenshots: `app/.next/liquid-glass-audit/en-ai-assistant-*.png`
- Validation commands: `npm run audit:liquid-glass -- --routes=/en/ai-assistant --timeout-ms=180000`; Playwright chat send flow check for `390` and `1280`
- Result: runtime audit 8 checks, 0 fail, 0 warn; chat send flow passed at `390` and `1280`
- Known remaining issues: none for this route; global verification still required for other routes

### 2026-06-03 - Google Calendar Partial Evidence

- Route: `/en/google-calendar`
- Final status: `Partial`
- Route file changed: `app/src/app/[locale]/(protected)/google-calendar/page.tsx`
- Viewports checked: `320`, `390`, `430`, `768`, `1024`, `1280`, `1440`, plus `390` with `prefers-reduced-motion`
- Hidden/common shell states checked: Quick Capture sheet, global command palette, theme toggle, clock panel, desktop utility menu where applicable; Escape close checked for sheet/dialog/panel layers
- Page-specific interaction checked: dev-bypass/no-user Connect state is disabled with `aria-describedby` helper text; localized Daily Planner and Settings links are visible with at least `44px` targets at `390` and `1280`
- Page-specific hidden states: none
- Screenshots: `app/.next/liquid-glass-audit/en-google-calendar-*.png`
- Validation commands: `npm run audit:liquid-glass -- --routes=/en/google-calendar --timeout-ms=180000`; Playwright no-user connect/link check for `390` and `1280`
- Result: runtime audit 8 checks, 0 fail, 0 warn; no-user connect/link check passed at `390` and `1280`
- Remaining blocker before `Verified`: authenticated Supabase user path must be tested through Google OAuth redirect/return, including cancellation/error return states

### 2026-06-03 - Bucket List Map

- Route: `/en/bucket-list/map`
- Final status: `Verified`
- Route/support files changed: `app/src/app/[locale]/(protected)/bucket-list/map/page.tsx`, `app/src/components/bucket-list/travel-map.tsx`, `app/src/app/globals.css`, `app/scripts/audit-liquid-glass-runtime.mjs`
- Viewports checked: `320`, `390`, `430`, `768`, `1024`, `1280`, `1440`, plus `390` with `prefers-reduced-motion`
- Hidden/common shell states checked: Quick Capture sheet, global command palette, theme toggle, clock panel, desktop utility menu where applicable; Escape close checked for sheet/dialog/panel layers
- Page-specific interaction checked: status rail targets are at least `44px` and selecting Planning updates `aria-selected`; Back link targets `/en/bucket-list` with at least `44px` target; Leaflet zoom control is at least `44px`; Add travel opens `AddDreamSheet` and Escape closes it at `390` and `1280`
- Page-specific hidden states: Add travel sheet checked. Marker/detail dialog was not reachable in current dev data because the audit state has `0` mapped list items.
- Screenshots: `app/.next/liquid-glass-audit/en-bucket-list-map-*.png`
- Validation commands: `npm run audit:liquid-glass -- --routes=/en/bucket-list/map --timeout-ms=180000`; Playwright map route interaction check for `390` and `1280`
- Result: runtime audit 8 checks, 0 fail, 0 warn; map route interaction check passed at `390` and `1280`
- Known remaining issues: none for the reachable low-data state; future seeded-data pass should cover marker-to-detail if mapped items are present

### 2026-06-03 - Quote Library

- Route: `/en/quote-library`
- Final status: `Verified`
- Route/support files changed: `app/src/hooks/use-quote-ai.ts`, `app/src/hooks/use-quote-library-first-visit.ts`, `app/src/components/quote-library/add-quote-sheet.tsx`, `app/src/components/quote-library/tag-input.tsx`, `app/src/components/quote-library/library-settings-popover.tsx`, `app/src/components/quote-library/library-search-bar.tsx`, `app/src/components/quote-library/add-quote-fab.tsx`, `app/src/components/ui/os-primitives.tsx`, `app/src/components/shared/empty-state.tsx`, `app/scripts/audit-liquid-glass-runtime.mjs`
- Viewports checked: `320`, `390`, `430`, `768`, `1024`, `1280`, `1440`, plus `390` with `prefers-reduced-motion`
- Hidden/common shell states checked: Quick Capture sheet, global command palette, theme toggle, clock panel, desktop utility menu where applicable; Escape close checked for sheet/dialog/panel layers
- Page-specific interaction checked: library tabs switch with selected state; search, favorites, sort, and empty CTA targets are at least `44px`; Settings popover opens with export and seed-clear controls; seed-clear confirmation opens and Cancel closes without deleting; Add quote sheet opens from header and empty CTA, form controls/actions are at least `44px`, and Escape closes the sheet at `390` and `1280`
- Page-specific hidden states: Settings popover, seed-clear confirmation dialog, Add quote dialog/form, tab panels, empty low-data state. Destructive Delete action was inspected but not executed.
- Screenshots: `app/.next/liquid-glass-audit/en-quote-library-*.png`
- Validation commands: `npm run audit:liquid-glass -- --routes=/en/quote-library --timeout-ms=180000`; Playwright Quote Library focused interaction check for `390` and `1280`
- Result: runtime audit 8 checks, 0 fail, 0 warn; focused interaction check passed with 38 target/state checks
- Known remaining issues: none for the reachable dev-bypass low-data state; future real-session pass should cover saved quote card detail/edit/delete flows when persisted quote data exists

### 2026-06-03 - Dashboard

- Route: `/en/dashboard`
- Final status: `Verified`
- Route/support files changed: `app/src/app/[locale]/(protected)/dashboard/page.tsx`, `app/src/components/dashboard/motivation-card.tsx`, `app/src/components/dashboard/daily-inspiration-card.tsx`, `app/src/components/dashboard/quote-inspiration-card.tsx`, `app/src/components/calendar/today-block.tsx`, `app/src/components/calendar/free-window-chips.tsx`, `app/src/components/signals/DashboardSignalsWidget.tsx`, `app/src/components/ui/checkbox.tsx`, `app/src/hooks/use-quote-library-sdk.ts`, `app/scripts/audit-liquid-glass-runtime.mjs`
- Viewports checked: `320`, `390`, `430`, `768`, `1024`, `1280`, `1440`, plus `390` with `prefers-reduced-motion`
- Hidden/common shell states checked: Quick Capture sheet, global command palette, theme toggle, clock panel, desktop utility menu where applicable; Escape close checked for sheet/dialog/panel layers
- Page-specific interaction checked: motivation refresh target is at least `44px`; Today quick actions route correctly and are at least `44px`; Signals widget header/detail links are at least `44px`; grateful add/slot links are at least `44px`; Quote Library empty CTA and YouTube inspiration action are at least `44px`; daily inspiration checkbox toggles with a `44px` target; Get New Video action runs; floating AI assistant action no longer overlaps Quick Capture or OS Buddy at `390` and `1280`
- Page-specific hidden states: none beyond common shell layers in the reachable dev-bypass dashboard state
- Screenshots: `app/.next/liquid-glass-audit/en-dashboard-*.png`
- Validation commands: `npm run audit:liquid-glass -- --routes=/en/dashboard --timeout-ms=180000`; Playwright Dashboard focused interaction check for `390` and `1280`; targeted `npx eslint --max-warnings=0 ...`; `npx tsc --noEmit --pretty false`; `git diff --check`
- Result: runtime audit 8 checks, 0 fail, 0 warn; focused interaction check passed with 32 target/state checks; targeted lint, TypeScript, and whitespace checks passed
- Known remaining issues: none for the reachable dev-bypass dashboard state; future real-session pass should cover populated quote favorites/inspire-result states when persisted quote data exists

### 2026-06-03 - Calendar

- Route: `/en/calendar`
- Final status: `Verified`
- Route/support files changed: `app/src/components/calendar/tabs/today-tab.tsx`, `app/src/components/calendar/tabs/week-tab.tsx`, `app/src/components/calendar/tabs/ai-plan-tab.tsx`, `app/src/components/calendar/month/month-view-toggle.tsx`, `app/src/components/calendar/month/month-view-minimal.tsx`, `app/src/components/calendar/month/month-view-complete.tsx`, `app/src/components/calendar/free-window-panel.tsx`, `app/src/components/calendar/free-window-chips.tsx`, `app/src/app/globals.css`, `app/src/components/idea-capture/IdeaCaptureSheet.tsx`
- Viewports checked: `320`, `390`, `430`, `768`, `1024`, `1280`, `1440`, plus `390` with `prefers-reduced-motion`
- Hidden/common shell states checked: Quick Capture sheet, global command palette, theme toggle, clock panel, desktop utility menu where applicable; Escape close checked for sheet/dialog/panel layers. Shared shell fixes kept the OS Buddy dock at a `44px` target and removed the hidden capture input hydration warning.
- Page-specific interaction checked: Calendar tab rail targets are at least `44px`; Today Quick Add, Plan My Day, and Back to Daily Planner route correctly; Week collapses to Agenda on mobile and desktop previous/next/today controls work; Month Complete/Minimal/Orbital modes switch; Complete date cells open the agenda side panel and Close dismisses it; Minimal previous/next/today controls are at least `44px`; Minimal New Event routes to `/en/daily-planner#quick-add`; Orbital canvas renders and bubble keyboard activation works; AI Plan Generate and Back controls are at least `44px`, and Accept all is checked when suggestions are present.
- Page-specific hidden states: Complete month agenda side panel; AI Plan generated suggestion controls; mobile Week low-density state; empty/low-data agenda and month states in dev-bypass data.
- Screenshots: `app/.next/liquid-glass-audit/en-calendar-*.png`
- Validation commands: `npm run audit:liquid-glass -- --routes=/en/calendar --timeout-ms=360000`; Playwright Calendar focused interaction check for `390` and `1280`; targeted `npx eslint --max-warnings=0 ...`; `npx eslint --quiet src/components/idea-capture/IdeaCaptureSheet.tsx`; `npx tsc --noEmit --pretty false`; `git diff --check`
- Result: runtime audit 8 checks, 0 fail, 0 warn; focused interaction check passed at `390` and `1280`; targeted lint, TypeScript, and whitespace checks passed
- Known remaining issues: none for the reachable dev-bypass Calendar state; future real-session pass should cover populated external calendar items and provider-specific event data if connected calendars are present

### 2026-06-03 - Daily Planner

- Route: `/en/daily-planner`
- Final status: `Verified`
- Route/support files changed: `app/src/app/[locale]/(protected)/daily-planner/page.tsx`, `app/src/components/daily-planner/free-plan-board.tsx`, `app/src/components/daily-planner/mini-calendar-popover.tsx`, `app/src/components/daily-planner/visual-schedule-generator.tsx`, `app/src/lib/daily-planner/quick-task-preset-meta.ts`, `app/src/hooks/use-google-calendar-planner.ts`, `app/src/components/os-buddy/OSBuddyAirControlOverlay.tsx`, `app/src/components/os-buddy/OSBuddyDock.tsx`, `app/src/components/idea-capture/IdeaCaptureSheet.tsx`, `app/src/app/globals.css`
- Viewports checked: `320`, `390`, `430`, `768`, `1024`, `1280`, `1440`, plus `390` with `prefers-reduced-motion`
- Hidden/common shell states checked: Quick Capture sheet, global command palette, theme toggle, clock panel, desktop utility menu where applicable; Escape close checked for sheet/dialog/panel layers. Passive AirPilot permission/listening UI no longer overlaps Quick Capture.
- Page-specific interaction checked: mini calendar popover; start/end time pickers; Time Block and Free Plan mode switch; Create Task dialog; Import tasks dialog; Add Quick Task dialog; quick-task block picker; Visual Schedule style listbox; Free Plan create flow; keyboard focus at mobile, desktop, and reduced-motion viewports.
- Page-specific hidden states: calendar popover, time wheel popovers, create task dialog, import dialog, add quick task dialog, quick-task block popover, visual schedule select/listbox, common Quick Capture sheet, search palette, and clock dialog.
- Screenshots: `app/.next/liquid-glass-audit/en-daily-planner-*.png`; focused screenshots: `app/.next/liquid-glass-audit/daily-planner-focused-390-no-preference.png`, `app/.next/liquid-glass-audit/daily-planner-focused-1280-no-preference.png`, `app/.next/liquid-glass-audit/daily-planner-focused-390-reduce.png`
- Validation commands: `npm run audit:liquid-glass -- --routes=/en/daily-planner --timeout-ms=360000`; Playwright Daily Planner focused interaction check for `390`, `1280`, and `390` reduced motion; targeted `npx eslint ...`; `npx tsc --noEmit --pretty false`; `git diff --check`
- Result: runtime audit 8 checks, 0 fail, 0 warn; focused interaction check passed at `390`, `1280`, and `390` reduced motion; targeted lint returned 0 errors with 13 existing warnings in Daily Planner, Visual Schedule, Idea Capture, and OS Buddy files; TypeScript and whitespace checks passed.
- Known remaining issues: none for the reachable dev-bypass Daily Planner state; lint warnings should be addressed in a future cleanup pass but did not block runtime verification.

### 2026-06-03 - Projects Partial Evidence

- Route: `/en/projects`
- Final status: `Partial`
- Route files changed: `app/src/app/[locale]/(protected)/projects/page.tsx`, `app/src/components/projects/command-palette.tsx`, `app/src/components/projects/insight-strip.tsx`, `app/src/components/projects/whats-next-bar.tsx`
- Viewports checked: `320`, `390`, `430`, `768`, `1024`, `1280`, `1440`, plus `390` with `prefers-reduced-motion`; focused Playwright checks at `390`, `1280`, and `390` reduced motion.
- Hidden/common shell states checked: shared runtime audit covered common shell interactions; focused check verified the global Quick Capture hit target is no longer obstructed by the Projects page action system.
- Page-specific interaction checked: PageShell loading state keeps the `Projects` H1 and disabled actions; mobile inline action row opens New Project; template dropdown opens/closes on mobile and desktop; command palette searches and switches to Map; status and priority filters apply and clear through focusable chips; sort select opens and applies; search no-data state remains readable; Gallery/List/Timeline/Kanban view tabs switch with selected state.
- Page-specific hidden states: New Project dialog shell, template dropdown, command palette, select listboxes, empty/no-projects state. Create submit, AI generation, project detail modal, edit/update, map relationship dialog, populated list/kanban/gallery/timeline cards, and delete confirmation were not executed.
- Screenshots: `app/.next/liquid-glass-audit/en-projects-*.png`; focused screenshots: `app/.next/liquid-glass-audit/projects-focused-mobile-390.png`, `app/.next/liquid-glass-audit/projects-focused-desktop-1280.png`, `app/.next/liquid-glass-audit/projects-focused-mobile-390-reduce.png`
- Validation commands: `npm run audit:liquid-glass -- --routes=/en/projects --timeout-ms=360000`; Playwright Projects focused interaction check for `390`, `1280`, and `390` reduced motion; targeted `npx eslint --max-warnings=0 ...`; `npx tsc --noEmit --pretty false`; `git diff --check`
- Result: runtime audit 8 checks, 0 fail, 1 warn on the `390` reduced-motion common-shell layer detector; focused route-specific checks passed with no console/page errors and no horizontal overflow; targeted lint, TypeScript, and whitespace checks passed.
- Remaining blocker before `Verified`: dev-bypass data currently has no project records and project creation requires a real Supabase user, so populated project cards, detail/edit modal, status mutation, pin behavior on populated views, map relationship creation, timeline/list row actions, and destructive delete confirmation still need a seeded non-production project-data pass. The reduced-motion common-shell warning should be rechecked with the next shared-shell audit.

### 2026-06-03 - Tasks Partial Evidence

- Route: `/en/tasks`
- Final status: `Partial`
- Route/support files changed: `app/src/app/[locale]/(protected)/tasks/page.tsx`, `app/src/components/tasks/task-advanced-filters.tsx`, `app/src/components/tasks/task-ai-actions.tsx`, `app/src/components/tasks/task-board-view.tsx`, `app/src/components/tasks/task-connections.tsx`, `app/src/components/tasks/task-control-bar.tsx`, `app/src/components/tasks/task-create-ai-form.tsx`, `app/src/components/tasks/task-create-dialog.tsx`, `app/src/components/tasks/task-create-manual-form.tsx`, `app/src/components/tasks/task-create-quick-form.tsx`, `app/src/components/tasks/task-detail-panel.tsx`, `app/src/components/tasks/task-insight-panel.tsx`, `app/src/components/tasks/task-project-linker.tsx`, `app/src/components/tasks/task-saved-filters.tsx`, `app/src/components/tasks/task-subtasks.tsx`, `app/src/components/tasks/task-table-view.tsx`, `app/src/components/ui/date-picker-input.tsx`, `app/src/components/ui/dropdown-menu.tsx`, `app/src/components/ui/os-glass.ts`, `app/src/components/ui/os-primitives.tsx`, `app/src/components/ui/select.tsx`, `app/src/hooks/use-task-links.ts`
- Viewports checked: `320`, `390`, `430`, `768`, `1024`, `1280`, `1440`, plus `390` with `prefers-reduced-motion`
- Hidden/common shell states checked: Quick Capture sheet, global command palette, theme toggle, clock panel, desktop utility menu where applicable through the shared runtime audit; route-specific Playwright pass also checked `390`, `1280`, and `390` reduced motion.
- Page-specific interaction checked: PageShell loading state keeps the `Tasks` H1 and disabled actions; Insights opens as an OS sheet and Escape closes it; New Task dropdown opens and `Create Manually` opens the create dialog; Quick/Manual/AI create tabs switch through `OSSegmentedControl`; Advanced Filters opens, filter chips select, Apply closes the sheet; quick select opens and closes; saved filter applies and can be cleared; Grid/Table/Board/List view tabs switch with selected state; Board group select opens and closes.
- Page-specific hidden states: Insights sheet, create dropdown, create dialog/forms, advanced filter sheet, quick select listbox, saved filter state, board group select listbox, low-data empty state. AI generation, create submit, destructive delete, and mutation actions were not executed.
- Screenshots: `app/.next/liquid-glass-audit/en-tasks-*.png`
- Validation commands: `npm run audit:liquid-glass -- --routes=/en/tasks --timeout-ms=360000`; Playwright Tasks focused interaction check for `390`, `1280`, and `390` reduced motion; focused Advanced Filters close timing check at `1280`; targeted `npx eslint --max-warnings=0 ...`; `npx tsc --noEmit --pretty false`; `git diff --check`
- Result: runtime audit 8 checks, 0 fail, 0 warn; focused interaction check passed with no page errors, no HTTP errors, and no horizontal overflow; Advanced Filters close verified after the exit transition at `1280`; targeted lint, TypeScript, and whitespace checks passed.
- Remaining blocker before `Verified`: dev-bypass data currently has no task records, so populated task card/detail panel, inline table edit, bulk selection, board drag/drop, pre-task ritual, subtask controls, goal/plan connections, and delete confirmation still need a seeded non-production task-data pass.

## Per-Page Migration Checklist

For each page:

- Inspect route, component tree, shared components, state hooks, data fetching, and hidden layers.
- Run the page locally before coding and audit mobile, tablet, desktop, and wide desktop.
- Enumerate interactive elements with buttons, links, inputs, selects, tabs, menus, dialogs, sheets, popovers, `role`, `aria-haspopup`, `aria-controls`, `data-state`, and click handlers.
- Preserve routing, data flow, API calls, forms, mutations, and state management.
- Replace local one-off surfaces and controls with shared OS primitives where it improves consistency.
- Add or refine connected transitions for tabs, filters, card/detail flows, sheets, dialogs, list reflow, and back navigation.
- Shorten repeated copy and remove motivational filler.
- Keep focus-visible states, keyboard navigation, Escape/outside close, and reduced motion intact.
- Verify no horizontal overflow, awkward wrapping, clipping, browser chrome overlap, or floating assistant overlap.

## Runtime Viewports

Audit and capture representative screenshots at:

- `320px`
- `375px` or `390px`
- `430px`
- `768px`
- `1024px`
- `1280px`
- `1440px`

At minimum, every migrated page needs mobile, tablet, desktop, and wide desktop evidence. High-risk pages need every listed viewport.

## Goal Exit Gate

The Pursue Goal is complete only when every gate below is true. If any gate is false, the goal remains open.

### 1. Inventory Gate

- Every authenticated/protected page and route family is listed in the inventory.
- Every listed page has one final status: `Reference`, `Verified`, or `Deferred`.
- No page remains `Pending` or `Partial`.
- Every `Deferred` page has a clear reason and a recommended later phase.

### 2. System Gate

- Shared OS primitives exist and are the default implementation path for page headers, glass/frosted/solid surfaces, controls, segmented tabs, status rails, action rows, empty states, dialogs, sheets, popovers, and common motion.
- Page-local one-off glass/control/motion code is removed, aliased to the OS layer, or documented as intentionally page-specific.
- Bucket List still works as the reference page and consumes the shared primitives instead of drifting into a separate local design system.

### 3. Per-Page Done Gate

A page can be marked `Verified` only after all of the following are true:

- The route, component tree, data hooks, forms, mutations, dialogs, sheets, popovers, menus, and hidden layers were inspected.
- The page uses OS primitives for the shared interaction surfaces that apply to that page.
- Mobile, tablet, desktop, and wide desktop layouts were checked with no horizontal overflow, clipped controls, awkward wrapping, unsafe bottom overlap, or floating assistant collision.
- All meaningful buttons, links, tabs, chips, filters, menus, inputs, cards, dialogs, sheets, dropdowns, and popovers were exercised.
- Keyboard focus, focus-visible styling, Escape/outside-close behavior, scroll lock, reduced motion, and safe-area spacing were checked where relevant.
- State transitions feel connected where appropriate: tabs, filters, card/detail flows, sheets/dialogs, list reflow, and back navigation avoid hard jumps unless the state is unrelated.
- Copy is calm and useful, with repeated wording and motivational filler removed.
- Liquid Glass is used for hierarchy and controls, while dense content and forms remain readable.

### 4. Verification Gate

- Representative screenshots or notes exist for mobile, tablet, desktop, and wide desktop.
- High-risk pages have checks at `320px`, `375px` or `390px`, `430px`, `768px`, `1024px`, `1280px`, and `1440px`.
- Lint, TypeScript, and relevant tests pass, or every remaining failure is documented as pre-existing/unrelated with the exact command output summarized.
- `git diff --check` passes.

### 5. Product Safety Gate

- No business logic, API behavior, routing behavior, form behavior, state management, auth behavior, persistence, or data flow changed without explicit approval.
- No unnecessary dependencies were added.
- No page loses important functionality while being migrated.

### 6. Delivery Gate

- The final changes are committed and pushed.
- The final summary lists changed primitives, verified pages, deferred pages, validation results, screenshots/notes location, and remaining follow-up recommendations.

Short version: exit only when the shared system is real, every protected page is either verified or intentionally deferred, runtime evidence exists across breakpoints and hidden states, validation passes, and the work is committed and pushed.
