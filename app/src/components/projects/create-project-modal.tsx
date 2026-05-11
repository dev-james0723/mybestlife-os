"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  AlertTriangle,
  FileText,
  CheckSquare,
  Lightbulb,
  Link2,
  BookOpen,
  PlayCircle,
  Mic,
  Image as ImageIcon,
  Newspaper,
  ExternalLink,
  Plus,
  Bot,
  Globe,
  CircleHelp,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateProject } from "@/hooks/use-projects";
import { useProjects } from "@/hooks/use-projects";
import { useTasks, useCreateTask } from "@/hooks/use-tasks";
import { useNotes } from "@/hooks/use-notes";
import { useIdeas } from "@/hooks/use-ideas";
import { useAppStore } from "@/stores/app-store";
import { getProjectsUiCopy } from "@/lib/i18n/projects-ui";
import {
  getProjectPriorityLabel,
  getProjectStatusLabel,
} from "@/lib/projects/presentation";
import { getDailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import type { Project, ProjectResourceCategory } from "@/types/database";
import { useCreateProjectResources } from "@/hooks/use-project-resources";
import type { ProjectCreatePreset } from "@/lib/projects/templates";
import { ThumbnailStylePicker } from "@/components/knowledge/ThumbnailStylePicker";
import type { ThumbnailStyle } from "@/types/knowledge";
import {
  notifyProjectAiComplete,
  requestNotificationPermission,
} from "@/lib/projects/project-ai-notify";
import { CreatePlannerTaskAiDialog } from "@/components/daily-planner/create-planner-task-ai-dialog";
import { cn } from "@/lib/utils";

const RESOURCE_CATEGORIES: ProjectResourceCategory[] = [
  "website",
  "video",
  "podcast",
  "article",
  "news",
  "image",
  "other",
];

const CATEGORY_ICON: Record<ProjectResourceCategory, typeof PlayCircle> = {
  website: Globe,
  video: PlayCircle,
  article: BookOpen,
  podcast: Mic,
  news: Newspaper,
  image: ImageIcon,
  other: CircleHelp,
};

const CATEGORY_COLOR: Record<ProjectResourceCategory, string> = {
  website:
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  video: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  article: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  podcast:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  news: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  image:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  other: "bg-slate-200 text-slate-800 dark:bg-slate-700/50 dark:text-slate-200",
};

interface AiMetadata {
  description: string;
  suggestedStatus: Project["status"];
  suggestedPriority: Project["priority"];
  suggestedStartDate: string | null;
  suggestedEndDate: string | null;
  estimatedTasks: string[];
  icon: string;
  tags: string[];
  relatedResources?: Array<{
    category: ProjectResourceCategory;
    title: string;
    url: string;
    source?: string;
    thumbnailUrl?: string | null;
    description?: string;
  }>;
}

type SuggestedResourceRow = {
  category: ProjectResourceCategory;
  title: string;
  url: string;
  source: string;
  thumbnailUrl: string | null;
  description: string;
  checked: boolean;
};

interface WorkspaceMatch {
  type: "project" | "task" | "note" | "idea";
  id: string;
  name: string;
  similarity: number;
}

const SESSION_STORAGE_KEY = "project-ai-cache";

function cacheKey(name: string): string {
  return `${SESSION_STORAGE_KEY}:${name.trim().toLowerCase()}`;
}

function saveToSession(name: string, data: AiMetadata): void {
  try {
    sessionStorage.setItem(cacheKey(name), JSON.stringify(data));
  } catch {
    /* quota exceeded etc */
  }
}

function loadFromSession(name: string): AiMetadata | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(name));
    return raw ? (JSON.parse(raw) as AiMetadata) : null;
  } catch {
    return null;
  }
}

function categoryLabel(
  cat: ProjectResourceCategory,
  ui: ReturnType<typeof getProjectsUiCopy>,
): string {
  if (cat === "website") return ui.websites;
  if (cat === "video") return ui.videos;
  if (cat === "article") return ui.articles;
  if (cat === "podcast") return ui.podcasts;
  if (cat === "news") return ui.news;
  if (cat === "image") return ui.images;
  return ui.otherResources;
}

