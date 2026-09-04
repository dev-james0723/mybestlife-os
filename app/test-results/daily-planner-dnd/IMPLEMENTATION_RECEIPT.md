# Daily Planner drag-and-drop implementation receipt

Initial implementation: 2026-09-03 (America/Indiana/Indianapolis)
Opaque-card follow-up validated: 2026-09-04 (America/Indiana/Indianapolis)
Corner-bleed follow-up validated: 2026-09-04 (America/Indiana/Indianapolis)

Status: IMPLEMENTED_AND_VALIDATED

## Delivered behavior

- Desktop Time Block tasks drag from a dedicated handle with a 5 px mouse threshold.
- Mobile tasks activate after a 250 ms long press with 8 px tolerance; normal vertical gestures on the card body remain page scroll gestures.
- Closed mobile task cards use an opaque foreground (`rgb(255, 255, 255)` in light mode and solid slate in dark mode), so the four hidden swipe actions do not bleed through.
- The visible mobile row keeps its 14 px outer radius, while the hidden action panel is inset by 1 px with a concentric 13 px radius. The closed foreground has a square overscanning right edge, so the red delete layer cannot enter the anti-aliased outer corner pixels.
- The drag preview is portaled to `document.body`, avoiding offsets from transformed planner containers.
- Drop motion is short and reduced-motion aware; the final row order and derived time ranges update together.
- Keyboard users can focus the handle and use Space, Arrow keys, and Space to reorder while retaining focus.
- Free Plan same-bucket moves use insertion semantics: A dropped on B becomes B,A; B dropped on E becomes A,C,D,E,B.
- Reorders save immediately, use stable persisted `plannerTaskId` values, survive hydration/refetch and reload, and cannot be cancelled by a pending save for another date.
- Plan saves are serialized; Google Calendar follow-up refreshes are debounced and single-flight.
- A schedule-image response generated for an obsolete date/order is discarded rather than overwriting the current plan.

## Runtime browser validation

Command:

```bash
node --check scripts/verify-daily-planner-dnd.mjs && node scripts/verify-daily-planner-dnd.mjs
```

Result: PASS, 4/4 journeys, Google Chrome, no page runtime errors.

- Desktop 1280x900: Task A moved below Task B; activation 280 ms; reordered UI visible in 281 ms; order B,A,C,D,E persisted and survived reload.
- Mobile 390x844 card body: computed closed-card background was `rgb(255, 255, 255)` and transform was `none`; the wrapper/card widths were 324/326 px; the hidden panel was inset 1 px on its top, right, and bottom; page scrolled 135 px; task order stayed unchanged; the rendered screenshot has no red edge or corner bleed.
- Mobile 390x844 handle: Task B moved to the Task E position; activation 318 ms; reordered UI visible in 184 ms; page scroll delta 0 px.
- Keyboard: Space, ArrowDown, Space moved Task B below Task C and focus stayed on the moved handle.
- Post-drop assertions also verified the recomputed ranges: A at 9:20-9:40 after the mouse move, B at 10:20-10:40 after the mobile move, and B at 9:40-10:00 after the keyboard move.

Machine-readable evidence: `test-results/daily-planner-dnd/receipt.json`

Screenshots:

- `test-results/daily-planner-dnd/desktop-mouse-drag-active.png`
- `test-results/daily-planner-dnd/desktop-mouse-after-drop.png`
- `test-results/daily-planner-dnd/mobile-body-scroll.png`
- `test-results/daily-planner-dnd/mobile-long-press-drag-active.png`
- `test-results/daily-planner-dnd/mobile-long-press-after-drop.png`
- `test-results/daily-planner-dnd/desktop-keyboard-after-drop.png`

## Automated validation

Focused test command:

```bash
npx vitest run src/lib/daily-planner/keyed-save-timers.test.ts src/lib/daily-planner/schedule-image-request-key.test.ts src/hooks/use-daily-plans.test.ts src/components/daily-planner/free-plan-board.test.ts src/lib/daily-planner/reorder-time-block-tasks.test.ts src/lib/daily-planner/plan-schedule-math.test.ts src/components/daily-planner/sortable-task-list.test.tsx
```

Result: PASS, 7 files and 18 tests.

Other checks:

- `npm run build`: PASS; production Next.js build completed all 192 static pages and included `/[locale]/daily-planner`.
- `npx next build --webpack --debug-build-paths='src/app/[locale]/(protected)/daily-planner/page.tsx'`: PASS after the opacity change, including TypeScript and route-focused production compilation.
- The production build was not rerun after the final corner-only CSS class refinement because the shared Next dev server currently owns `.next`; the stronger 390x844 rendered-browser check and all focused tests were rerun after that final change.
- Full-source TypeScript check excluding corrupted generated `.next/dev/types`: PASS.
- Focused ESLint: PASS with 0 errors and one existing `@next/next/no-img-element` warning in `visual-schedule-generator.tsx`.
- `git diff --check`: PASS.
- `node --check scripts/verify-daily-planner-dnd.mjs`: PASS.
- Full repository suite: 130 files / 757 tests passed; three unrelated pre-existing/environment-sensitive tests remained failing (OS Buddy reminder timing, Document Oracle parser fixture, and Google Calendar timezone encoding).

## Relevant implementation files

- `src/components/daily-planner/sortable-task-list.tsx`
- `src/components/daily-planner/free-plan-board.tsx`
- `src/app/[locale]/(protected)/daily-planner/page.tsx`
- `src/hooks/use-daily-plans.ts`
- `src/components/daily-planner/visual-schedule-generator.tsx`
- `src/lib/daily-planner/reorder-time-block-tasks.ts`
- `src/lib/daily-planner/keyed-save-timers.ts`
- `src/lib/daily-planner/schedule-image-request-key.ts`
- `src/lib/daily-planner/plan-schedule-math.ts`
- `scripts/verify-daily-planner-dnd.mjs`

The matching focused tests live beside these modules. Existing concurrent Daily Planner/Adaptive Plan work in the dirty workspace was preserved; no unrelated edits were reverted.

## Not done / residual risk

- No commit, push, deployment, production database action, or external Google Calendar write was performed.
- Browser validation used the project's dev-login localStorage path with deterministic fixtures; the production bundle itself was validated by `npm run build`.
- The unrelated full-suite failures above remain outside this drag-and-drop scope.

Next action: review the browser evidence, then commit/deploy through the normal project workflow if desired.
