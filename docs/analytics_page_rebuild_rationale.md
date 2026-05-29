# Analytics Page Rebuild Rationale

## Purpose

This document explains the rationale, product direction, architecture, UI changes, and implementation sequence for rebuilding the `Analytics` page into a true Life OS control center.

The goal is not to create another dashboard. The Dashboard is for today. Analytics should reveal the user across time: progress, stagnation, repeating patterns, emotional load, system coherence, and the next best intervention.

The correct product answer is both:

1. Help the user feel and see real progress.
2. Help the user honestly face where progress is not happening.

A serious Life OS must do both. A page that only encourages becomes motivational decoration. A page that only criticizes becomes emotionally exhausting. The redesigned Analytics page should be a balanced mirror: warm enough to keep the user engaged, sharp enough to make blind spots visible.

---

## Existing Codebase Findings

### Current Analytics implementation

Current file:

```text
app/src/app/[locale]/(protected)/analytics/page.tsx
```

The current page reads:

- `useTasks()`
- `useProjects()`
- `useGoals()`
- `useJournalEntries()`
- `useJapaneseStudySessions()`

It then renders:

- 4 stat cards
- Task status bar chart
- Project status pie chart

This is too shallow for the Life OS vision. It mostly counts records. It does not explain trends, correlations, causes, bottlenecks, or system health.

### Existing data that can power the redesign

The codebase already contains enough infrastructure to support a much richer Analytics page.

Important existing sources:

```text
app/src/types/database.ts
app/src/hooks/use-tasks.ts
app/src/hooks/use-projects.ts
app/src/hooks/use-goals.ts
app/src/hooks/use-journal.ts
app/src/hooks/use-daily-plans.ts
app/src/hooks/use-brain-queries.ts
app/src/lib/brain/buildBrainData.ts
app/src/types/brain-graph.ts
app/src/components/ui/glass-panel.tsx
app/src/components/dashboard/glass-stat-card.tsx
app/src/components/dashboard/glass-entity-card.tsx
app/src/components/dashboard/glass-tint-panel.tsx
```

Existing useful data fields:

Tasks:

- `status`
- `priority`
- `due_date`
- `completed_at`
- `estimated_blocks`
- `tags`
- `project_id`

Projects:

- `status`
- `priority`
- `start_date`
- `end_date`
- `tags`
- `thumbnail_url`

Daily Plans:

- `plan_date`
- `start_time`
- `end_time`
- `tasks`
- `free_tasks`
- `mode`

Journal:

- `entryDate`
- `quadrant`
- `primaryEmotion`
- `secondaryEmotion`
- `intensity`
- `needs`
- `nextTinyStep`
- `projectIds`
- `taskIds`

Brain Engine:

- `BrainNode`
- `BrainEdge`
- `strength`
- `confidence`
- `reason`
- `sourceMethod`
- graph diagnostics including orphan count, orphan rate, component count, average degree, nodes by type, edges by type, and isolated nodes by domain.

The biggest missed opportunity is that Analytics currently does not use the Brain Engine deeply enough. The Brain Engine already understands cross-domain relationships. Analytics should surface that intelligence in a readable way.

---

## Product Definition

Rename the mental model from:

```text
Analytics Page
```

to:

```text
Life Pulse Center
```

The page should answer three questions immediately:

1. What state am I in right now?
2. Am I genuinely progressing, drifting, or overloading?
3. What should I adjust next?

This page should not feel like business intelligence software. It should feel like a living personal mirror.

---

## Core Design Principle

Every metric should include three layers:

1. **Signal**  
   The raw measurement.

2. **Meaning**  
   What the measurement probably says about the user's current life pattern.

3. **Intervention**  
   What action the user should consider next.

Example:

```text
Signal: 18 tasks completed this week.
Meaning: Execution volume is high, but 73% of completed tasks were unrelated to active goals.
Intervention: Move two low-value tasks out of this week and protect one deep-work block for the highest-priority project.
```

This is the key difference between a basic analytics page and a real Life OS.

---

## New Page Structure

### 1. Living Status Header

Purpose:

Show the user's current state in one glance.

Content:

- AI-generated life status sentence
- Time range selector
- Last updated indicator
- Refresh insight button
- 4 Life Pulse metrics

Suggested Life Pulse metrics:

1. `Completion Momentum`
   - Measures actual execution.
   - Based on completed tasks, completed plan items, project updates, study sessions, and weekly review entries.

2. `Focus Consistency`
   - Measures whether the user is moving in a coherent direction.
   - Based on task-to-project linkage, project-to-goal linkage, repeated daily plan focus, and low context switching.

3. `Emotional Load`
   - Measures emotional pressure.
   - Based on journal intensity, quadrant distribution, stress/energy health logs where available, and negative emotional clustering.

