# MyLifeOS Design Rebuild Strategy

## Design Vision

Transform MyLifeOS from a blocks-style builder tool collection into a **cohesive, mature personal operating system** with the visual quality and interaction design of products like Linear, Notion, or Arc Browser. The design should feel calm, focused, and intentional -- not busy or overwhelming.

---

## Design System Foundation

### Color System

```
Primary:      Indigo-based (brand identity, CTAs, active states)
Secondary:    Slate/Gray (text, borders, subtle backgrounds)
Accent:       Amber/Gold (AI features, premium feel)
Semantic:     Green (success), Red (error/overdue), Yellow (warning), Blue (info)
Surface:      White/Slate-50 (light) / Slate-900/950 (dark)
Muted:        Slate-100 (light) / Slate-800 (dark)
```

### Typography Scale

| Token | Size | Weight | Use Case |
|-------|------|--------|----------|
| `display` | 2xl (1.5rem) | Bold | Page titles |
| `heading` | lg (1.125rem) | Semibold | Section headers, modal titles |
| `subheading` | base (1rem) | Medium | Card titles, subsection headers |
| `body` | sm (0.875rem) | Normal | Body text, descriptions |
| `label` | sm (0.875rem) | Medium | Form labels, meta labels |
| `caption` | xs (0.75rem) | Normal | Timestamps, secondary info |

### Spacing Scale

| Token | Value | Use Case |
|-------|-------|----------|
| `page-padding` | 24px (p-6) | Main content area padding |
| `section-gap` | 32px (space-y-8) | Between major page sections |
| `card-gap` | 16px (gap-4) | Grid gap between cards |
| `field-gap` | 12px (space-y-3) | Between form fields |
| `inline-gap` | 8px (gap-2) | Between inline elements |
| `tight-gap` | 4px (gap-1) | Between icon and text |

### Border Radius

| Token | Value | Use Case |
|-------|-------|----------|
| `card` | 12px (rounded-xl) | Cards, panels |
| `button` | 8px (rounded-lg) | Buttons, inputs |
| `badge` | 9999px (rounded-full) | Badges, tags, avatars |
| `modal` | 16px (rounded-2xl) | Modals, dialogs |

### Shadow System

| Token | Value | Use Case |
|-------|-------|----------|
| `card` | shadow-sm | Default card shadow |
| `card-hover` | shadow-md | Card hover state |
| `panel` | shadow-lg | Slide-over panels, dropdowns |
| `modal` | shadow-xl | Modals, dialogs |

---

## Component Architecture

### Page Shell Pattern

Every feature page follows this structure:

```
PageShell
├── PageHeader
│   ├── Title (display typography)
│   ├── Description (body typography, muted)
│   └── Actions (primary CTA button)
├── FilterBar (optional)
│   ├── SearchInput
│   ├── FilterDropdowns (configurable)
│   ├── SortControl
│   └── ViewSwitcher (grid/list/table/kanban)
├── PageContent
│   ├── EmptyState (when no data)
│   └── DataView (grid/list/table/kanban based on ViewSwitcher)
└── SlideOverPanel (for detail views, triggered by card click)
```

### Component Hierarchy

```
Level 0: Design Tokens (colors, spacing, typography via Tailwind config)
Level 1: shadcn/ui Primitives (Button, Card, Dialog, Input, etc.)
Level 2: Shared Composites
  - PageShell, PageHeader, FilterBar, DataView
  - EntityCard, SlideOverPanel, EmptyState
  - AIActionButton, LoadingState, ErrorBoundary
  - StatusBadge, DateDisplay, UserAvatar
Level 3: Domain Components
  - TaskCard, ProjectCard, NoteCard, GoalCard, etc.
  - TaskDetailPanel, ProjectDetailPanel, etc.
  - CreateTaskForm, CreateProjectForm, etc.
Level 4: Page Components
  - DashboardPage, TasksPage, ProjectsPage, etc.
```

### New Shared Components (to build)

#### PageShell
Wraps every feature page. Provides consistent structure, spacing, and responsive behavior.

```tsx
<PageShell
  title="Tasks"
  description="Manage and track your tasks"
  actions={<Button>Create Task</Button>}
>
  <FilterBar filters={taskFilters} />
  <DataView
    data={tasks}
    renderCard={(task) => <TaskCard task={task} />}
    emptyState={<EmptyState icon={CheckSquare} message="No tasks yet" />}
  />
</PageShell>
```

#### FilterBar
Configurable filter bar shared across all list pages.

