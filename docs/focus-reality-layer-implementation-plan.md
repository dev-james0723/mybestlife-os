# Focus & Reality Layer Implementation Plan

Source spec: `/Volumes/KINGSTON/rize-inspired-focus-reality-layer-spec.md`

## Routing

- Skills used: `next-best-practices`, `supabase`, `frontend-design`.
- Primary surface: Daily Planner.
- Secondary surfaces: protected app shell/navigation, Settings, Analytics.
- Execution state: local implementation. Database changes are represented as migration files; no remote `db push` is executed without explicit confirmation.

## Current Research Notes

- Supabase changelog check completed on 2026-06-07. The relevant breaking change is "Tables not exposed to Data and GraphQL API automatically" from 2026-04-28, so new public tables should include explicit grants for authenticated browser access in addition to RLS.
- Current Supabase RLS docs still recommend enabling RLS on public tables, indexing policy columns such as `user_id`, filtering queries by `user_id`, and using `(select auth.uid()) = user_id` in policies for better performance.
- Rize's own changelog confirms its distraction blocker is reminder/friction based, with user-controlled options to return, disable/continue, or end a session. This supports the spec's non-punitive Distraction Gate approach.

## Build Order

1. Database and types
   - Add `focus_preferences`, `planner_focus_sessions`, `planner_stimulation_events`, `daily_plan_quality_reports`, and `daily_plan_reviews`.
   - Add RLS, indexes, grants, ownership policies, and updated-at triggers.
   - Add explicit TypeScript row/domain types in `app/src/types/database.ts`.

2. Pure focus/reality engine
   - Add task classification.
   - Add stimulation scoring.
   - Add plan-quality scoring with deterministic fallback.
   - Add review metrics and daily review draft generation.
   - Add focused Vitest coverage for the scoring and metrics modules.

3. Repositories
   - Add one repository per new table.
   - Support Supabase and dev login localStorage fallback.
   - Normalize malformed localStorage data without crashing.
   - Enforce one active local focus session.

4. Hooks and state
   - Add React Query hooks for preferences, sessions, stimulation events, plan quality, reviews, and active session.
   - Add a lightweight focus session store for active session events.
   - Add low-stimulation mode hook that toggles the root class.

5. AI routes
   - Add `/api/ai/planner-quality`, `/api/ai/planner-improve`, and `/api/ai/planner-review`.
   - Use Gemini helper patterns when configured.
   - Keep deterministic fallback usable when AI is unavailable.

6. Daily Planner UI
   - Add Today Focus Strip, Plan Quality Drawer, Start Focus Session Sheet, Active Focus Dock, Finish Focus Session Sheet, Distraction Gate Dialog, and End-of-Day Review Drawer.
   - Wire time-block and free-planning mode.
   - Add Actual Timeline Overlay without making planned blocks secondary.
   - Keep `page.tsx` as high-level composition.

7. Global behavior
   - Add Low-Stimulation CSS.
   - Gate high-stimulation protected routes during active focus.
   - Log gate decisions.

8. Settings and Analytics
   - Add Focus & Low-Stimulation settings backed by `focus_preferences`.
   - Add Focus & Reality analytics using `daily_plan_reviews`, with session fallback where needed.

9. i18n and accessibility
   - Add required Daily Planner copy keys across existing locale pattern.
   - Avoid hardcoded English in UI components.
   - Ensure dialogs/sheets have labels, titles, countdown announcement, and mobile-safe layouts.

10. Validation
   - Run focused tests for pure modules.
   - Run `npx tsc --noEmit` and `npm run lint` in `app`.
   - Start local dev server and inspect Daily Planner desktop/mobile primary flows.

## Known Constraints

- Existing worktree has unrelated dirty files under knowledge components and Playwright/browser profile artifacts. Do not revert them.
- The Daily Planner page is already large; added page changes should remain compositional.
- Google Calendar constraints should reuse existing planner sync state and not duplicate sync logic.
- No surveillance features: no device/app tracking, keystrokes, screenshots, or external browser tab monitoring.