4. `System Coherence`
   - Measures how well the OS is connected.
   - Based on Brain graph density, orphan rate, project-task-goal linkage, and knowledge-to-project linkage.

Tone:

- Calm
- Direct
- Not over-positive
- Not brutal for no reason

Example UI copy:

```text
You are moving, but not fully aligned.
Execution improved this week, but emotional load and fragmented project focus suggest you may be pushing through pressure rather than building clean momentum.
```

---

### 2. Time Lens Control

Add a range switcher:

```text
3D | 7D | 30D | 2M | 6M | 1Y | 5Y | 10Y
```

Each range should change the page interpretation, not only the chart data.

Range behavior:

- `3D`: acute state, recent overload, immediate rhythm.
- `7D`: weekly execution, planning consistency, energy and emotional load.
- `30D`: habit pattern, project momentum, repeated bottlenecks.
- `2M`: whether the user is actually sustaining direction.
- `6M`: project survival, knowledge compounding, identity movement.
- `1Y`: life themes, major progress, recurring avoidance.
- `5Y / 10Y`: long-term identity evolution. These can initially show empty-state projections until enough historical data exists.

Implementation note:

For MVP, support `7D`, `30D`, `90D`, and `1Y` first. Keep the UI labels for longer ranges disabled or marked as `Coming soon` if data is insufficient.

---

### 3. Momentum Wave

Purpose:

Show whether the user is gaining or losing momentum over time.

Visualization:

- Recharts `AreaChart` or `ComposedChart`
- x-axis: date
- y-axis: daily activity score
- layers:
  - completed tasks
  - planned tasks
  - overdue tasks
  - study/practice minutes
  - journal emotional intensity as a subtle overlay

Interpretation examples:

```text
Your output rose sharply after Tuesday, but overdue pressure rose at the same time. This means you may be recovering by brute force, not by better planning.
```

```text
Low output and low emotional intensity suggest true rest, not avoidance.
```

---

### 4. Life Domain Radar

Purpose:

Show balance across life areas.

Suggested domains:

- Execution
- Career
- Knowledge
- Health
- Finance
- Relationships
- Creativity
- Reflection

Visualization:

- Recharts `RadarChart`

Score source examples:

- Execution: completed task ratio, overdue ratio, daily plan consistency.
- Career: active career projects, career events, career assets, applications, career mirror activity.
- Knowledge: knowledge items, notes, Brain graph connections, Japanese study sessions.
- Health: health goals, sleep/energy/mood logs.
- Finance: finance transactions, savings goal progress, budget activity.
- Relationships: relationship next actions, last contact recency.
- Creativity: ideas, notes, projects, media/resource creation.
- Reflection: journal entries, weekly reviews, gratitude entries.

Important:

The radar chart should not imply that every domain must be equal. It should reveal imbalance and explain whether that imbalance is intentional or harmful.

---

### 5. Project Momentum Map

Purpose:

Show all active projects as living organisms.

Each project card should show:

- Project name
- Status
- Priority
- Linked tasks count
- Completed tasks in selected range
- Overdue tasks
- Last meaningful activity date
- Momentum state

Suggested project states:

```ts
export type ProjectMomentumState =
  | "accelerating"
  | "steady"
  | "quiet"
  | "stuck"
  | "overloaded"
  | "ready_to_finish";
```

Examples:

- `accelerating`: recent task completions and updates are increasing.
- `steady`: activity is consistent without overload.
- `quiet`: no meaningful update for X days.
- `stuck`: active project with overdue tasks and no completion.
- `overloaded`: too many urgent/high priority tasks attached.
- `ready_to_finish`: most linked tasks complete and project has recent activity.

UI:

- Glass cards
- Small progress rings
- Soft animated pulse for active projects
- Muted warning glow for stuck/overloaded projects

Avoid:

- Loud red everywhere
- Shame-based UI
- Too much text

---

### 6. Emotion × Execution Heatmap

Purpose:

Reveal the relationship between emotional state and execution.

Data sources:

- Journal entries
- Task completions
- Daily plans
- Health daily logs where available

Visualization:

- Calendar-like heatmap
- Each cell is a date
- Fill intensity based on emotional load or activity volume
- Small overlay marker for completed tasks
- Click a date to inspect:
  - journal emotion
  - completed tasks
  - planned tasks
  - unfinished tasks
  - AI note about that day

Interpretation examples:

```text
High emotional intensity did not stop execution this week, but it changed the type of work you completed. You finished many small tasks and avoided deep project work.
```

```text
Your strongest execution day happened after a low-intensity journal day. Recovery appears to improve focus more than pressure does.
```

This is one of the most important features because it makes the app feel like it understands the user as a human, not only as a productivity machine.

---

### 7. Brain Health Panel

Purpose:

Show whether the user's Life OS is becoming more connected or more fragmented.

Data source:

Use `buildBrainDataRich()` and graph diagnostics.

