"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingCards } from "@/components/shared/loading-state";
import { Input } from "@/components/ui/input";
import {
  OSIconControl,
  OSControl,
  OSPrimaryAction,
  OSSegmentedControl,
} from "@/components/ui/os-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderKanban,
  Plus,
  Search,
  Columns3,
  LayoutGrid,
  List,
  Network,
  GanttChart,
  ArrowUpDown,
  X,
  CalendarDays,
  Command,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { useProjects, useUpdateProject } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useNotes } from "@/hooks/use-notes";
import { useIdeas } from "@/hooks/use-ideas";
import type { Project, Task } from "@/types/database";
import { useAppStore } from "@/stores/app-store";
import { getProjectsUiCopy } from "@/lib/i18n/projects-ui";
import {
  computeProjectHealth,
  computeMomentumScore,
  isProjectStale,
  isDueThisWeek,
  type ProjectHealth,
  type ProjectMomentum,
} from "@/lib/projects/health";
import {
  getProjectPriorityLabel,
  getProjectPriorityOptions,
  getProjectStatusLabel,
  getProjectStatusOptions,
} from "@/lib/projects/presentation";

import { ProjectKanbanView } from "@/components/projects/kanban-view";
import { ProjectGalleryView } from "@/components/projects/gallery-view";
import { ProjectListView } from "@/components/projects/list-view";
import { ProjectDetailModal } from "@/components/projects/project-detail-modal";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import { ProjectCommandPalette } from "@/components/projects/command-palette";
import { InsightStrip } from "@/components/projects/insight-strip";
import { WhatsNextBar } from "@/components/projects/whats-next-bar";
import { ProjectMapView } from "@/components/projects/map-view";
import { ProjectTimelineView } from "@/components/projects/timeline-view";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getMergedTemplates,
  type ProjectCreatePreset,
} from "@/lib/projects/templates";
import {
  filterHorizontalScrollClassName,
  filterSearchControlClassName,
} from "@/components/shared/filter-scroll";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProjectViewMode = "kanban" | "gallery" | "list" | "map" | "timeline";

export type SortKey =
  | "updated"
  | "created"
  | "dueDate"
  | "priority"
  | "name"
  | "momentum";

export interface ProjectWithMeta {
  project: Project;
  tasks: Task[];
  health: ProjectHealth;
  momentum: ProjectMomentum;
  isPinned: boolean;
  noteCount: number;
  ideaCount: number;
}

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const VIEW_MODE_STORAGE_KEY = "projects:viewMode";
const FILTERS_STORAGE_KEY = "projects:filters";
const PINS_STORAGE_KEY = "projects:pins";

