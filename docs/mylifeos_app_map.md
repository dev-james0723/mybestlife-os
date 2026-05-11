# MyLifeOS App Map

## Overview

MyLifeOS is a comprehensive personal operating system with 27 pages organized into 8 navigation categories. The app provides tools for productivity, self-development, knowledge management, health tracking, finance, and AI-powered assistance.

## Navigation Structure

### 1. Command Center

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Central hub with stat cards, upcoming tasks, recent study sessions, favorite notes, morning motivation, daily inspiration, AI-powered grateful things |
| Daily Planner | `/daily-planner` | Time-blocking planner with drag-and-drop tasks, template management, Google Calendar sync, AI task suggestions, schedule image generator |
| Tasks | `/tasks` | Task management with list/calendar views, extensive filtering/sorting, AI pre-task ritual generation |
| Weekly Review | `/weekly-review` | Structured weekly review entries |
| Google Calendar | `/google-calendar` | Embedded Google Calendar view |
| Analytics | `/analytics` | Productivity metrics across tasks, projects, study sessions with AI-generated insights |

### 2. Self

| Page | Route | Description |
|------|-------|-------------|
| About Me | `/about-me` | Personal profile with instruction manual, core values, mission, personality insights, rich text editing, image upload |
| My Grateful Things | `/grateful-things` | Gratitude journal for capturing and reviewing entries |
| Health | `/health` | Multi-tab health dashboard: sleep, exercise, nutrition, daily check-ins, symptoms, medical info |
| Habits & Routines | `/habits-routines` | Habit tracking with streaks, routine management, logging, AI pattern analysis and insights |
| Journal | `/journal` | Emotional processing journal with four-quadrant emotion picker, needs tracking, AI summary/illustration/audio |

### 3. Career

| Page | Route | Description |
|------|-------|-------------|
| Career | `/career` | Career management page with bio variants, asset kit, and AI-powered bio generation |

### 4. Build & Execute

| Page | Route | Description |
|------|-------|-------------|
| Goals | `/goals` | Goal and key result (OKR) management with project linkage |
| Projects | `/projects` | Project management with Kanban, calendar, and Google Calendar views |

### 5. Knowledge & Learning

| Page | Route | Description |
|------|-------|-------------|
| Notes | `/notes` | Note management with grid/list views, search, category/tag/favorite filters |
| Knowledge Base | `/knowledge-base` | Knowledge entries with gallery/table/board/graph views, AI review recommendations |
| AI Knowledge | `/ai-knowledge` | AI configuration management: prompts, workflows, memory, tools stack, truth filters |
| Japanese Study | `/japanese-study` | Japanese study session tracking with calendar, list views, and analytics |
| Idea Capture | `/idea-capture` | Idea capture via voice/text with AI-powered project/task linking |

### 6. People

| Page | Route | Description |
|------|-------|-------------|
| Relationships | `/relationships` | Personal and professional relationship management |
| Role Models | `/role-models` | Role model gallery with project/goal/note linkage |

### 7. Resources

| Page | Route | Description |
|------|-------|-------------|
| Finance | `/finance` | Full personal finance suite: accounts, categories, transactions, savings goals, snapshots, AI receipt/voice processing, spending analysis |
| Assets | `/assets` | Physical asset tracking and management |
| Documents | `/documents` | Important document tracking with expiration date alerts |
| Software Vault | `/software-vault` | Personal software stack catalog with AI metadata auto-fill, optimization, and comparison |
| YouTube Radar | `/youtube-radar` | YouTube content tracking |

### 8. System

| Page | Route | Description |
|------|-------|-------------|
| Business Analyst | `/business-analyst` | AI-powered market research with analysis, infographics, audio overviews |
| AI Assistant | `/ai-assistant` | Full-page chat interface with SecondBrainAssistantAgentChat |
| Settings | `/settings` | Notification preferences (task reminders, daily summary, study streak) |

## App Shell Structure

```
AppLayout
├── Sidebar
│   ├── SidebarHeader (Brain icon + "My Life OS" branding)
│   ├── SidebarContent (8 collapsible navigation categories)
│   └── SidebarFooter (User avatar, name, email)
├── SidebarInset
│   ├── Top Bar (SidebarTrigger, theme toggle, language toggle)
│   ├── Main Content Area (max-w-7xl, p-6, bg-muted)
│   └── FloatingChatButton (AI assistant overlay)
```

## Cross-Cutting Features

- **Bilingual:** EN / zh-TW via `useLanguageState` hook with `t()` function
- **Theme:** Light/dark toggle stored in localStorage, applied via `document.documentElement.classList`
- **Floating AI Chat:** Accessible from any page via bottom-right floating button
- **Responsive:** Some mobile-specific styles via `max-sm:` and `sm:` breakpoints

## Page Complexity Ranking (by feature density)

1. **Finance** -- 5 entities, 7 AI actions, multi-tab, receipt/voice processing
2. **Daily Planner** -- Drag-and-drop, time blocking, templates, Google Calendar sync, AI suggestions, image generation
3. **Health** -- 6 entities, multi-tab dashboard
4. **AI Knowledge** -- 5 entities, multiple AI actions, multi-tab with individual filters
5. **Habits & Routines** -- 3 entities, 4 AI actions, streak tracking
6. **Tasks** -- Extensive filtering/sorting, views, AI pre-task ritual
7. **Journal** -- Emotion picker, 4 AI actions
8. **Dashboard** -- Cross-entity aggregation, multiple card types
9. **Knowledge Base** -- 4 view modes, AI review
10. **Software Vault** -- AI auto-fill, optimization, comparison