```tsx
<FilterBar
  search={{ placeholder: "Search tasks..." }}
  filters={[
    { key: "status", label: "Status", options: statusOptions },
    { key: "priority", label: "Priority", options: priorityOptions },
    { key: "project", label: "Project", options: projectOptions },
  ]}
  sort={{ options: sortOptions, default: "dueDate" }}
  viewModes={["grid", "list", "kanban"]}
  onFilterChange={handleFilterChange}
/>
```

#### EntityCard
Base card component with consistent layout slots.

```tsx
<EntityCard
  icon={<CheckSquare />}
  title="Task Title"
  subtitle="Project Name"
  badges={[<StatusBadge status="in-progress" />, <PriorityBadge priority="high" />]}
  meta="Due: Apr 15"
  onClick={handleClick}
  actions={[{ icon: Trash2, label: "Delete", onClick: handleDelete }]}
/>
```

#### SlideOverPanel
Slide-in panel from the right, replacing most detail modals.

```tsx
<SlideOverPanel
  open={isOpen}
  onClose={handleClose}
  title="Task Details"
  width="lg"
>
  <TaskDetailContent task={selectedTask} />
</SlideOverPanel>
```

#### EmptyState
Consistent empty state for all entity lists.

```tsx
<EmptyState
  icon={CheckSquare}
  title="No tasks yet"
  description="Create your first task to start organizing your work"
  action={{ label: "Create Task", onClick: handleCreate }}
/>
```

#### AIActionButton
Standardized AI action trigger with loading and result states.

```tsx
<AIActionButton
  label="Generate Insights"
  onExecute={handleGenerateInsights}
  resultRenderer={(result) => <InsightsDisplay data={result} />}
/>
```

---

## Interaction Patterns

### Three-Tier Content Interaction

| Tier | When | Component | Example |
|------|------|-----------|---------|
| Quick Action | < 5 fields, simple create | Modal (Dialog) | Create grateful thing, add asset |
| Standard View | View/edit moderate content | SlideOverPanel | Task detail, project detail, goal detail |
| Rich Content | Complex editing, long content | Dedicated page/route | Note editor, journal entry, about me |

### Navigation Improvements

1. **Command Palette** (Cmd+K): Quick page navigation, entity search, action execution
2. **Sidebar Favorites**: Pin frequently used pages to the top
3. **Breadcrumbs**: Show current location in page hierarchy
4. **Back/Forward**: Browser-style navigation within the app

### Mobile Patterns

1. **Bottom Sheet**: Replace modals on mobile
2. **Swipe Actions**: Quick actions on list items (complete task, favorite note)
3. **Pull to Refresh**: Standard refresh pattern
4. **Bottom Navigation**: Core pages accessible via bottom tab bar
5. **Collapsible Filters**: Filters hidden behind a toggle on mobile

---

## Page Redesign Priorities

### Tier 1: Foundation Pages (design first, build first)

1. **App Shell** -- Sidebar, top bar, responsive layout, command palette
2. **Dashboard** -- Hero stats, quick actions, recent activity feed
3. **Tasks** -- List/Kanban views, filter bar, task detail panel
4. **Projects** -- Kanban/list views, project detail panel

### Tier 2: High-Value Pages

5. **Daily Planner** -- Timeline view, template system, AI suggestions
6. **Notes** -- Grid/list views, rich text editing
7. **Goals** -- OKR view, progress tracking
8. **Journal** -- Emotion picker, AI integration

### Tier 3: Domain Pages

9. **Finance** -- Account overview, transaction list, savings goals
10. **Health** -- Dashboard with metric cards, logging
11. **Habits** -- Streak tracking, routine management
12. **Knowledge Base** -- Multi-view knowledge management

### Tier 4: Utility Pages

13. **Analytics** -- Charts, metrics, AI insights
14. **Settings** -- User preferences
15. **All remaining pages** -- Following established patterns

---

## Design Principles Checklist

For every page and component, verify:

- [ ] Uses `PageShell` for consistent layout
- [ ] Has a purposeful empty state
- [ ] Uses the defined typography scale
- [ ] Uses the defined spacing scale
- [ ] Has proper loading states (skeletons)
- [ ] Has error handling with user-friendly messages
- [ ] Is responsive (mobile, tablet, desktop)
- [ ] AI features use `AIActionButton` pattern
- [ ] Detail views use appropriate tier (modal/panel/page)
- [ ] Colors follow the semantic color system
- [ ] Cards use consistent padding and shadow
- [ ] Filters use shared `FilterBar` component
- [ ] Keyboard accessible (tab navigation, escape to close)