function readStoredFilters(): {
  statusFilter: string;
  priorityFilter: string;
  sortKey: SortKey;
} {
  if (typeof window === "undefined") {
    return { statusFilter: "all", priorityFilter: "all", sortKey: "updated" };
  }
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) {
      return { statusFilter: "all", priorityFilter: "all", sortKey: "updated" };
    }
    const f = JSON.parse(raw) as {
      statusFilter?: string;
      priorityFilter?: string;
      sortKey?: string;
    };
    const sortKey =
      f.sortKey === "updated" ||
      f.sortKey === "created" ||
      f.sortKey === "dueDate" ||
      f.sortKey === "priority" ||
      f.sortKey === "name" ||
      f.sortKey === "momentum"
        ? f.sortKey
        : "updated";
    return {
      statusFilter: f.statusFilter ?? "all",
      priorityFilter: f.priorityFilter ?? "all",
      sortKey,
    };
  } catch {
    return { statusFilter: "all", priorityFilter: "all", sortKey: "updated" };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProjectsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dailyPlannerHref = useLocalizedPath("/daily-planner");
  const shouldReduceMotion = useReducedMotion();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: tasks } = useTasks();
  const { data: notes } = useNotes();
  const { data: ideas } = useIdeas();
  const language = useAppStore((s) => s.language);
  const ui = getProjectsUiCopy(language);

  const [createPreset, setCreatePreset] = useState<ProjectCreatePreset | null>(
    null,
  );

  // View mode (persisted)
  const [viewMode, setViewMode] = useState<ProjectViewMode>(() => {
    if (typeof window === "undefined") return "kanban";
    return (localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ProjectViewMode) || "kanban";
  });

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Filters (persisted)
  const [search, setSearch] = useState("");
  const [listFilters, setListFilters] = useState(readStoredFilters);
  const { statusFilter, priorityFilter, sortKey } = listFilters;

  useEffect(() => {
    localStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify(listFilters),
    );
  }, [listFilters]);

  // Pins (persisted)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem(PINS_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(PINS_STORAGE_KEY, JSON.stringify([...pinnedIds]));
  }, [pinnedIds]);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Keyboard shortcut: Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Deep link: ?openId=<projectId> auto-opens that project's detail modal.
  // The target is derived during render (no setState-in-effect), and the
  // param is stripped only when the user closes the modal — so a hard
  // refresh while the modal is open re-opens to the same project.
  const openIdParam = searchParams?.get("openId") ?? null;
  const deepLinkProject = useMemo(() => {
    if (!openIdParam || !projects) return null;
    return projects.find((p) => p.id === openIdParam) ?? null;
  }, [openIdParam, projects]);

  const stripOpenIdParam = useCallback(() => {
    if (!openIdParam) return;
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    next.delete("openId");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [openIdParam, searchParams, router, pathname]);

  // Insight strip filter
  const [insightFilter, setInsightFilter] = useState<string | null>(null);
  const statusOptions = useMemo(() => getProjectStatusOptions(ui), [ui]);
  const priorityOptions = useMemo(() => getProjectPriorityOptions(ui), [ui]);

  // Build enriched project list
  const allProjectsWithMeta = useMemo<ProjectWithMeta[]>(() => {
    if (!projects) return [];
    const allTasks = tasks ?? [];
    const allNotes = notes ?? [];
    const allIdeas = ideas ?? [];

    return projects.map((project) => {
      const projectTasks = allTasks.filter((t) => t.project_id === project.id);
      const noteCount = allNotes.filter((n) => n.project_id === project.id).length;
      const ideaCount = allIdeas.filter(
        (i) => i.linked_project_ids?.includes(project.id),
      ).length;
      return {
        project,
        tasks: projectTasks,
        health: computeProjectHealth(project, projectTasks),
        momentum: computeMomentumScore(project, projectTasks),
        isPinned: pinnedIds.has(project.id),
        noteCount,
        ideaCount,
      };
    });
  }, [projects, tasks, notes, ideas, pinnedIds]);

  // Filtered + sorted
  const filteredProjects = useMemo(() => {
    let result = [...allProjectsWithMeta];

    // Insight filter
    if (insightFilter === "active") {
      result = result.filter((p) => p.project.status === "active");
    } else if (insightFilter === "dueThisWeek") {
      result = result.filter((p) => isDueThisWeek(p.project));
    } else if (insightFilter === "stale") {
      result = result.filter((p) => isProjectStale(p.project));
    }

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.project.name.toLowerCase().includes(q) ||
          p.project.description?.toLowerCase().includes(q) ||
          p.project.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => p.project.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter((p) => p.project.priority === priorityFilter);
    }

    // Sort
    result.sort((a, b) => {
      // Pinned always first
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

      switch (sortKey) {
        case "updated":
          return (
            new Date(b.project.updated_at).getTime() -
            new Date(a.project.updated_at).getTime()
          );
        case "created":
          return (
            new Date(b.project.created_at).getTime() -
            new Date(a.project.created_at).getTime()
          );
        case "dueDate": {
          const aDate = a.project.end_date
            ? new Date(a.project.end_date).getTime()
            : Infinity;
          const bDate = b.project.end_date
            ? new Date(b.project.end_date).getTime()
            : Infinity;
          return aDate - bDate;
        }
        case "priority":
          return (
            (PRIORITY_ORDER[a.project.priority] ?? 99) -
            (PRIORITY_ORDER[b.project.priority] ?? 99)
          );
        case "name":
          return a.project.name.localeCompare(b.project.name);
        case "momentum":
          return b.momentum.score - a.momentum.score;
        default:
          return 0;
      }
    });

    return result;
  }, [
    allProjectsWithMeta,
    search,
    statusFilter,
    priorityFilter,
    sortKey,
    insightFilter,
  ]);

  // Active filters for chip display
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; value: string }[] = [];
    if (statusFilter !== "all")
      chips.push({
        key: "status",
        label: `${ui.filterStatus}: ${getProjectStatusLabel(
          statusFilter as Project["status"],
          ui,
        )}`,
        value: statusFilter,
      });
    if (priorityFilter !== "all")
      chips.push({
        key: "priority",
        label: `${ui.filterPriority}: ${getProjectPriorityLabel(
          priorityFilter as Project["priority"],
          ui,
        )}`,
        value: priorityFilter,
      });
    if (insightFilter)
      chips.push({
        key: "insight",
        label:
          insightFilter === "active"
            ? ui.insightActiveNow
            : insightFilter === "dueThisWeek"
              ? ui.insightDueThisWeek
              : ui.insightStale,
        value: insightFilter,
      });
    return chips;
  }, [statusFilter, priorityFilter, insightFilter, ui]);

  const clearFilter = useCallback((key: string) => {
    if (key === "status")
      setListFilters((f) => ({ ...f, statusFilter: "all" }));
    else if (key === "priority")
      setListFilters((f) => ({ ...f, priorityFilter: "all" }));
    else if (key === "insight") setInsightFilter(null);
  }, []);

  const updateProject = useUpdateProject();

  const handleStatusChange = useCallback(
    (projectId: string, newStatus: Project["status"]) => {
      updateProject.mutate({ id: projectId, data: { status: newStatus } });
    },
    [updateProject],
  );

  const openNewProject = useCallback(() => {
    setCreatePreset(null);
    setShowCreate(true);
  }, []);

  if (projectsLoading) {
    return (
      <div className="pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1rem))] md:pb-0">
        <PageShell
          title={ui.pageTitle}
          description={ui.pageDescription}
          actions={
            <>
              <OSControl disabled className="hidden sm:inline-flex">
                <CalendarDays className="mr-1.5 h-4 w-4" />
                {ui.dailyPlanner}
              </OSControl>
              <OSPrimaryAction disabled className="hidden sm:inline-flex">
                <Plus className="mr-1.5 h-4 w-4" />
                {ui.newProject}
              </OSPrimaryAction>
            </>
          }
        >
          <div
            aria-hidden="true"
            className="grid gap-2 rounded-[1.25rem] border border-slate-200/70 bg-white/68 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/10 dark:bg-white/[0.055] sm:grid-cols-[minmax(16rem,1fr)_8.75rem_8.75rem_8.75rem_auto]"
          >
            <div className="h-11 rounded-[0.95rem] bg-slate-200/60 dark:bg-white/10" />
            <div className="h-11 rounded-[0.95rem] bg-slate-200/50 dark:bg-white/8" />
            <div className="h-11 rounded-[0.95rem] bg-slate-200/50 dark:bg-white/8" />
            <div className="h-11 rounded-[0.95rem] bg-slate-200/50 dark:bg-white/8" />
            <div className="h-11 rounded-[1rem] bg-lime-300/50 dark:bg-lime-300/35" />
          </div>
          <LoadingCards count={6} columns={3} />
        </PageShell>
      </div>
    );
  }

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "updated", label: ui.sortUpdated },
    { value: "created", label: ui.sortCreated },
    { value: "dueDate", label: ui.sortDueDate },
    { value: "priority", label: ui.sortPriority },
    { value: "name", label: ui.sortName },
    { value: "momentum", label: ui.sortMomentum },
  ];

  const viewModeConfig: {
    key: ProjectViewMode;
    label: string;
    icon: LucideIcon;
  }[] = [
    { key: "kanban", label: ui.viewKanban, icon: Columns3 },
    { key: "gallery", label: ui.viewGallery, icon: LayoutGrid },
    { key: "list", label: ui.viewList, icon: List },
    { key: "map", label: ui.viewMap, icon: Network },
    { key: "timeline", label: ui.viewTimeline, icon: GanttChart },
  ];

  return (
    <div className="pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1rem))] md:pb-0">
      <PageShell
        title={ui.pageTitle}
        description={ui.pageDescription}
        actions={
          <>
            <OSControl
              className="hidden sm:inline-flex"
              onClick={() => router.push(dailyPlannerHref)}
            >
              <CalendarDays className="mr-1.5 h-4 w-4" />
              {ui.dailyPlanner}
            </OSControl>
            <OSControl
              aria-label={ui.commandPaletteHint}
              className="hidden sm:inline-flex"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <Command className="mr-1.5 h-3.5 w-3.5" />
              <span className="text-xs opacity-70">⌘K</span>
            </OSControl>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <OSControl className="hidden sm:inline-flex" />
                }
              >
                {ui.fromTemplate}
                <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{ui.fromTemplate}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {getMergedTemplates().map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => {
                        setCreatePreset({
                          name: t.name,
                          description: t.description,
                          status: t.status,
                          priority: t.priority,
                          suggestedTasks: t.suggestedTasks,
                          tags: t.tags,
                        });
                        setShowCreate(true);
                      }}
                    >
                      <span className="mr-2" aria-hidden>
                        {t.icon}
                      </span>
                      {t.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <OSPrimaryAction
              onClick={openNewProject}
              className="hidden sm:inline-flex"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {ui.newProject}
            </OSPrimaryAction>
          </>
        }
      >
        {/* Insight Strip */}
        <InsightStrip
          projects={allProjectsWithMeta}
          activeFilter={insightFilter}
          onFilterChange={setInsightFilter}
          ui={ui}
        />

        {/* What's Next Suggestion */}
        <WhatsNextBar projects={allProjectsWithMeta} ui={ui} onOpen={setSelectedProject} />

        {/* Mobile primary actions */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 sm:hidden">
          <OSPrimaryAction onClick={openNewProject} className="justify-center">
            <Plus className="mr-1.5 h-4 w-4" />
            {ui.newProject}
          </OSPrimaryAction>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <OSIconControl aria-label={ui.fromTemplate} />
              }
            >
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{ui.fromTemplate}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {getMergedTemplates().map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onClick={() => {
                      setCreatePreset({
                        name: t.name,
                        description: t.description,
                        status: t.status,
                        priority: t.priority,
                        suggestedTasks: t.suggestedTasks,
                        tags: t.tags,
                      });
                      setShowCreate(true);
                    }}
                  >
                    <span className="mr-2" aria-hidden>
                      {t.icon}
                    </span>
                    {t.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <OSIconControl
            aria-label={ui.commandPaletteHint}
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Command className="h-4 w-4" />
          </OSIconControl>
        </div>

        {/* Toolbar */}
        <div
          data-slot="projects-toolbar"
          className={`${filterHorizontalScrollClassName} rounded-[1.25rem] border border-slate-200/70 bg-white/68 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] supports-backdrop-filter:backdrop-blur-xl supports-backdrop-filter:backdrop-saturate-150 dark:border-white/10 dark:bg-white/[0.055]`}
        >
          {/* Search */}
          <div className={`${filterSearchControlClassName} lg:max-w-sm`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={ui.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 min-h-11 rounded-[0.95rem] border-slate-200/80 bg-white/76 pl-9 pr-14 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-white/10 dark:bg-white/[0.06]"
            />
            {search && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums">
                {filteredProjects.length}
              </span>
            )}
          </div>

          {/* Quick filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex shrink-0 flex-nowrap items-center gap-1.5 lg:flex-wrap">
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className="inline-flex max-w-[min(72vw,220px)] shrink-0 items-center gap-1 rounded-[0.9rem] border border-lime-300/35 bg-lime-300/16 px-3 pr-2 text-xs font-semibold text-slate-800 transition-[background,border-color,transform] duration-150 hover:border-lime-300/55 hover:bg-lime-300/24 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 motion-reduce:transition-none motion-reduce:active:translate-y-0 dark:text-lime-50"
                  onClick={() => clearFilter(f.key)}
                >
                  <span className="truncate">{f.label}</span>
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          {/* Filters */}
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              v && setListFilters((f) => ({ ...f, statusFilter: v }))
            }
            itemToStringLabel={(v) =>
              v === "all"
                ? ui.allStatus
                : getProjectStatusLabel(v as Project["status"], ui)
            }
          >
            <SelectTrigger className="h-11 min-h-11 w-[140px] shrink-0 rounded-[0.95rem]">
              <SelectValue placeholder={ui.filterStatus} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ui.allStatus}</SelectItem>
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter}
            onValueChange={(v) =>
              v && setListFilters((f) => ({ ...f, priorityFilter: v }))
            }
            itemToStringLabel={(v) =>
              v === "all"
                ? ui.allPriority
                : getProjectPriorityLabel(v as Project["priority"], ui)
            }
          >
            <SelectTrigger className="h-11 min-h-11 w-[140px] shrink-0 rounded-[0.95rem]">
              <SelectValue placeholder={ui.filterPriority} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ui.allPriority}</SelectItem>
              {priorityOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={sortKey}
            onValueChange={(v) =>
              v &&
              setListFilters((f) => ({
                ...f,
                sortKey: v as SortKey,
              }))
            }
            itemToStringLabel={(v) =>
              sortOptions.find((o) => o.value === v)?.label ?? String(v)
            }
          >
            <SelectTrigger className="h-11 min-h-11 w-[140px] shrink-0 rounded-[0.95rem]">
              <ArrowUpDown className="h-4 w-4 mr-1.5" />
              <SelectValue placeholder={ui.sortBy} />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <OSSegmentedControl
            items={viewModeConfig.map((v) => ({
              id: v.key,
              label: v.label,
              icon: v.icon,
              ariaLabel: v.label,
            }))}
            value={viewMode}
            onValueChange={setViewMode}
            ariaLabel={`${ui.pageTitle} view`}
            className="shrink-0 lg:ml-auto"
            labelMode="desktop"
            layoutId="projects-view-mode-pill"
          />
        </div>

        {/* Views */}
        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={projects?.length === 0 ? ui.noProjectsTitle : ui.noResultsTitle}
            description={
              projects?.length === 0
                ? ui.noProjectsDescription
                : ui.noResultsDescription
            }
            action={
              projects?.length === 0
                ? {
                    label: ui.noProjectsAction,
                    onClick: () => {
                      setCreatePreset(null);
                      setShowCreate(true);
                    },
                  }
                : undefined
            }
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.995 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.24,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {viewMode === "kanban" && (
                <ProjectKanbanView
                  projects={filteredProjects}
                  statusOptions={statusOptions}
                  onSelectProject={setSelectedProject}
                  onStatusChange={handleStatusChange}
                  onTogglePin={togglePin}
                  ui={ui}
                />
              )}
              {viewMode === "gallery" && (
                <ProjectGalleryView
                  projects={filteredProjects}
                  onSelectProject={setSelectedProject}
                  ui={ui}
                />
              )}
              {viewMode === "list" && (
                <ProjectListView
                  projects={filteredProjects}
                  onSelectProject={setSelectedProject}
                  onTogglePin={togglePin}
                  onStatusChange={handleStatusChange}
                  ui={ui}
                />
              )}
              {viewMode === "map" && (
                <ProjectMapView
                  projects={filteredProjects}
                  ideas={ideas ?? []}
                  onSelectProject={setSelectedProject}
                  ui={ui}
                />
              )}
              {viewMode === "timeline" && (
                <ProjectTimelineView
                  projects={filteredProjects}
                  onSelectProject={setSelectedProject}
                  ui={ui}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </PageShell>

      {/* Modals */}
      <CreateProjectModal
        open={showCreate}
        onOpenChange={(v) => {
          setShowCreate(v);
          if (!v) setCreatePreset(null);
        }}
        preset={createPreset}
      />

      <ProjectDetailModal
        project={selectedProject ?? deepLinkProject}
        onClose={() => {
          setSelectedProject(null);
          stripOpenIdParam();
        }}
      />

      <ProjectCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        projects={allProjectsWithMeta}
        onSelectProject={setSelectedProject}
        onSetView={setViewMode}
        onNewProject={() => {
          setCreatePreset(null);
          setShowCreate(true);
        }}
        onNavigatePlanner={() => router.push(dailyPlannerHref)}
        onSetInsightFilter={setInsightFilter}
        ui={ui}
      />
    </div>
  );
}