Metrics:

- Total nodes
- Total edges
- Orphan rate
- Average degree
- Top connected domains
- Isolated domains
- Suggested missing links

UI:

- Mini constellation preview
- Domain chips
- Orphan warning list
- Suggested connection cards

Example insight:

```text
Your Knowledge Base is growing, but 41% of new knowledge items are not connected to projects, goals, or tasks. This means your learning is accumulating, but not yet converting into execution.
```

This is exactly where Analytics becomes a control center instead of a report page.

---

### 8. AI Intervention Panel

Purpose:

Turn analytics into action.

The AI panel should generate:

1. `What improved`
2. `What is not improving`
3. `Hidden pattern`
4. `Next best move`
5. `One thing to stop doing`
6. `One thing to protect`

Example:

```text
What improved:
You completed more tasks and kept your study rhythm alive.

What is not improving:
Your active projects are still too scattered. Several completed tasks do not connect to your highest-priority goals.

Hidden pattern:
You use small productivity wins to avoid emotionally heavier work.

Next best move:
Choose one project and define a 72-hour execution block with no more than three outcomes.
```

This is where the `both` answer matters. The panel should celebrate real progress and confront false progress.

---

## Visual System

Use the existing Liquid Glass system.

Required components:

```text
GlassPanel
GlassStatCard
GlassEntityCard
GlassTintPanel
```

Do not use the plain `Card` component as the main visual surface for the rebuilt Analytics page unless there is a specific reason.

Design rules:

1. Use translucent panels with layered depth.
2. Use subtle blur and saturation through existing CSS variables.
3. Use motion to show state change, not decoration.
4. Reduce text density.
5. Every chart should have a short AI-readable interpretation.
6. Charts should breathe with spacing. Avoid cramped dashboard grids.
7. Mobile layout should stack in a meaningful reading order:
   - status summary
   - pulse metrics
   - time lens
   - momentum wave
   - AI intervention
   - project map
   - emotion heatmap
   - brain health

Animation:

Use `framer-motion` lightly:

- Fade/slide cards on first load
- Animate range switch transitions
- Animate progress rings
- Use subtle pulse only for active living signals
- Respect reduced-motion preferences

Avoid:

- Overly playful animations
- Constant movement that distracts from thinking
- Crypto-dashboard neon aesthetics

---

## Recommended File Structure

Create:

```text
app/src/lib/analytics/types.ts
app/src/lib/analytics/date-range.ts
app/src/lib/analytics/compute-life-pulse.ts
app/src/lib/analytics/compute-project-momentum.ts
app/src/lib/analytics/compute-domain-radar.ts
app/src/lib/analytics/compute-emotion-execution.ts
app/src/lib/analytics/build-ai-analytics-context.ts
app/src/hooks/use-life-analytics.ts
app/src/components/analytics/LivingStatusHeader.tsx
app/src/components/analytics/TimeLensControl.tsx
app/src/components/analytics/LifePulseCards.tsx
app/src/components/analytics/MomentumWaveChart.tsx
app/src/components/analytics/LifeDomainRadar.tsx
app/src/components/analytics/ProjectMomentumMap.tsx
app/src/components/analytics/EmotionExecutionHeatmap.tsx
app/src/components/analytics/BrainHealthPanel.tsx
app/src/components/analytics/AIInterventionPanel.tsx
app/src/components/analytics/AnalyticsControlCenter.tsx
app/src/app/api/analytics/insight/route.ts
```

Optional but recommended:

```text
app/supabase/migrations/YYYYMMDDHHMMSS_create_analytics_snapshots.sql
app/src/lib/repositories/analytics-snapshots.ts
app/src/hooks/use-analytics-insight.ts
```

---

## Analytics Snapshot Table

Create a snapshot system so AI insights are not regenerated on every render.

Suggested table:

