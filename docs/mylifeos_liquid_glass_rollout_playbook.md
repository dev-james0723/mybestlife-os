# MyBestLife OS Liquid Glass Rollout Playbook

## Design Read

MyBestLife OS is an authenticated personal operating system for life management. The default theme should feel like a calm, premium, mobile-first Liquid Glass product: useful before decorative, tactile without being flashy, and consistent without making every page look identical.

## Success Criteria Summary

The rollout exits only when the app-wide consistency system is complete enough to trust as a repeatable standard, not when a few pages look better.

Exit requires all of this to be true:

- Every protected page or route family is inventoried.
- Every inventory item has a final status of `Reference`, `Verified`, or `Deferred`.
- No item remains `Pending` or `Partial`.
- Every `Deferred` item has a reason and a later-phase recommendation.
- Shared OS primitives are used as the default path for headers, controls, segmented navigation, status rails, action rows, surfaces, dialogs, sheets, popovers, empty states, and motion.
- Each `Verified` page has runtime evidence across mobile, tablet, desktop, and wide desktop.
- Hidden states are checked, including modals, sheets, popovers, dropdowns, command surfaces, detail panels, empty states, error states, and loading states where reachable.
- Validation passes: TypeScript, lint for touched files, relevant tests, and `git diff --check`.
- No unapproved business logic, data flow, routing, auth, persistence, form, mutation, or API behavior changed.
- The final work is committed and pushed.

Do not exit if any page is only visually touched, only statically reviewed, blocked by an unaudited modal/sheet flow, missing responsive evidence, or still marked `Pending`/`Partial`.

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
| 1 | Calendar | Partial | Main tab switcher uses `OSSegmentedControl`; hidden tabs and month/detail layers still need audit. |
| 1 | Projects | Partial | Header actions and view switcher use OS controls; filters, dialogs, command palette, and views still need audit. |
| 1 | Dashboard | Partial | Header and floating AI action use OS primitives; empty states, cards, and assistant overlap still need runtime audit. |
| 1 | Daily Planner | Partial | Header actions, date controls, sync action, and planning-mode toggle use OS primitives; dialogs, popovers, boards, timeline, and mobile runtime audit remain. |
| 1 | Tasks | Partial | Header actions, create trigger, sort/view controls use OS primitives; filters, saved filters, dialogs, panels, and table view still need audit. |
| 2 | Goals | Partial | Parent create action and standard goal dialog controls use OS primitives; filters, cards, progress surfaces, and modal/sheet audit remain. |
| 2 | Bucket List Map | Partial | Shares Bucket List OS tokens; map/detail state needs post-system visual verification. |
| 2 | Relationship | Partial | Container sub-tabs use `OSSegmentedControl`; relationship cards, forms, AI sheets, and hidden layers still need audit. |
| 2 | Relationships | Deferred | Legacy redirect to `/relationship?tab=relationship`; UI is covered by the Relationship hub rollout. |
| 2 | Quote Library | Partial | Library tabs use `OSSegmentedControl`; search, settings popover, add quote flow, and empty states still need audit. |
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
| 4 | AI Assistant | Partial | Local chat shell, message bubbles, empty state, and send action use OS surface/action styling; keyboard send behavior and runtime responsive audit remain. |
| 4 | Analytics | Partial | Time lens uses `OSStatusRail`, refresh insight uses `OSControl`, and disabled range tooltips are preserved through the shared rail item API; chart controls, panels, dense visualizations, loading/partial-data states, and runtime readability audit remain. |
| 4 | Brain | Pending | Graph workspace needs special viewport and sheet checks. |
| 4 | Business Analyst | Partial | Stub page uses `OSEmptyState`; runtime responsive evidence still needed before verification. |
| 4 | Career and nested career pages | Pending | Large family covering dashboard, analytics, coach, compass, journal, network, pipeline, profile, timeline, vault detail/history/compare/bundles/shares/tags; migrate after relationship/resources patterns settle. |
| 4 | Garden | Pending | Thematic page; preserve distinct product voice. |
| 4 | Google Calendar | Partial | Connect card, navigation actions, and setup panel use OS surfaces/actions; OAuth edge states and runtime responsive audit remain. |
| 4 | Ideas | Pending | Audit sidebar, detail sheet, add modal, gallery transitions. |
| 4 | Japanese Study | Partial | Page create action, stat panels, empty state, create/edit/detail dialog shells, non-destructive dialog actions, and read-only detail surfaces use OS primitives; filter bar, entity cards, rich text editors, select/date controls, delete confirmation, and runtime mobile form audit remain. |
| 4 | Knowledge Software Vault | Pending | Coordinate with Software Vault patterns. |
| 4 | Mind Council | Pending | Audit advisor sheets, group council, skill creation modal. |
| 4 | Privacy | Partial | Policy content uses a solid OS reading surface and OS back control; long-text responsive/readability audit remains. |
| 4 | Quick Save setup/capture/success | Partial | Setup, success, missing-capture, and review shells/actions now use server-safe OS glass/control tokens; auth redirects, capture lookup, and server actions are unchanged. Share-sheet entry, disabled/error reasons, file previews, submit states, and mobile runtime audit remain. |
| 4 | Role Models | Deferred | Legacy redirect to `/relationship?tab=role-model`; UI is covered by the Relationship hub rollout. |
| 4 | Signals | Partial | Header view switcher, refresh/regenerate/settings controls, type filter rail, and advanced filter trigger use OS primitives; settings sheet, filter drawer, cards, table/compact/gallery views, loading/error/empty states, and runtime interaction audit remain. |
| 4 | Software Vault | Pending | Audit vault chrome, software dialogs, comparison/research flows. |
| 4 | Vault | Pending | Preserve themed vault door motion; audit gallery/detail modal. |
| 4 | Weekly Review | Partial | Page create action, empty state, create/edit/detail dialog shells, non-destructive dialog actions, and read-only detail surfaces use OS primitives; filter bar, card list, rich text editors, delete confirmation, and runtime dialog audit remain. |
| 4 | YouTube Radar | Partial | Stub page uses `OSEmptyState`; runtime responsive evidence still needed before verification. |

Every page must be marked as `Reference`, `Verified`, or `Deferred` with a reason before the rollout exits. `Pending` and `Partial` are in-progress states and cannot remain at exit.

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
