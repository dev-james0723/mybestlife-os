# Calendar — Real-data swap points

This document enumerates every place where mock data or a mock AI call is
still used. When a real provider is ready, swap the **implementation** and
leave the **type contract** untouched — no UI change should be needed.

## Source mappers

All three source mappers are pure DB-row → CalendarSource shape. They are
already wired to live Supabase data via the existing domain hooks; the
only fallback to mock happens when all three sources are empty.

| Source      | File                                     | Current status                  |
|-------------|------------------------------------------|----------------------------------|
| Tasks       | `lib/calendar/sources/tasks.ts`          | LIVE — consumes `useTasks()`     |
| Milestones  | `lib/calendar/sources/milestones.ts`     | LIVE — consumes `useGoals()`     |
| Habits      | `lib/calendar/sources/habits.ts`         | LIVE — consumes `useHabits()` + `useAllCompletions()` (expanded per-day) |
| Reminders   | `hooks/use-calendar.ts` inline mapper    | DERIVED from tasks with `reminder_date` — introduce dedicated source if a `reminders` table ships |
| External    | n/a                                      | STUB — Google Calendar / Apple Calendar adapters not yet implemented. Add `lib/calendar/sources/google-calendar.ts` that returns `ExternalCalendarEvent[]`. |

### Swap recipe per source

Each source mapper already exposes a `mapXToY(rows)` function. When the
data shape changes (e.g. Supabase migration), update the mapper and its
contract in `lib/calendar/types.ts`. Call sites never change.

```ts
// Example: adding external calendar events
import { googleCalendarSource } from "@/lib/calendar/sources/google-calendar";

// in useCalendarItems():
const { data: externalRows } = useGoogleCalendarEvents();
const external = externalRows ? googleCalendarSource(externalRows) : [];
projectToCalendarItems({ tasks, habitOccurrences, milestones, reminders, external });
```

## AI layer

All four AI functions live in `lib/calendar/ai/index.ts`. Each returns a
typed payload and is called via `await aiFn(...)` from the UI. No UI
changes are needed when swapping to a real provider.

| Function            | Input                                  | Output                   | TODO note in code |
|---------------------|----------------------------------------|--------------------------|-------------------|
| `summarizeDay`      | `date, CalendarItem[]`                 | `DailySummary`           | `TODO: replace with Claude call` |
| `detectConflicts`   | `CalendarItem[]`                       | `ConflictWarning[]`      | `TODO: replace with Claude call` |
| `findFreeWindows`   | `date, CalendarItem[], workHours`      | `FreeWindow[]`           | Deterministic — no provider needed |
| `generatePlan`      | `date, unscheduledItems, freeWindows`  | `PlanSuggestion[]`       | `TODO: replace with Claude call` |

### Minimum viable prompt payload (for Claude / Gemini)

```json
{
  "date": "2026-04-23",
  "items": [
    { "id": "task:abc", "source_type": "task", "title": "Deep work — design doc",
      "start_time": null, "end_time": null, "priority": "urgent",
      "estimated_blocks": 12, "overdue": false }
  ],
  "day_load": "Focus-heavy",
  "free_windows": [{ "start": "14:00", "end": "16:00", "duration_minutes": 120 }]
}
```

Expected response shapes match `types.ts` 1:1 — the existing Zod
validators in `lib/ai/schemas/` can be used as a template for a new
`lib/ai/schemas/calendar/` folder.

## External integrations

| Integration        | Current state                                                                 |
|--------------------|-------------------------------------------------------------------------------|
| Google Calendar    | Daily Planner already has bi-directional sync. The `/calendar` surface only READS (projection) today. A future "Sync my calendar items to Google" action should live on the AI Plan tab — output: an iCal feed or Google events insert batch. |
| Apple Calendar     | Not started. The `ExternalCalendarEvent` type is ready; needs an adapter that reads `.ics` feeds. |
| Outlook            | Not started.                                                                  |

## Observability

The projection layer is pure and cheap. Consider adding per-source
timing (e.g. `performance.mark`) if users with large task backlogs
report frame drops in the Orbital view. The orbital animation alone
is ~60fps on mid-range laptops; the bottleneck on weak GPUs will be
the backdrop-filter on the outer `GlassPanel`s, not the SVG.

## Follow-up Cursor sessions (recommended)

The prompt's "cross-module wiring" sessions were deliberately scoped out
of this build per autonomous-mode rule #4. Suggested next sessions:

1. **Dashboard widget** — surface today's load + next item on the
   dashboard via a new `CalendarHint` block (uses `useCalendarItems()` +
   `buildDayContext()`).
2. **Journal ↔ Calendar** — link journal entries to their `CalendarItem`
   by date. A journal-day view can embed `<AgendaTab />` inline.
3. **Goals deep-link** — milestone tiles in Orbital / Complete should
   open the goal detail. Currently they're non-interactive.
4. **MindClear** — feed the daily summary into MindClear's morning
   prompt so it's aware of the day ahead.
