# MyLifeOS Entities and Actions

## Data Entities (41 total)

### Productivity Domain

| Entity | Used In | Key Fields (from code analysis) |
|--------|---------|-------------------------------|
| `ProjectsEntity` | Dashboard, Projects, Tasks, DailyPlanner, Analytics, Goals, Notes, IdeasCapture, BusinessAnalyst, KnowledgeBase, RoleModels, Relationships, Journal | name, status, priority, dates |
| `TasksEntity` | Dashboard, Tasks, DailyPlanner, Analytics, IdeasCapture, Journal | taskTitle, dueDate, priority, status, project linkage |
| `DailyPlansEntity` | DailyPlanner, Analytics | planDate, startTime, endTime, tasks array, schedule image |
| `ScheduleTemplatesEntity` | DailyPlanner | template name, task list |
| `GoalsEntity` | Goals, KnowledgeBase, RoleModels | goal name, status, project linkage |
| `KeyResultsEntity` | Goals | key result name, target, progress, goal linkage |
| `WeeklyReviewsEntity` | WeeklyReview | review date, content |
| `ProductivityStatsEntity` | Analytics | aggregated metrics |

### Knowledge Domain

| Entity | Used In | Key Fields |
|--------|---------|------------|
| `NotesEntity` | Dashboard, Notes, BusinessAnalyst, KnowledgeBase, RoleModels | title, content, category, tags, favorite, project linkage |
| `KnowledgeEntriesEntity` | KnowledgeBase | title, content, project/goal/note linkage |
| `IdeasEntity` | IdeasCapture, TaskDetailModal | idea content, voice input, project/task linkage |
| `AIPromptsEntity` | AIKnowledge | prompt content, category, metadata |
| `AIWorkflowsEntity` | AIKnowledge | workflow definition |
| `AIMemoryEntity` | AIKnowledge | memory entries |
| `AIToolsStackEntity` | AIKnowledge | tool definitions |
| `TruthFiltersEntity` | AIKnowledge | filter rules |

### Self Domain

| Entity | Used In | Key Fields |
|--------|---------|------------|
| `AboutMeEntity` | AboutMe | instruction manual, core values, mission, personality, sections with rich text |
| `JournalEntriesEntity` | Journal | emotion quadrant, needs, content, project/task linkage |
| `GratefulThingsEntity` | Dashboard, MyGratefulThings | gratitude entry, date |
| `HabitsEntity` | Habits | habit name, frequency, streak |
| `RoutinesEntity` | Habits | routine name, habit ordering |
| `HabitLogsEntity` | Habits | log date, habit reference, completion |

### Health Domain

| Entity | Used In | Key Fields |
|--------|---------|------------|
| `SleepLogsEntity` | Health | date, duration, quality |
| `ExerciseLogsEntity` | Health | date, type, duration, intensity |
| `NutritionLogsEntity` | Health | date, meals, calories |
| `DailyCheckInsEntity` | Health | date, mood, energy, notes |
| `SymptomLogsEntity` | Health | date, symptom, severity |
| `MedicalInfoEntity` | Health | medical records, medications |

### Finance Domain

| Entity | Used In | Key Fields |
|--------|---------|------------|
| `FinanceAccountsEntity` | Finance | account name, type, balance |
| `FinanceCategoriesEntity` | Finance | category name, type (income/expense) |
| `FinanceTransactionsEntity` | Finance | amount, date, category, account, description |
| `FinanceSavingsGoalsEntity` | Finance | goal name, target, current, deadline |
| `FinancialSnapshotsEntity` | Finance | snapshot date, net worth, summaries |

### Resources Domain

| Entity | Used In | Key Fields |
|--------|---------|------------|
| `AssetsEntity` | Assets | asset name, category, value, location |
| `DocumentsEntity` | Documents | document name, type, expiration date |
| `SoftwareVaultEntity` | SoftwareVault | appName, websiteUrl, iconUrl, category, platforms, status, priority, costType, costAmount |
| `RoleModelsEntity` | RoleModels | name, project/goal/note linkage |
| `RelationshipsEntity` | Relationships | name, type (personal/professional), project linkage |

### Learning Domain

| Entity | Used In | Key Fields |
|--------|---------|------------|
| `JapaneseStudySessionsEntity` | Dashboard, JapaneseStudy | session date, duration, type, content |

### Research Domain

| Entity | Used In | Key Fields |
|--------|---------|------------|
| `MarketResearchEntity` | BusinessAnalyst | research topic, analysis, project/note linkage |

### Career Domain

| Entity | Used In | Key Fields |
|--------|---------|------------|
| `CareerAssetsEntity` | Career | bio variants, asset kit items |

### System Domain

| Entity | Used In | Key Fields |
|--------|---------|------------|
| `NotificationPreferencesEntity` | Settings | task reminders, daily summary, study streak reminders |

---

## AI Actions (29+ total)

### Productivity AI

| Action | Page | Input | Output | User Interaction |
|--------|------|-------|--------|-----------------|
| `GeneratePreTaskRitualAction` | Tasks, DailyPlanner | Task details | Pre-task ritual steps | Modal display before starting task |
| `SyncDailyPlanToGoogleCalendarAction` | DailyPlanner | Plan date, tasks, times | Calendar sync result | One-click sync button |
| `SuggestTasksForPlanningAction` | DailyPlanner | Current tasks, date | Suggested task list | AI suggestion dialog |
| `GenerateProductivityInsightsAction` | Analytics | Stats, tasks, projects, study sessions | Insight text | Display in analytics page |
| `GenerateScheduleImageAction` | DailyPlanner (ScheduleImageGenerator) | Plan date, times, tasks, style choice | Image URL | Style selector + generate button, image preview with zoom |