export function CreateProjectModal({
  open,
  onOpenChange,
  preset,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preset?: ProjectCreatePreset | null;
}) {
  const queryClient = useQueryClient();
  const createProject = useCreateProject();
  const createTask = useCreateTask();
  const createProjectResources = useCreateProjectResources();
  const { data: existingProjects } = useProjects();
  const { data: existingTasks } = useTasks();
  const { data: existingNotes } = useNotes();
  const { data: existingIdeas } = useIdeas();
  const language = useAppStore((s) => s.language);
  const ui = getProjectsUiCopy(language);
  const plannerUi = getDailyPlannerUiCopy(language);

  const statusOptions = useMemo(
    () =>
      [
        { value: "planning" as const, label: ui.statusPlanning },
        { value: "active" as const, label: ui.statusActive },
        { value: "paused" as const, label: ui.statusPaused },
        { value: "completed" as const, label: ui.statusCompleted },
        { value: "cancelled" as const, label: ui.statusCancelled },
      ],
    [ui],
  );

  const priorityOptions = useMemo(
    () =>
      [
        { value: "low" as const, label: ui.priorityLow },
        { value: "medium" as const, label: ui.priorityMedium },
        { value: "high" as const, label: ui.priorityHigh },
        { value: "urgent" as const, label: ui.priorityUrgent },
      ],
    [ui],
  );

  const thumbnailStylePickerI18n = useMemo(
    () => ({
      sectionTitle: ui.thumbnailStyleHeading,
      naCardTitle: ui.thumbnailStyleNaCardTitle,
      naCardSubtitle: ui.thumbnailStyleNaCardSubtitle,
      styleLabels: {
        minimal: ui.thumbnailStyleMinimal,
        gradient: ui.thumbnailStyleGradient,
        illustrated: ui.thumbnailStyleIllustrated,
        photographic: ui.thumbnailStylePhotographic,
        abstract: ui.thumbnailStyleAbstract,
        glassmorphism: ui.thumbnailStyleGlassmorphism,
        three_d_render: ui.thumbnailStyleThreeDRender,
        editorial: ui.thumbnailStyleEditorial,
        isometric: ui.thumbnailStyleIsometric,
        brutalist: ui.thumbnailStyleBrutalist,
        retro_y2k: ui.thumbnailStyleRetroY2k,
        na: ui.thumbnailStyleNa,
      },
    }),
    [ui],
  );

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Project["status"]>("planning");
  const [priority, setPriority] = useState<Project["priority"]>("medium");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [thumbnailStyle, setThumbnailStyle] =
    useState<ThumbnailStyle>("minimal");

  // AI state
  const [aiMetadata, setAiMetadata] = useState<AiMetadata | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(
    null,
  );
  const [thumbnailLoading, setThumbnailLoading] = useState(false);

  // Suggested tasks (optional `source` marks AI-originated rows for persistence)
  const [suggestedTasks, setSuggestedTasks] = useState<
    { text: string; checked: boolean; source?: string }[]
  >([]);

  const [suggestedResources, setSuggestedResources] = useState<
    SuggestedResourceRow[]
  >([]);

  // Manual task add
  const [manualTaskInput, setManualTaskInput] = useState("");
  const [showManualTaskForm, setShowManualTaskForm] = useState(false);

  // AI task dialog
  const [aiTaskDialogOpen, setAiTaskDialogOpen] = useState(false);

  // Workspace matches
  const [workspaceMatches, setWorkspaceMatches] = useState<WorkspaceMatch[]>(
    [],
  );
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presetAppliedKeyRef = useRef<string | null>(null);
  const modalOpenRef = useRef(open);

  useEffect(() => {
    modalOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open || !preset) {
      presetAppliedKeyRef.current = null;
      return;
    }
    const key = `${preset.name}|${preset.description}|${preset.suggestedTasks.join(",")}`;
    if (presetAppliedKeyRef.current === key) return;
    presetAppliedKeyRef.current = key;
    setName(preset.name);
    setDescription(preset.description);
    setStatus(preset.status);
    setPriority(preset.priority);
    setTags(preset.tags ?? []);
    setSuggestedTasks(
      preset.suggestedTasks.map((t) => ({ text: t, checked: true })),
    );
    setSuggestedResources([]);
    setAiApplied(true);
    setStartDate("");
    setEndDate("");
  }, [open, preset]);

  // Restore from sessionStorage when modal opens
  useEffect(() => {
    if (!open || !name.trim() || aiMetadata) return;
    const cached = loadFromSession(name);
    if (cached) {
      applyAiData(cached);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reset = useCallback(() => {
    setName("");
    setDescription("");
    setStatus("planning");
    setPriority("medium");
    setStartDate("");
    setEndDate("");
    setTags([]);
    setThumbnailStyle("minimal");
    setAiMetadata(null);
    setAiLoading(false);
    setAiApplied(false);
    setThumbnailPreviewUrl(null);
    setThumbnailLoading(false);
    setSuggestedTasks([]);
    setSuggestedResources([]);
    setWorkspaceMatches([]);
    setDuplicateWarning(null);
    setShowManualTaskForm(false);
    setManualTaskInput("");
    presetAppliedKeyRef.current = null;
  }, []);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      // Don't reset if AI is loading — data will be cached in sessionStorage
    } else {
      // On reopen, try to restore cached data
      if (name.trim()) {
        const cached = loadFromSession(name);
        if (cached && !aiMetadata) applyAiData(cached);
      }
    }
    if (!v && !aiLoading) reset();
    onOpenChange(v);
  };

  const applyAiData = useCallback(
    (data: AiMetadata) => {
      setAiMetadata(data);
      if (!description) setDescription(data.description);
      setStatus(data.suggestedStatus);
      setPriority(data.suggestedPriority);
      if (data.suggestedStartDate && !startDate)
        setStartDate(data.suggestedStartDate);
      if (data.suggestedEndDate && !endDate) setEndDate(data.suggestedEndDate);
      if (data.tags.length > 0 && tags.length === 0) setTags(data.tags);
      setAiApplied(true);
      setSuggestedTasks(
        data.estimatedTasks.map((t) => ({
          text: t,
          checked: true,
          source: "ai:project-metadata",
        })),
      );

      const validCat = new Set<ProjectResourceCategory>(RESOURCE_CATEGORIES);
      const rel = (data.relatedResources ?? []).filter(
        (
          r,
        ): r is NonNullable<typeof r> & {
          category: ProjectResourceCategory;
        } =>
          r &&
          typeof r.title === "string" &&
          typeof r.url === "string" &&
          validCat.has(r.category),
      );
      setSuggestedResources(
        rel.map((r) => ({
          category: r.category,
          title: r.title,
          url: r.url,
          source: r.source ?? "",
          thumbnailUrl: r.thumbnailUrl ?? null,
          description: r.description ?? "",
          checked: true,
        })),
      );
    },
    [description, startDate, endDate, tags.length],
  );

  // Fuzzy search workspace when name changes
  useEffect(() => {
    if (!name.trim() || name.length < 3) {
      setWorkspaceMatches([]);
      setDuplicateWarning(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const q = name.toLowerCase();
      const matches: WorkspaceMatch[] = [];

      for (const p of existingProjects ?? []) {
        const sim = fuzzyScore(q, p.name.toLowerCase());
        if (sim > 0.4) {
          matches.push({
            type: "project",
            id: p.id,
            name: p.name,
            similarity: sim,
          });
        }
      }

      for (const t of existingTasks ?? []) {
        const sim = fuzzyScore(q, t.title.toLowerCase());
        if (sim > 0.5) {
          matches.push({
            type: "task",
            id: t.id,
            name: t.title,
            similarity: sim,
          });
        }
      }

      for (const n of existingNotes ?? []) {
        const sim = fuzzyScore(q, n.title.toLowerCase());
        if (sim > 0.5) {
          matches.push({
            type: "note",
            id: n.id,
            name: n.title,
            similarity: sim,
          });
        }
      }

      for (const i of existingIdeas ?? []) {
        const sim = fuzzyScore(q, i.content.toLowerCase());
        if (sim > 0.4) {
          matches.push({
            type: "idea",
            id: i.id,
            name: i.content.slice(0, 60),
            similarity: sim,
          });
        }
      }

      matches.sort((a, b) => b.similarity - a.similarity);
      setWorkspaceMatches(matches.slice(0, 10));

      const projectDupe = matches.find(
        (m) => m.type === "project" && m.similarity > 0.8,
      );
      setDuplicateWarning(projectDupe?.name ?? null);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name, existingProjects, existingTasks, existingNotes, existingIdeas]);

  // "Fill project data with AI" click handler
  const handleFillWithAi = useCallback(async () => {
    if (!name.trim()) return;
    requestNotificationPermission();
    setAiLoading(true);
    toast.info(ui.aiSettingUp);

    try {
      const res = await fetch("/api/projects/generate-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: name, language }),
      });
      if (!res.ok) throw new Error("Failed to generate metadata");
      const data: AiMetadata = await res.json();

      saveToSession(name, data);

      if (modalOpenRef.current) {
        applyAiData(data);
      }

      await notifyProjectAiComplete(name);
      toast.success(ui.projectAiReady);
    } catch {
      toast.error(ui.toastProjectAiGenerateFailed);
    } finally {
      setAiLoading(false);
    }
  }, [
    name,
    language,
    applyAiData,
    ui.aiSettingUp,
    ui.projectAiReady,
    ui.toastProjectAiGenerateFailed,
  ]);

  const generateThumbnailPreview = useCallback(
    async (projectName: string, projectDescription: string) => {
      if (thumbnailStyle === "na" || !projectName.trim()) {
        setThumbnailPreviewUrl(null);
        return;
      }
      setThumbnailLoading(true);
      try {
        const res = await fetch("/api/projects/generate-thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName,
            description: projectDescription,
            style: thumbnailStyle,
          }),
        });
        if (!res.ok) throw new Error("Failed to generate thumbnail preview");
        const data = (await res.json()) as { url?: string };
        setThumbnailPreviewUrl(data.url ?? null);
      } catch {
        setThumbnailPreviewUrl(null);
        toast.error(ui.toastProjectAiGenerateFailed);
      } finally {
        setThumbnailLoading(false);
      }
    },
    [thumbnailStyle, ui.toastProjectAiGenerateFailed],
  );

  useEffect(() => {
    if (!aiApplied) return;
    if (thumbnailStyle === "na") {
      setThumbnailPreviewUrl(null);
      return;
    }
    const projectName = name.trim() || titleFromDescription(description) || "";
    if (!projectName) return;
    const timer = setTimeout(() => {
      void generateThumbnailPreview(projectName, description || "");
    }, 250);
    return () => clearTimeout(timer);
  }, [aiApplied, thumbnailStyle, name, description, generateThumbnailPreview]);

  // Manual task add
  const handleAddManualTask = () => {
    const text = manualTaskInput.trim();
    if (!text) return;
    setSuggestedTasks((prev) => [...prev, { text, checked: true }]);
    setManualTaskInput("");
    setShowManualTaskForm(false);
  };

  // AI Smart Add Task — receives task from the planner dialog
  const handleAiTaskAdd = (title: string) => {
    setSuggestedTasks((prev) => [
      ...prev,
      { text: title, checked: true, source: "ai:gemini" },
    ]);
    setAiTaskDialogOpen(false);
  };

  const handleCreate = async () => {
    const projectName = name.trim() || titleFromDescription(description);
    if (!projectName) return;

    try {
      const project = await createProject.mutateAsync({
        name: projectName,
        description: description || undefined,
        status,
        priority,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        tags,
        thumbnail_url: thumbnailPreviewUrl || undefined,
        thumbnail_style:
          thumbnailStyle !== "na" ? thumbnailStyle : undefined,
      });

      const checkedTasks = suggestedTasks.filter((t) => t.checked);
      for (const task of checkedTasks) {
        await createTask.mutateAsync({
          title: task.text,
          project_id: project.id,
          priority: "medium",
          ...(task.source ? { source: task.source } : {}),
        });
      }

      const checkedResources = suggestedResources.filter((r) => r.checked);
      if (checkedResources.length > 0) {
        await createProjectResources.mutateAsync({
          projectId: project.id,
          items: checkedResources.map((r, i) => ({
            project_id: project.id,
            category: r.category,
            title: r.title,
            url: r.url,
            source: r.source || undefined,
            thumbnail_url: r.thumbnailUrl || undefined,
            description: r.description || undefined,
            is_favorite: true,
            sort_order: i,
          })),
        });
      }

      if (thumbnailStyle !== "na" && !thumbnailPreviewUrl) {
        fetch("/api/projects/generate-thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            projectName: projectName,
            description: description || "",
            style: thumbnailStyle,
          }),
        })
          .then(() =>
            queryClient.invalidateQueries({ queryKey: ["projects"] }),
          )
          .catch(() => {});
      }

      reset();
      onOpenChange(false);
    } catch {
      // Mutation onError handlers already show toasts
    }
  };

  const handleSaveAsDraft = async () => {
    const projectName = name.trim() || titleFromDescription(description);
    if (!projectName) return;
    try {
      await createProject.mutateAsync({
        name: projectName,
        description: description || undefined,
        status: "planning",
        priority: "medium",
      });
      reset();
      onOpenChange(false);
    } catch {
      // see handleCreate
    }
  };

  const isSubmitting = createProject.isPending;
  const canSubmit =
    Boolean(name.trim() || titleFromDescription(description)) && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="3xl"
        showCloseButton
        className={cn(
          "max-h-[90vh] flex flex-col transition-[filter,opacity,transform] duration-200 ease-out",
          aiTaskDialogOpen &&
            "pointer-events-none scale-[0.99] opacity-[var(--nested-parent-dialog-opacity)] blur-[var(--nested-parent-dialog-blur)]",
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {ui.createTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Magic Input */}
          <div className="space-y-2">
            <Label className="text-base font-medium">
              {ui.magicInputLabel}
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ui.magicInputHint}
              className="text-lg h-12"
              autoFocus
            />
          </div>

          {/* Fill with AI button */}
          {name.trim().length >= 3 && !aiApplied && (
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full gap-2 shadow-sm transition-[background-color,border-color,filter]",
                "bg-[var(--project-ai-fill-bg)] text-[var(--project-ai-fill-fg)]",
                "border-[var(--project-ai-fill-border)] hover:bg-[var(--project-ai-fill-hover-bg)]",
                "hover:border-[var(--project-ai-fill-border)]",
                "dark:bg-[var(--project-ai-fill-bg)] dark:hover:bg-[var(--project-ai-fill-hover-bg)]",
                "dark:border-[var(--project-ai-fill-border)]",
              )}
              onClick={handleFillWithAi}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {ui.fillWithAi}
            </Button>
          )}

          {/* Duplicate warning */}
          {duplicateWarning && (
            <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="flex items-center gap-3 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-medium">
                    {ui.similarProjectExists}:
                  </span>{" "}
                  &quot;{duplicateWarning}&quot;
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Loading skeleton */}
          {aiLoading && !aiMetadata && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium">
                  {ui.aiGeneratedMetadata}
                </span>
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}

          {/* AI Generated Metadata header with regenerate */}
          {aiMetadata && (
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {ui.aiGeneratedMetadata}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setAiApplied(false);
                  handleFillWithAi();
                }}
                disabled={aiLoading}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                {ui.regenerate}
              </Button>
            </div>
          )}

          {/* Workspace matches */}
          {workspaceMatches.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                {ui.foundInWorkspace}
              </h3>
              <Card>
                <CardContent className="p-3 space-y-1.5">
                  {workspaceMatches.map((m) => (
                    <div
                      key={`${m.type}-${m.id}`}
                      className="flex items-center gap-2 text-sm py-1"
                    >
                      {m.type === "project" && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          Project
                        </Badge>
                      )}
                      {m.type === "task" && (
                        <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {m.type === "note" && (
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {m.type === "idea" && (
                        <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="truncate flex-1">{m.name}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Suggested Tasks */}
          {suggestedTasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" />
                {ui.suggestedTasks}{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  ({ui.uncheckToSkip})
                </span>
              </h3>
              <Card>
                <CardContent className="p-3 space-y-2">
                  {suggestedTasks.map((task, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-2.5 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={task.checked}
                        onCheckedChange={(checked) => {
                          setSuggestedTasks((prev) =>
                            prev.map((t, j) =>
                              j === i ? { ...t, checked: !!checked } : t,
                            ),
                          );
                        }}
                      />
                      <span>{task.text}</span>
                    </label>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add Task Manually / AI Smart Add Task buttons */}
          {aiApplied && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowManualTaskForm((v) => !v)}
              >
                <Plus className="h-3.5 w-3.5" />
                {ui.addTaskManually}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setAiTaskDialogOpen(true)}
              >
                <Bot className="h-3.5 w-3.5" />
                {ui.aiSmartAddTask}
              </Button>
            </div>
          )}

          {/* Manual task form */}
          {showManualTaskForm && (
            <div className="flex items-center gap-2">
              <Input
                value={manualTaskInput}
                onChange={(e) => setManualTaskInput(e.target.value)}
                placeholder={ui.manualTaskPlaceholder}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddManualTask();
                  }
                }}
                autoFocus
              />
              <Button size="sm" onClick={handleAddManualTask}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Related Resources — always show after AI fill so users see the section */}
          {aiApplied && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                {ui.relatedResources}{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  ({ui.relatedResourcesHint})
                </span>
              </h3>
              {suggestedResources.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    {ui.relatedResourcesEmpty}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suggestedResources.map((row, idx) => {
                    const CatIcon = CATEGORY_ICON[row.category];
                    return (
                      <Card
                        key={`${row.url}-${idx}`}
                        className={`relative overflow-hidden transition-opacity ${
                          row.checked ? "opacity-100" : "opacity-50"
                        }`}
                      >
                        <CardContent className="p-0">
                          <div className="flex gap-0">
                            <div className="w-24 h-24 shrink-0 bg-muted flex items-center justify-center overflow-hidden">
                              {row.thumbnailUrl ? (
                                <img
                                  src={row.thumbnailUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display =
                                      "none";
                                    const parent = (e.target as HTMLImageElement)
                                      .parentElement;
                                    if (parent) {
                                      const fallback =
                                        parent.querySelector(".fallback-icon");
                                      if (fallback)
                                        (
                                          fallback as HTMLElement
                                        ).style.display = "flex";
                                    }
                                  }}
                                />
                              ) : null}
                              <div
                                className={`fallback-icon items-center justify-center ${row.thumbnailUrl ? "hidden" : "flex"}`}
                              >
                                <CatIcon className="h-8 w-8 text-muted-foreground/50" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] h-5 shrink-0 ${CATEGORY_COLOR[row.category]}`}
                                  >
                                    <CatIcon className="h-2.5 w-2.5 mr-0.5" />
                                    {categoryLabel(row.category, ui)}
                                  </Badge>
                                  {row.source && (
                                    <span className="text-[10px] text-muted-foreground truncate">
                                      {row.source}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-medium leading-snug line-clamp-2">
                                  {row.title}
                                </p>
                                {row.description && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                    {row.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <a
                                  href={row.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-primary inline-flex items-center gap-0.5 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-2.5 w-2.5" />
                                  {ui.openLink}
                                </a>
                              </div>
                            </div>

                            <div className="absolute top-1.5 right-1.5">
                              <Checkbox
                                checked={row.checked}
                                onCheckedChange={(checked) => {
                                  setSuggestedResources((prev) =>
                                    prev.map((r, j) =>
                                      j === idx
                                        ? { ...r, checked: !!checked }
                                        : r,
                                    ),
                                  );
                                }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Thumbnail Style Picker */}
          <ThumbnailStylePicker
            value={thumbnailStyle}
            onChange={setThumbnailStyle}
            i18n={thumbnailStylePickerI18n}
          />

          {aiApplied && thumbnailStyle !== "na" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{ui.images}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={thumbnailLoading}
                  onClick={() => {
                    const projectName =
                      name.trim() || titleFromDescription(description) || "";
                    if (!projectName) return;
                    void generateThumbnailPreview(projectName, description || "");
                  }}
                >
                  {thumbnailLoading ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-3 w-3" />
                  )}
                  {ui.regenerate}
                </Button>
              </div>
              <div className="overflow-hidden rounded-lg border bg-muted/30">
                {thumbnailPreviewUrl ? (
                  <img
                    src={thumbnailPreviewUrl}
                    alt=""
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                    {thumbnailLoading ? ui.aiSettingUp : ui.aiGeneratedMetadata}
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Manual Fields */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{ui.descriptionLabel}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={ui.descriptionPlaceholder}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>{ui.statusLabel}</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as Project["status"])}
                itemToStringLabel={(v) =>
                  getProjectStatusLabel(v as Project["status"], ui)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{ui.priorityLabel}</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as Project["priority"])}
                itemToStringLabel={(v) =>
                  getProjectPriorityLabel(v as Project["priority"], ui)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{ui.startDateLabel}</Label>
              <DatePickerInput
                value={startDate}
                onChange={(v) => setStartDate(v)}
              />
            </div>

            <div className="space-y-2">
              <Label>{ui.endDateLabel}</Label>
              <DatePickerInput
                value={endDate}
                onChange={(v) => setEndDate(v)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {ui.cancel}
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveAsDraft}
            disabled={!canSubmit}
          >
            {ui.saveAsDraft}
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {ui.createProject}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* AI Smart Add Task dialog */}
      <CreatePlannerTaskAiDialog
        open={aiTaskDialogOpen}
        onOpenChange={setAiTaskDialogOpen}
        locale={language}
        copy={plannerUi}
        blockMinutes={30}
        onAddToPlan={(title) => handleAiTaskAdd(title)}
      />
    </Dialog>
  );
}

function titleFromDescription(description: string): string | null {
  const line = description.trim().split(/\n/)[0]?.trim() ?? "";
  if (!line) return null;
  return line.length > 120 ? `${line.slice(0, 117)}…` : line;
}

function fuzzyScore(query: string, target: string): number {
  if (!query || !target) return 0;
  if (target.includes(query))
    return 0.9 + Math.min(0.1, query.length / target.length);

  let qi = 0;
  let matched = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) {
      matched++;
      qi++;
    }
  }
  return matched / Math.max(query.length, 1);
}
