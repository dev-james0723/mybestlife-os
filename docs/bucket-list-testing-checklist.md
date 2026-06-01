# Bucket List Dream OS — Testing Checklist

Use this checklist for Phase 9 regression and future Bucket List releases.

## Setup

- Sign in as a normal authenticated user.
- Verify the Bucket List route loads at `/bucket-list` and localized `/en/bucket-list`.
- Test with both light and dark themes.
- Test desktop, tablet, and mobile widths.
- Enable OS/browser reduced motion and reload the page.

## Core Regression

- Create a dream manually from **Add Manually**.
- Create a dream through **Add Dream with AI**; confirm the AI draft is editable and is not
  saved until Save is clicked.
- Edit "why this matters" in the Detail Hub and verify persistence after reload.
- Toggle featured state and verify the Featured Rail updates.
- Delete/archive a dream only after explicit confirmation.
- Filter by type/status/search and switch grid/list view.
- Verify the Realized strip appears only for completed dreams.
- Mark a dream completed and add a reflection.

## Visuals

- Upload an inspiration image and confirm it appears in the gallery.
- Set an uploaded image as cover and verify card/detail cover persistence.
- Generate a dream visual; confirm it lands in the gallery for review without a visible
  generated/AI badge and does not silently become the cover.
- Apply AI image analysis caption/updates only from the review panel's explicit buttons.
- Remove a gallery image and verify it disappears after reload.

## Dream Intelligence

- Open Dream Intelligence for a dream with no cached report and generate one manually.
- Close/reopen the dialog and confirm cached data is shown without a repeated AI call.
- Force refresh and verify quota/error states are handled.
- Check readiness score, blockers, smallest version, next step, and suggested connections.
- Verify suggestions open confirm-first flows rather than executing writes.

## Activation Engine

- Generate an activation plan.
- Deselect several preview rows and confirm only selected rows are created.
- Confirm Project/Task/Savings/Note writes use real repositories and persist.
- Confirm calendar and knowledge suggestions persist only as Bucket integration rows/resource
  links unless a real follow-up flow is added.
- Verify dream soft links (`linked_project_id`, `linked_task_ids`,
  `linked_savings_goal_id`) update after confirmation.

## Travel Explorer

- Generate a destination brief and verify the "AI research — verify before booking" notice.
- Generate a trip plan and verify the same travel verification notice.
- Refresh flight watch and verify built-in prices are labeled estimates, not live fares.
- Confirm mock quotes are stored as `mode = 'exploratory'`.
- Confirm no mock quote populates `bucket_items.latest_live_price`.
- Verify map fallback when Google Maps keys are missing.
- Verify Google Map lazy-loads when keys are configured.

## Memory

- Create a reflection for a completed dream using user-authored text.
- Generate a memory interpretation and confirm it is saved only after Save.
- Verify no completed memory appears without a reflection row.
- Verify memory timeline ordering and photo gallery rendering.

## Accessibility And Motion

- Navigate cards, dialogs, tabs, and action buttons by keyboard.
- Confirm focus rings are visible and dialogs trap focus.
- Confirm reduced motion disables large entrance/parallax movement.
- Confirm badges/status treatments include icons/text and do not rely on color only.
- Check card image text contrast on light and dark themes.

## Performance

- Confirm no AI route is called on initial page render.
- Confirm Dream Intelligence uses cached `bucket_dream_ai_reports`.
- Confirm large image galleries scroll smoothly.
- Confirm mobile grid/list scrolling remains smooth.
- Confirm maps do not block initial page load.

## Commands

Run from repo root:

```bash
npm run lint --prefix app
npm run test --prefix app
npm run build --prefix app
```

Document any failures with file/test names and whether they are Bucket List related.
