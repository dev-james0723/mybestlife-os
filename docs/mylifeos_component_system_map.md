# MyLifeOS Component System Map

## Component Inventory (66+ components)

### App Shell Components

| Component | Lines in Doc | Description | Props |
|-----------|-------------|-------------|-------|
| `AppLayout` | 1-321 | Main app layout with sidebar, top bar, floating chat | `children: ReactNode` |
| `FloatingChatButton` | 11307-11360 | Floating AI assistant chat overlay | None (self-contained) |

### Shared Primitive Components (shadcn/ui based)

Used across all pages. These come from shadcn/ui and should be preserved:

- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`, `CardFooter`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`
- `Button`, `Input`, `Label`, `Textarea`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `Badge`, `Separator`, `ScrollArea`, `Skeleton`
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`
- `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`
- `Popover`, `PopoverContent`, `PopoverTrigger`
- `Checkbox`, `Progress`, `Tooltip`
- `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`
- `Sidebar` family (14 sub-components)
- `Avatar`, `AvatarFallback`, `AvatarImage`
- `AgentChatSimple` (Blocks SDK specific -- needs replacement)

### Dashboard Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `StatCard` | 322-351 | Stat display card with icon | `title, value, icon, onClick?` |
| `UpcomingTaskCard` | 352-398 | Task card with priority/due date | `task, projectName?, onClick` |
| `StudySessionListItem` | 399-435 | Study session badge list item | `session, onClick` |
| `FavoriteNoteCard` | 436-475 | Note card for favorites | `note, onClick` |
| `DailyInspirationCard` | 6807-7178 | AI-generated daily inspiration with image | Complex state management |
| `MorningMotivationCard` | 7179-7338 | AI-generated morning motivation | Complex state management |

### Task Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `TaskDetailModal` | 476-967 | Full task CRUD modal with edit/delete | `task, onClose, onMoveToTomorrow?` |
| `PreTaskRitualModal` | 7555-7798 | AI-generated pre-task ritual display | Modal with ritual steps |
| `ImportTasksDialog` | 5974-6097 | Bulk task import dialog | Dialog with file input |

### Study Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `StudySessionDetailModal` | 968-1233 | Study session CRUD modal | `session, onClose` |
| `CreateStudySessionModal` | 3729-3902 | Create new study session | `open, onClose` |
| `StudySessionCard` | 5150-5208 | Study session display card | `session, onClick` |
| `StudyCalendar` | 5209-5482 | Calendar view for study sessions | `sessions, onDateClick` |

### Note Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `NoteDetailModal` | 1234-3552 | Full note CRUD modal (large -- 2300+ lines) | `note, onClose` |
| `CreateNoteModal` | 3553-3728 | Create new note | `open, onClose` |
| `NoteCard` | 5483-5607 | Note display card | `note, onClick` |
| `TagsDropdown` | 7339-7446 | Tag filter dropdown | `tags, selected, onChange` |

### Project Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `ProjectKanban` | 3903-4075 | Kanban board view for projects | `projects, onProjectClick` |
| `ProjectCalendar` | 4076-4452 | Calendar view for projects | `projects, onProjectClick` |
| `ProjectDetailModal` | 4453-5149 | Full project CRUD modal | `project, onClose` |

### Daily Planner Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `TimelineView` | 5608-5973 | Time-slot based daily schedule view | `startTime, endTime, tasks, selectedDate, allTasks, onTaskClick` |
| `ScheduleImageGenerator` | 6098-6387 | AI-powered schedule image with style selector | `planDate, startTime, endTime, tasks, persistedImageUrl?, onImageGenerated?` |
| `ImageZoomViewer` | 6388-6499 | Full-screen image zoom viewer | Image URL, onClose |
| `AISuggestionDialog` | 6500-6614 | AI task suggestion dialog | Dialog with suggestion list |
| `TemplateDialog` | 6615-6806 | Schedule template management | Template CRUD dialog |

### Goal Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `GoalCard` | 7799-7894 | Goal display card | `goal, onClick` |
| `CreateGoalModal` | 7895-8273 | Create new goal | `open, onClose` |
| `GoalDetailModal` | 8274-9017 | Full goal CRUD modal | `goal, onClose` |

### Knowledge Base Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `KnowledgeEntryCard` | 9018-9103 | Knowledge entry display card | `entry, onClick` |
| `CreateKnowledgeEntryModal` | 9104-9189 | Create new knowledge entry | `open, onClose` |
| `KnowledgeEntryDetailModal` | 9190-10105 | Full knowledge entry CRUD modal | `entry, onClose` |

### Weekly Review Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `WeeklyReviewDetailModal` | 10106-10496 | Weekly review CRUD modal | `review, onClose` |

### Role Model Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `RoleModelCard` | 10497-10552 | Role model display card | `model, onClick` |
| `RoleModelDetailModal` | 10553-10979 | Full role model CRUD modal | `model, onClose` |
| `CreateRoleModelModal` | 10980-11306 | Create new role model | `open, onClose` |

### Content Editing Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `RichTextEditor` | 11361-11543 | contentEditable-based rich text editor with toolbar | `value?, defaultValue?, onChange?, placeholder?, disabled?` |
| `PhotoUploadSection` | 11544-11779 | Image upload with drag-and-drop | `onUpload, currentImage?` |
| `OptimizedImage` | 16480-16533 | Lazy-loading image with skeleton | `src, alt, className?, fallback?, type?, aspectRatio?` |

### Gratitude Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `GratefulThingCard` | 11780-11848 | Gratitude entry display card | `entry, onClick` |
| `CreateGratefulThingModal` | 11849-12185 | Create new gratitude entry | `open, onClose` |
| `GratefulThingDetailModal` | 12186-12534 | Gratitude entry CRUD modal | `entry, onClose` |

### Relationship Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `RelationshipCard` | 12535-12660 | Relationship display card | `relationship, onClick` |
| `CreateRelationshipModal` | 12661-13033 | Create new relationship | `open, onClose` |
| `RelationshipDetailModal` | 13034-13406 | Relationship CRUD modal | `relationship, onClose` |

### Asset & Document Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `AssetCard` | 13407-13498 | Asset display card | `asset, onClick` |
| `DocumentCard` | 13499-13602 | Document display card | `document, onClick` |
| `CreateAssetModal` | 13603-13871 | Create new asset | `open, onClose` |
| `CreateDocumentModal` | 13872-14106 | Create new document | `open, onClose` |
| `AssetDetailModal` | 14107-14907 | Asset CRUD modal | `asset, onClose` |

### Habit Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `CreateHabitModal` | 14908-15143 | Create new habit | `open, onClose` |
| `CreateRoutineModal` | 15144-15384 | Create new routine | `open, onClose` |
| `HabitDetailModal` | 15385-15687 | Habit CRUD modal | `habit, onClose` |
| `RoutineDetailModal` | 15688-16034 | Routine CRUD modal | `routine, onClose` |
| `AIInsightsModal` | 16035-16304 | AI habit insights display | Modal with insights |
| `OptimizeRoutineDialog` | 16305-16479 | AI routine optimization | Dialog with suggestions |

### Career Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `BioVariantsSection` | 16534-16642 | Bio variant management | Section component |
| `GenerateBioSection` | 16643-16716 | AI bio generation trigger | Section component |
| `GenerateBioDialog` | 16717-16905 | AI bio generation dialog | Dialog with options |
| `AssetKitSection` | 16906-17058 | Career asset kit management | Section component |

### Software Vault Components

| Component | Lines | Description | Key Props |
|-----------|-------|-------------|-----------|
| `CreateSoftwareModal` | 17059-17682 | Create software entry with AI auto-fill, drag-and-drop icon upload | `open, onClose` |
| `SoftwareDetailModal` | 17683-18306 | Software entry CRUD modal | `software, onClose` |
| `OptimizationDialog` | 18307-18529 | AI tool stack optimization | Dialog with suggestions |
| `CompareAppsModal` | 18530-18759 | AI software comparison | Modal with comparison matrix |
| `RelatedResourcesSection` | 18760-19101 | Related resources display | Section component |

---

## Component Patterns Analysis

### Current Patterns (to preserve)

1. **Card + Detail Modal pattern**: Every entity has a Card (list item) and DetailModal (full CRUD)
2. **Create Modal pattern**: Separate modal for entity creation
3. **shadcn/ui foundation**: All UI primitives use shadcn/ui consistently
4. **Lucide icons**: Consistent icon library usage
5. **Toast notifications**: `sonner` toast for all user feedback

### Current Anti-Patterns (to fix in rebuild)

1. **Giant modals**: NoteDetailModal is 2300+ lines; should be split or converted to a page
2. **No shared CRUD abstraction**: Each entity reimplements create/update/delete logic
3. **No shared filter/sort pattern**: Each page builds its own filter UI from scratch
4. **Inconsistent modal vs. page pattern**: Everything is a modal, even content-heavy views
5. **No loading/error states**: Most components lack proper loading skeletons or error boundaries
6. **Tight SDK coupling**: All data operations use `useEntityGetAll`, `useEntityCreate`, `useEntityUpdate`, `useEntityDelete` directly in components

### Proposed New Patterns

1. **EntityCard** -- Generic card with slot-based layout (icon, title, subtitle, badges, actions)
2. **SlideOverPanel** -- Replace detail modals with slide-over panels for content-heavy views
3. **PageShell** -- Standard page layout with header, filters, content area, empty state
4. **useEntityCRUD** -- Custom hook abstracting Supabase CRUD + React Query caching
5. **FilterBar** -- Shared filter component with search, select, date range, view switcher
6. **DataView** -- Shared component switching between grid/list/table/kanban views