```sql
create table if not exists analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  range_start date not null,
  range_end date not null,
  range_type text not null,
  metrics_json jsonb not null default '{}'::jsonb,
  ai_summary text,
  ai_recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, range_start, range_end, range_type)
);

alter table analytics_snapshots enable row level security;

create policy "Users can view own analytics snapshots"
  on analytics_snapshots for select
  using (auth.uid() = user_id);

create policy "Users can insert own analytics snapshots"
  on analytics_snapshots for insert
  with check (auth.uid() = user_id);

create policy "Users can update own analytics snapshots"
  on analytics_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Rationale:

- Faster page loads.
- Lower AI cost.
- Historical insight tracking.
- Ability to show how the AI's interpretation of the user's life changes over time.

---

## Metric Computation Model

### Completion Momentum

Inputs:

- completed tasks in range
- completed planned items
- study minutes
- project updates
- overdue task pressure

Formula should be transparent and adjustable.

Suggested MVP scoring:

```ts
completionMomentum = clamp(
  completedTaskScore * 0.4 +
  dailyPlanCompletionScore * 0.25 +
  studyConsistencyScore * 0.15 +
  projectActivityScore * 0.2 -
  overduePenalty,
  0,
  100
);
```

### Focus Consistency

Inputs:

- percentage of tasks linked to projects
- percentage of projects linked to goals where possible
- number of active projects
- task distribution across projects
- repeated focus themes in daily plans

High active project count should reduce focus score unless the projects have clear separation and momentum.

### Emotional Load

Inputs:

- journal intensity average
- high-intensity journal frequency
- quadrant distribution
- stress and energy logs where available
- number of emotionally loaded tasks/projects if linked

This score should be interpreted carefully. High emotional load is not always bad. Sometimes it means the user is processing important material. The AI summary should distinguish between productive emotional processing and destructive overload.

### System Coherence

Inputs:

- Brain graph orphan rate
- average node degree
- project-task links
- goal-project links
- knowledge-project links
- journal/task/project links

A coherent system means information is not just stored. It is connected and actionable.

---

## AI Prompt Requirements for the Insight API

The AI should receive structured metrics, not raw full database rows.

The prompt should force the AI to produce:

```ts
{
  summary: string;
  progress: string[];
  blindSpots: string[];
  hiddenPattern: string;
  nextBestMove: string;
  stopDoing: string;
  protect: string;
  confidence: "low" | "medium" | "high";
}
```

Tone requirements:

- Direct
- Calm
- No motivational fluff
- No over-praising
- No shame language
- Explain uncertainty when data is limited
- Distinguish real progress from fake progress

---

## Implementation Sequence

### Phase 1: Replace visual shell

1. Replace the current plain `PageShell + Card` layout with a custom Analytics page layout using `GlassPanel`.
2. Keep the existing data queries first to avoid breaking behavior.
3. Add `TimeLensControl` UI but initially support only `7D`, `30D`, and `90D`.
4. Replace existing stat cards with `LifePulseCards`.

Acceptance criteria:

- Page looks visually consistent with Liquid Glass.
- Existing metrics still render.
- No data regression.
- Mobile layout is clean.

### Phase 2: Build analytics computation layer

1. Create `app/src/lib/analytics/types.ts`.
2. Create date-range utilities.
3. Create metric computation helpers.
4. Create `useLifeAnalytics(range)` hook.
5. Move all heavy `useMemo` logic out of the page component.

Acceptance criteria:

- Page component becomes mostly composition.
- Metrics are reusable and testable.
- Each score has a transparent explanation.

### Phase 3: Add visualizations

Add:

- `MomentumWaveChart`
- `LifeDomainRadar`
- `ProjectMomentumMap`
- `EmotionExecutionHeatmap`
- `BrainHealthPanel`

Acceptance criteria:

- Every visualization has a short interpretation line.
- No chart is decorative only.
- Empty states are useful and explain what data is missing.

### Phase 4: Add AI insights

1. Create `/api/analytics/insight`.
2. Build AI context from computed metrics.
3. Return structured JSON.
4. Render in `AIInterventionPanel`.
5. Add manual refresh.

Acceptance criteria:

- AI identifies progress and blind spots.
- AI output is not generic.
- AI output degrades gracefully when data is limited.

### Phase 5: Add analytics snapshots

1. Create Supabase migration.
2. Add repository.
3. Cache generated insight by range.
4. Show last generated time.

Acceptance criteria:

- Insights persist across reloads.
- Manual refresh updates snapshot.
- Historical snapshots can later power long-term comparison.

---

## Cursor Implementation Rules

When implementing this rebuild, follow these rules:

1. Do not rewrite unrelated pages.
2. Do not remove existing hooks unless replacing them with a safer abstraction.
3. Keep all new analytics logic in `lib/analytics` and `components/analytics`.
4. Keep the page component clean and readable.
5. Use existing Liquid Glass components before creating new design primitives.
6. Use Recharts because it is already installed.
7. Use Framer Motion subtly because it is already installed.
8. Every metric must have an explanation.
9. Every AI insight must be grounded in computed metrics.
10. Empty states should tell the user what data is needed to unlock that insight.
11. The UI must not become text-heavy.
12. The page must be useful even before all modules have rich data.

---

## What Not To Build

Do not build:

- A generic business dashboard.
- A noisy chart wall.
- A motivational quote page.
- A clone of the existing Dashboard.
- A page that only counts database rows.
- AI summaries that say vague things like “keep going” or “you are doing great.”

The Analytics page must be sharper than that.

---

## Final Product Standard

The rebuilt Analytics page should make the user think:

```text
I can see my progress.
I can see my blind spots.
I can see how my projects, emotions, knowledge, and habits are connected.
I know what to adjust next.
```

That is the standard. Anything less is not worth the rebuild.