### Knowledge & Ideas AI

| Action | Page | Input | Output | User Interaction |
|--------|------|-------|--------|-----------------|
| `ProcessVoiceIdeaAction` | IdeasCapture | Voice recording | Transcribed idea text | Voice recording button |
| `SuggestIdeaLinksAction` | IdeasCapture | Idea content, projects, tasks | Suggested project/task links | Auto-suggestion after capture |
| `RunMarketResearchAction` | BusinessAnalyst | Research topic, project context | Analysis, infographic, audio | Generate button, multi-format output |
| Knowledge Base "Generate Review" | KnowledgeBase | Knowledge entry | Review recommendation | Action block trigger (699dc2401b87bd8ab0118a51) |

### Finance AI

| Action | Page | Input | Output | User Interaction |
|--------|------|-------|--------|-----------------|
| `ProcessReceiptImageAction` | Finance | Receipt image | Parsed transaction data | Camera/upload, auto-fill form |
| `ProcessVoiceExpenseAction` | Finance | Voice recording | Parsed expense entry | Voice recording button |
| `AnalyzeSpendingPatternsAction` | Finance | Transactions, date range | Pattern analysis | Analysis tab/button |
| `GenerateFinancialAdviceAction` | Finance | Financial data | Advice text | Generate button |
| `CalculateFinancialHealthScoreAction` | Finance | All finance data | Health score | Dashboard widget |
| `GenerateFinancialInfographicAction` | Finance | Financial data | Infographic image | Generate button |
| `GenerateSavingsGoalVisionAction` | Finance | Savings goal data | Vision board image | Generate on goal card |

### Self & Wellness AI

| Action | Page | Input | Output | User Interaction |
|--------|------|-------|--------|-----------------|
| `AnalyzeHabitPatternsAction` | Habits | Habit logs | Pattern insights | AI insights modal |
| `SuggestRoutineOrderAction` | Habits | Routine, habits | Optimized order | Optimize routine dialog |
| `GenerateWeeklyHabitInsightsAction` | Habits | Week's habit data | Weekly summary | AI insights modal |
| `GenerateHabitBackgroundImageAction` | Habits | Habit name/details | Background image | Generate on habit card |
| `GenerateJournalSummaryAction` | Journal | Journal entry | Summary text | Auto-generate after save |
| `GenerateQuickSummaryAction` | Journal | Journal entry | Quick summary | Quick action button |
| `GenerateJournalIllustrationAction` | Journal | Journal entry | Illustration image | Generate button |
| `GenerateJournalAudioCommentAction` | Journal | Journal entry | Audio file | Generate button |

### Software & Tools AI

| Action | Page | Input | Output | User Interaction |
|--------|------|-------|--------|-----------------|
| `AutoFillSoftwareMetadataAction` | SoftwareVault | App name, website URL, user notes | Full metadata (category, platforms, cost, features, icon) | Auto-fill button in create modal |
| `OptimizeToolStackAction` | SoftwareVault | Current software list | Optimization suggestions | Optimization dialog |
| `CompareSoftwareOptionsAction` | SoftwareVault | Two or more software entries | Comparison matrix | Compare modal |

### Career AI

| Action | Page | Input | Output | User Interaction |
|--------|------|-------|--------|-----------------|
| Generate Bio | Career | User profile, purpose | Bio text variants | Generate bio dialog |

### Chat Agent

| Agent | Page | Description |
|-------|------|-------------|
| `SecondBrainAssistantAgentChat` | AIAssistant, FloatingChatButton | Conversational AI assistant accessible from any page via floating button or dedicated page |

---

## Supabase Implications

### Entity Migration Checklist

Every entity needs:
- [ ] Supabase table definition with proper types
- [ ] `user_id` column with foreign key to `auth.users`
- [ ] RLS policy enforcing `auth.uid() = user_id`
- [ ] TypeScript type definition matching table schema
- [ ] Repository function (CRUD operations)
- [ ] Service function (business logic)
- [ ] React Query hooks for data fetching

### AI Action Migration Checklist

Every AI action needs:
- [ ] Supabase Edge Function implementation
- [ ] API key management via Supabase secrets
- [ ] Input/output type definitions
- [ ] Rate limiting consideration
- [ ] Error handling and fallback behavior
- [ ] User-facing loading state
- [ ] Result persistence (if applicable)

### Cross-Entity Relationships

```
Projects ──< Tasks (project has many tasks)
Projects ──< Notes (project has many notes)
Goals ──< KeyResults (goal has many key results)
Goals ──< Projects (goal links to projects)
DailyPlans ──< Tasks (plan references tasks)
Habits ──< HabitLogs (habit has many logs)
Routines ──< Habits (routine orders habits)
FinanceAccounts ──< FinanceTransactions
FinanceCategories ──< FinanceTransactions
JournalEntries ──< Projects (journal links to projects)
JournalEntries ──< Tasks (journal links to tasks)
Ideas ──< Projects (idea links to projects)
Ideas ──< Tasks (idea links to tasks)
KnowledgeEntries ──< Projects
KnowledgeEntries ──< Goals
KnowledgeEntries ──< Notes
RoleModels ──< Projects
RoleModels ──< Goals
RoleModels ──< Notes
Relationships ──< Projects
```
