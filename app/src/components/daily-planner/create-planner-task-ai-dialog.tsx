"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  formatBlockDurationLocalized,
  type DailyPlannerUiCopy,
} from "@/lib/i18n/daily-planner-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";
import type {
  PlannerAiClarification,
  PlannerAiMetadataResult,
  PlannerAiQuestion,
  PlannerAiRelatedItem,
  PlannerAiRequestBody,
  PlannerAiResourceType,
  PlannerAiWebResource,
} from "@/lib/ai/planner-task-types";
import { useCreateTask } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import {
  Bot,
  CalendarClock,
  ChevronRight,
  ExternalLink,
  FileText,
  FilePenLine,
  Headphones,
  Lightbulb,
  Loader2,
  NotebookPen,
  ShoppingCart,
  Sparkles,
  Tag,
  Target,
  Trash2,
  TriangleAlert,
  Video,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/types/database";

type ResourceFilter = "all" | PlannerAiResourceType;

type Phase =
  | "input"
  | "loadingQuestions"
  | "clarifying"
  | "generating"
  | "review"
  | "manual"
  | "error";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: AppLocale;
  copy: DailyPlannerUiCopy;
  blockMinutes: number;
  onAddToPlan: (title: string, blocks: number, taskId?: string) => void;
  /** When set, new tasks are always attached to this project and the picker defaults here. */
  lockedProjectId?: string;
};

async function postPlannerAi<T>(body: PlannerAiRequestBody): Promise<T> {
  const res = await fetch("/api/ai/planner-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    const err = new Error("unauthorized") as Error & { code?: string };
    err.code = "unauthorized";
    throw err;
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "request_failed");
  }
  return (await res.json()) as T;
}

function taskTitleEmoji(title: string): string {
  if (/coffee|咖啡|caf[eé]/i.test(title)) return "☕";
  if (/gym|健身|運動|运动|workout/i.test(title)) return "💪";
  if (/read|讀|读|book/i.test(title)) return "📚";
  return "📋";
}

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/** Input-step footer: mobile = single column stack; desktop (`lg+`) = one row × 4 equal columns. Dialog max-width is widened at `lg` so four labels fit (see DialogContent `className`). */
const plannerDialogFooterGrid =
  "grid w-full max-w-full grid-cols-1 gap-2.5 pt-2 lg:grid-cols-4 lg:gap-3";
/** Buttons: wrap text, auto height; on desktop row each cell is `minmax(0,1fr)` via grid + `min-w-0`. */
const plannerDialogFooterBtn =
  "!h-auto min-h-12 w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 !whitespace-normal px-3 py-3 text-center text-sm leading-snug shadow-none transition-[filter,transform,opacity] duration-200 hover:brightness-[1.06] active:translate-y-px lg:min-h-[3.25rem] lg:px-3.5 lg:py-3";
const aiPlannerBtnCancel = cn(
  plannerDialogFooterBtn,
  "border !border-[color:var(--ai-planner-cancel-border)] !bg-[color:var(--ai-planner-cancel-bg)] !text-[color:var(--ai-planner-cancel-fg)]",
);
const aiPlannerBtnManual = cn(
  plannerDialogFooterBtn,
  "border border-blue-800/40 bg-blue-900/12 text-blue-950 hover:bg-blue-900/20 dark:border-blue-700/45 dark:bg-blue-950/50 dark:text-blue-100 dark:hover:bg-blue-900/60",
);
const aiPlannerBtnQuick = cn(
  plannerDialogFooterBtn,
  "!border-[color:var(--ai-planner-quick-border)] !bg-[color:var(--ai-planner-quick-bg)] !text-[color:var(--ai-planner-quick-fg)]",
);
const aiPlannerBtnSubmit = cn(
  plannerDialogFooterBtn,
  "!border-[color:var(--ai-planner-submit-border)] !bg-[color:var(--ai-planner-submit-bg)] !text-[color:var(--ai-planner-submit-fg)]",
);
/** Same as submit colours, for controls beside inputs (no full-width row) */
const aiPlannerBtnSubmitInline = cn(
  "shrink-0 justify-center border shadow-none transition-[filter,transform] hover:brightness-[1.06] active:translate-y-px",
  "!border-[color:var(--ai-planner-submit-border)] !bg-[color:var(--ai-planner-submit-bg)] !text-[color:var(--ai-planner-submit-fg)]",
);

export function CreatePlannerTaskAiDialog({
  open,
  onOpenChange,
  locale,
  copy,
  blockMinutes,
  onAddToPlan,
  lockedProjectId,
}: Props) {
  const [phase, setPhase] = useState<Phase>("input");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<PlannerAiQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customAnswer, setCustomAnswer] = useState("");

  const [description, setDescription] = useState("");
  const [reminders, setReminders] = useState<string[]>([]);
  const [suggestedBlocks, setSuggestedBlocks] = useState("3");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [status, setStatus] = useState<Task["status"]>("todo");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");

  const [relatedProjects, setRelatedProjects] = useState<PlannerAiRelatedItem[]>([]);
  const [relatedNotes, setRelatedNotes] = useState<PlannerAiRelatedItem[]>([]);
  const [relatedKnowledge, setRelatedKnowledge] = useState<PlannerAiRelatedItem[]>([]);
  const [relatedIdeas, setRelatedIdeas] = useState<PlannerAiRelatedItem[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>([]);
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<string[]>([]);
  const [webResources, setWebResources] = useState<PlannerAiWebResource[]>([]);
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>("all");
  const [pinnedResourceUrls, setPinnedResourceUrls] = useState<string[]>([]);
  const [autofillMetadataWithAi, setAutofillMetadataWithAi] = useState(false);
  const [manualAutofillLoading, setManualAutofillLoading] = useState(false);

  const manualAutofillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualAutofillSeqRef = useRef(0);
  const manualDidAutofillRef = useRef(false);

  const createTask = useCreateTask();
  const { data: projects = [] } = useProjects();

  const parsedBlocks = useMemo(
    () => Math.min(72, Math.max(1, Math.round(Number(suggestedBlocks) || 3))),
    [suggestedBlocks],
  );

  const reset = useCallback(() => {
    setPhase("input");
    setTitle("");
    setQuestions([]);
    setQIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setCustomAnswer("");
    setDescription("");
    setReminders([]);
    setSuggestedBlocks("3");
    setPriority("medium");
    setStatus("todo");
    setDueDate("");
    setProjectId(lockedProjectId ?? "");
    setNotes("");
    setRelatedProjects([]);
    setRelatedNotes([]);
    setRelatedKnowledge([]);
    setRelatedIdeas([]);
    setSelectedNoteIds([]);
    setSelectedKnowledgeIds([]);
    setSelectedIdeaIds([]);
    setWebResources([]);
    setResourceFilter("all");
    setPinnedResourceUrls([]);
    setAutofillMetadataWithAi(false);
    setManualAutofillLoading(false);
    manualDidAutofillRef.current = false;
    manualAutofillSeqRef.current += 1;
    if (manualAutofillTimerRef.current) {
      clearTimeout(manualAutofillTimerRef.current);
      manualAutofillTimerRef.current = null;
    }
  }, [lockedProjectId]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (open && lockedProjectId) {
      setProjectId(lockedProjectId);
    }
  }, [open, lockedProjectId]);

  const startClarifying = useCallback(
    async (taskTitle: string) => {
      setPhase("loadingQuestions");
      try {
        const data = await postPlannerAi<{ questions: PlannerAiQuestion[]; source?: string }>({
          mode: "questions",
          taskTitle,
          locale,
        });
        const qs = Array.isArray(data.questions) ? data.questions : [];
        if (qs.length === 0) throw new Error("empty_questions");
        if (data.source === "fallback") {
          toast.message(copy.toastPlannerAiOfflineHint);
        }
        setQuestions(qs);
        setAnswers(new Array(qs.length).fill(""));
        setQIndex(0);
        setSelectedOption(null);
        setCustomAnswer("");
        setPhase("clarifying");
      } catch (e) {
        const unauthorized =
          e instanceof Error &&
          ("code" in e ? (e as Error & { code?: string }).code : "") ===
            "unauthorized";
        toast.error(
          unauthorized ? copy.toastAiPlannerUnauthorized : copy.toastAiPlannerError,
        );
        setPhase(unauthorized ? "input" : "error");
      }
    },
    [locale, copy],
  );

  const buildClarifications = useCallback(
    (answerList: string[]): PlannerAiClarification[] => {
      const out: PlannerAiClarification[] = [];
      questions.forEach((q, i) => {
        const a = (answerList[i] ?? "").trim();
        if (!a) return;
        out.push({ questionId: q.id, question: q.question, answer: a });
      });
      return out;
    },
    [questions],
  );

  const applyPlannerAiMetadata = useCallback(
    (data: PlannerAiMetadataResult) => {
      if (data.source === "fallback") {
        toast.message(copy.toastPlannerAiOfflineHint);
      }
      setDescription(data.description ?? "");
      setReminders(Array.isArray(data.reminders) ? data.reminders : []);
      setSuggestedBlocks(String(data.suggestedBlocks ?? 3));
      setPriority(data.suggestedPriority ?? "medium");
      if (data.suggestedStatus) setStatus(data.suggestedStatus);
      if (data.suggestedDueDate) setDueDate(data.suggestedDueDate);
      setRelatedProjects(Array.isArray(data.relatedProjects) ? data.relatedProjects : []);
      setRelatedNotes(Array.isArray(data.relatedNotes) ? data.relatedNotes : []);
      setRelatedKnowledge(
        Array.isArray(data.relatedKnowledge) ? data.relatedKnowledge : [],
      );
      setRelatedIdeas(Array.isArray(data.relatedIdeas) ? data.relatedIdeas : []);
      setWebResources(Array.isArray(data.webResources) ? data.webResources : []);
      setSelectedNoteIds(
        Array.isArray(data.relatedNotes) ? data.relatedNotes.slice(0, 3).map((x) => x.id) : [],
      );
      setSelectedKnowledgeIds(
        Array.isArray(data.relatedKnowledge)
          ? data.relatedKnowledge.slice(0, 3).map((x) => x.id)
          : [],
      );
      setSelectedIdeaIds(
        Array.isArray(data.relatedIdeas) ? data.relatedIdeas.slice(0, 3).map((x) => x.id) : [],
      );
      setProjectId((prev) => {
        if (lockedProjectId) return lockedProjectId;
        if (prev) return prev;
        const first = Array.isArray(data.relatedProjects) ? data.relatedProjects[0]?.id : undefined;
        return first ?? prev;
      });
    },
    [copy, lockedProjectId],
  );

  const generateMetadata = useCallback(
    async (taskTitle: string, clarifications: PlannerAiClarification[]) => {
      setPhase("generating");
      try {
        const data = await postPlannerAi<PlannerAiMetadataResult>({
          mode: "metadata",
          taskTitle,
          locale,
          clarifications,
          blockMinutes,
        });
        applyPlannerAiMetadata(data);
        setPhase("review");
      } catch (e) {
        const unauthorized =
          e instanceof Error &&
          ("code" in e ? (e as Error & { code?: string }).code : "") ===
            "unauthorized";
        toast.error(
          unauthorized ? copy.toastAiPlannerUnauthorized : copy.toastAiPlannerError,
        );
        setPhase(unauthorized ? "input" : "error");
      }
    },
    [applyPlannerAiMetadata, blockMinutes, copy, locale],
  );

  const fetchManualMetadata = useCallback(
    async (taskTitle: string) => {
      const seq = ++manualAutofillSeqRef.current;
      setManualAutofillLoading(true);
      try {
        const data = await postPlannerAi<PlannerAiMetadataResult>({
          mode: "metadata",
          taskTitle,
          locale,
          clarifications: [],
          blockMinutes,
        });
        if (seq !== manualAutofillSeqRef.current) return;
        applyPlannerAiMetadata(data);
        manualDidAutofillRef.current = true;
      } catch (e) {
        if (seq !== manualAutofillSeqRef.current) return;
        const unauthorized =
          e instanceof Error &&
          ("code" in e ? (e as Error & { code?: string }).code : "") ===
            "unauthorized";
        toast.error(
          unauthorized ? copy.toastAiPlannerUnauthorized : copy.toastAiPlannerError,
        );
      } finally {
        if (seq === manualAutofillSeqRef.current) {
          setManualAutofillLoading(false);
        }
      }
    },
    [applyPlannerAiMetadata, blockMinutes, copy, locale],
  );

  useEffect(() => {
    if (phase !== "manual" || !autofillMetadataWithAi) return;
    const t = title.trim();
    if (!t) {
      setManualAutofillLoading(false);
      return;
    }
    if (manualAutofillTimerRef.current) clearTimeout(manualAutofillTimerRef.current);
    const timer = setTimeout(() => {
      manualAutofillTimerRef.current = null;
      void fetchManualMetadata(t);
    }, 560);
    manualAutofillTimerRef.current = timer;
    return () => {
      if (manualAutofillTimerRef.current) {
        clearTimeout(manualAutofillTimerRef.current);
        manualAutofillTimerRef.current = null;
      }
    };
  }, [phase, autofillMetadataWithAi, title, fetchManualMetadata]);

  const goNext = useCallback(() => {
    const t = title.trim();
    if (!t || questions.length === 0) return;
    const text = customAnswer.trim() || selectedOption;
    if (!text) return;
    const nextAnswers = [...answers];
    nextAnswers[qIndex] = text;
    setAnswers(nextAnswers);
    setCustomAnswer("");
    setSelectedOption(null);
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      void generateMetadata(t, buildClarifications(nextAnswers));
    }
  }, [
    answers,
    buildClarifications,
    customAnswer,
    generateMetadata,
    qIndex,
    questions.length,
    selectedOption,
    title,
  ]);

  const skipAll = useCallback(() => {
    const t = title.trim();
    if (!t) return;
    void generateMetadata(t, []);
  }, [generateMetadata, title]);

  const handleAddQuick = useCallback(async () => {
    const t = title.trim();
    if (!t) return;
    if (lockedProjectId) {
      try {
        await createTask.mutateAsync({
          title: t,
          project_id: lockedProjectId,
          priority: "medium",
          source: "ai:gemini",
        });
      } catch {
        return;
      }
    }
    onAddToPlan(t, 1);
    if (!lockedProjectId) {
      toast.success(copy.toastCreatedAi(t));
    }
    onOpenChange(false);
  }, [copy, createTask, lockedProjectId, onAddToPlan, onOpenChange, title]);

  const handleRetry = useCallback(() => {
    const t = title.trim();
    if (!t) {
      setPhase("input");
      return;
    }
    if (questions.length === 0) {
      void startClarifying(t);
      return;
    }
    void generateMetadata(t, buildClarifications(answers));
  }, [answers, buildClarifications, generateMetadata, questions.length, startClarifying, title]);

  const handleCreate = useCallback(async () => {
    const t = title.trim();
    if (!t) return;
    const reminderLines = reminders.map((r) => r.trim()).filter(Boolean);
    const descParts = [description.trim()];
    if (notes.trim()) descParts.push(`Notes:
${notes.trim()}`);
    if (reminderLines.length > 0) {
      descParts.push(`Reminders:
${reminderLines.map((r) => `- ${r}`).join("\n")}`);
    }
    if (selectedNoteIds.length > 0) {
      descParts.push(`Related notes: ${selectedNoteIds.join(", ")}`);
    }
    if (selectedIdeaIds.length > 0) {
      descParts.push(`Related ideas: ${selectedIdeaIds.join(", ")}`);
    }
    if (selectedKnowledgeIds.length > 0) {
      descParts.push(`Related knowledge: ${selectedKnowledgeIds.join(", ")}`);
    }
    const isManualCreate = phase === "manual";
    const baseTags = isManualCreate
      ? [
          "planner-manual",
          ...(manualDidAutofillRef.current ? ["ai-metadata-autofill"] : []),
        ]
      : ["ai-generated"];
    const tags = [
      ...baseTags,
      ...selectedNoteIds.map((id) => `note:${id}`),
      ...selectedKnowledgeIds.map((id) => `knowledge:${id}`),
      ...selectedIdeaIds.map((id) => `idea:${id}`),
    ].slice(0, 20);
    const pinnedResource = webResources.find(
      (r) => pinnedResourceUrls.includes(r.url) && /^https?:\/\//i.test(r.url),
    );
    const firstResource =
      pinnedResource ?? webResources.find((r) => /^https?:\/\//i.test(r.url));

    try {
      const created = await createTask.mutateAsync({
        title: t,
        description: descParts.filter(Boolean).join("\n\n"),
        project_id: (lockedProjectId ?? projectId) || undefined,
        status,
        priority,
        due_date: dueDate || undefined,
        estimated_blocks: parsedBlocks,
        tags,
        source: isManualCreate ? "planner:manual" : "ai:gemini",
        source_url: firstResource?.url,
      });
      onAddToPlan(t, parsedBlocks, created.id);
      toast.success(copy.toastCreatedAiPlanner(t, parsedBlocks, formatBlockDurationLocalized(copy, parsedBlocks, blockMinutes)));
      onOpenChange(false);
    } catch {
      setPhase(isManualCreate ? "manual" : "review");
    }
  }, [
    phase,
    title,
    reminders,
    description,
    notes,
    selectedNoteIds,
    selectedKnowledgeIds,
    selectedIdeaIds,
    webResources,
    pinnedResourceUrls,
    createTask,
    lockedProjectId,
    projectId,
    status,
    priority,
    dueDate,
    parsedBlocks,
    onAddToPlan,
    copy,
    blockMinutes,
    onOpenChange,
  ]);

  const q = questions[qIndex];
  const showProgressDots = phase === "clarifying" && questions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={
          phase === "clarifying" || phase === "review" || phase === "manual"
            ? "2xl"
            : "sm"
        }
        showCloseButton={phase !== "generating"}
        className={cn(
          "min-w-0 transition-[opacity,transform] duration-200 ease-out",
          phase === "input" &&
            "lg:!max-w-4xl xl:!max-w-5xl",
        )}
      >
        {phase === "input" && (
          <>
            <DialogHeader>
              <DialogTitle>{copy.createAiDialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{copy.taskNameLabel}</Label>
                <Input
                  placeholder={copy.taskNamePlaceholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && title.trim()) void startClarifying(title.trim());
                  }}
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">{copy.createAiHint}</p>
              <div className={plannerDialogFooterGrid}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={aiPlannerBtnCancel}
                  onClick={() => onOpenChange(false)}
                >
                  {copy.cancel}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={aiPlannerBtnManual}
                  onClick={() => {
                    manualDidAutofillRef.current = false;
                    manualAutofillSeqRef.current += 1;
                    setAutofillMetadataWithAi(false);
                    setPhase("manual");
                  }}
                >
                  <FilePenLine className="mr-1 h-3.5 w-3.5 shrink-0" />
                  {copy.addManuallyButton}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={aiPlannerBtnQuick}
                  onClick={handleAddQuick}
                  disabled={!title.trim()}
                >
                  <Zap className="mr-1 h-3.5 w-3.5 shrink-0" />
                  {copy.addQuicklyButton}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={aiPlannerBtnSubmit}
                  onClick={() => void startClarifying(title.trim())}
                  disabled={!title.trim()}
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5 shrink-0" />
                  {copy.createWithAiButton}
                </Button>
              </div>
            </div>
          </>
        )}

        {phase === "loadingQuestions" && (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            <p className="text-sm text-muted-foreground">{copy.createAiLoadingQuestions}</p>
          </div>
        )}

        {phase === "clarifying" && q && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/15 text-pink-600 dark:text-pink-300">
                  <Bot className="h-4 w-4" />
                </span>
                {copy.createAiUnderstandHeading}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm">
                <span className="mr-2" aria-hidden>{taskTitleEmoji(title.trim())}</span>
                <span className="font-medium">{title.trim()}</span>
              </div>

              {showProgressDots && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {questions.map((_, i) => (
                      <div
                        key={i}
                        className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= qIndex ? "bg-pink-500" : "bg-muted")}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{copy.createAiQuestionProgress(qIndex + 1, questions.length)}</p>
                </div>
              )}

              <p className="text-base font-medium leading-snug">{q.question}</p>

              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setSelectedOption(opt);
                      setCustomAnswer("");
                    }}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm transition-colors",
                      selectedOption === opt
                        ? "border-pink-500 bg-pink-500 text-white shadow-sm"
                        : "border-border hover:border-pink-400/60 hover:bg-pink-500/10",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{copy.createAiCustomAnswerLabel}</Label>
                <div className="flex gap-2">
                  <Input
                    value={customAnswer}
                    onChange={(e) => {
                      setCustomAnswer(e.target.value);
                      if (e.target.value) setSelectedOption(null);
                    }}
                    placeholder={copy.createAiCustomAnswerPlaceholder}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goNext();
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={aiPlannerBtnSubmitInline}
                    onClick={goNext}
                    disabled={!customAnswer.trim() && !selectedOption}
                  >
                    {copy.createAiNext}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={skipAll}>
                {copy.createAiSkipAll}
              </button>
            </div>
          </>
        )}

        {phase === "generating" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-9 w-9 animate-spin text-pink-500" />
            <p className="text-sm text-muted-foreground">{copy.createAiGenerating}</p>
          </div>
        )}

        {(phase === "review" || phase === "manual") && (
          <>
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-base">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    phase === "manual"
                      ? "bg-violet-500/15 text-violet-600 dark:text-violet-300"
                      : "bg-pink-500/15 text-pink-600 dark:text-pink-300",
                  )}
                >
                  {phase === "manual" ? (
                    <FilePenLine className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </span>
                {copy.createAiDialogTitle}
              </DialogTitle>
              {phase === "manual" && (
                <button
                  type="button"
                  className="w-fit text-left text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  onClick={() => {
                    manualAutofillSeqRef.current += 1;
                    setAutofillMetadataWithAi(false);
                    setManualAutofillLoading(false);
                    manualDidAutofillRef.current = false;
                    setPhase("input");
                  }}
                >
                  {copy.backToCreateOptions}
                </button>
              )}
            </DialogHeader>
            <div className="max-h-[72vh] min-w-0 space-y-4 overflow-y-auto overflow-x-hidden pr-1 pb-1 transition-opacity duration-200 ease-out">

              {/* Task name */}
              <div className="space-y-1.5">
                <Label className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <Tag className="h-3.5 w-3.5 text-pink-500" />
                  {copy.taskNameLabel}
                </Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              {phase === "manual" && (
                <div className="space-y-2 rounded-xl border border-white/12 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md dark:bg-white/[0.05]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Label
                      htmlFor="planner-autofill-metadata"
                      className="cursor-pointer text-sm font-medium leading-snug"
                    >
                      {copy.autofillMetadataWithAi}
                    </Label>
                    <Checkbox
                      id="planner-autofill-metadata"
                      checked={autofillMetadataWithAi}
                      onCheckedChange={(v) => {
                        const on = v === true;
                        if (!on) {
                          manualAutofillSeqRef.current += 1;
                          manualDidAutofillRef.current = false;
                          setManualAutofillLoading(false);
                        }
                        setAutofillMetadataWithAi(on);
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{copy.autofillMetadataWithAiHint}</p>
                  {manualAutofillLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-pink-500" />
                      {copy.createAiGenerating}
                    </div>
                  )}
                </div>
              )}

              <div
                className={cn(
                  "min-w-0 rounded-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[border-color,background-color] duration-200",
                  phase === "review"
                    ? "border border-pink-300/40 bg-pink-50/40 dark:border-pink-400/25 dark:bg-pink-500/8"
                    : "border border-white/10 bg-white/[0.04] dark:bg-white/[0.04]",
                )}
              >
                {phase === "review" && (
                  <div className="mb-3 flex items-center gap-2">
                    <Badge className="border-pink-400/60 bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300">
                      <Sparkles className="mr-1 h-3 w-3" />
                      {copy.reviewAiGenerated}
                    </Badge>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 text-pink-500" />
                    {copy.reviewDescription}
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                </div>

                {/* Reminders */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <TriangleAlert className="h-3.5 w-3.5 text-pink-500" />
                      {copy.reviewReminders}
                    </Label>
                    <button
                      type="button"
                      onClick={() => setReminders((r) => [...r, ""])}
                      className="text-xs text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
                    >
                      {copy.reviewAddReminder}
                    </button>
                  </div>
                  <div className="min-w-0 space-y-2">
                    {reminders.map((r, idx) => (
                      <div key={idx} className="flex min-w-0 items-start gap-2">
                        <Textarea
                          value={r}
                          rows={2}
                          className="min-h-[2.75rem] min-w-0 flex-1 resize-y text-sm break-words [overflow-wrap:anywhere] whitespace-pre-wrap"
                          onChange={(e) =>
                            setReminders((arr) => arr.map((x, i) => (i === idx ? e.target.value : x)))
                          }
                        />
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setReminders((arr) => arr.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {reminders.length === 0 && (
                      <p className="text-xs text-muted-foreground/60 italic">—</p>
                    )}
                  </div>
                </div>

                {/* Time blocks + Priority */}
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5 text-pink-500" />
                      {copy.reviewSuggestedTimeBlocks}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setSuggestedBlocks(String(Math.max(1, parsedBlocks - 1)))}
                      >
                        −
                      </Button>
                      <div className="min-w-[3.5rem] rounded-lg border bg-background px-3 py-1.5 text-center text-sm font-bold tabular-nums">
                        {parsedBlocks}
                      </div>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setSuggestedBlocks(String(Math.min(72, parsedBlocks + 1)))}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatBlockDurationLocalized(copy, parsedBlocks, blockMinutes)}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Target className="h-3.5 w-3.5 text-pink-500" />
                      {copy.reviewSuggestedPriority}
                    </Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
                      <SelectTrigger className="text-sm">
                        <SelectValue>
                          {(v) =>
                            v === "low"
                              ? copy.reviewPriorityLow
                              : v === "medium"
                                ? copy.reviewPriorityMedium
                                : v === "high"
                                  ? copy.reviewPriorityHigh
                                  : v === "urgent"
                                    ? copy.reviewPriorityUrgent
                                    : String(v ?? "")
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{copy.reviewPriorityLow}</SelectItem>
                        <SelectItem value="medium">{copy.reviewPriorityMedium}</SelectItem>
                        <SelectItem value="high">{copy.reviewPriorityHigh}</SelectItem>
                        <SelectItem value="urgent">{copy.reviewPriorityUrgent}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Status + Due date */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-violet-500" />
                    {copy.reviewStatus}
                  </Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as Task["status"])}>
                    <SelectTrigger className="text-sm">
                      <SelectValue>
                        {(v) =>
                          v === "todo"
                            ? copy.reviewStatusTodo
                            : v === "in-progress"
                              ? copy.reviewStatusInProgress
                              : v === "done"
                                ? copy.reviewStatusDone
                                : v === "cancelled"
                                  ? copy.reviewStatusCancelled
                                  : String(v ?? "")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">{copy.reviewStatusTodo}</SelectItem>
                      <SelectItem value="in-progress">{copy.reviewStatusInProgress}</SelectItem>
                      <SelectItem value="done">{copy.reviewStatusDone}</SelectItem>
                      <SelectItem value="cancelled">{copy.reviewStatusCancelled}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{copy.reviewDueDate}</Label>
                  <DatePickerInput
                    value={dueDate}
                    onChange={(v) => setDueDate(v)}
                    className="text-sm"
                    placeholder={getCommonUiCopy(locale).pickDate}
                  />
                </div>
              </div>

              {/* Project */}
              <div className="space-y-1.5">
                <Label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Tag className="h-3.5 w-3.5 text-violet-500" />
                  {copy.reviewProject}
                </Label>
                <Select
                  value={projectId || "none"}
                  onValueChange={(v) => setProjectId(v && v !== "none" ? v : "")}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue>
                      {(v) => {
                        if (v == null || v === "" || v === "none") return copy.reviewNoProject;
                        const p = projects.find((x) => x.id === v);
                        return p?.name ?? String(v);
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{copy.reviewNoProject}</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {relatedProjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {relatedProjects.slice(0, 5).map((rp) => (
                      <button
                        key={rp.id}
                        type="button"
                        onClick={() => setProjectId(rp.id)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs transition-colors",
                          projectId === rp.id
                            ? "border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300"
                            : "border-border hover:border-pink-400/60",
                        )}
                      >
                        {rp.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes textarea */}
              <div className="space-y-1.5">
                <Label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <NotebookPen className="h-3.5 w-3.5 text-violet-500" />
                  {copy.reviewNotesLabel}
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={copy.reviewNotesPlaceholder}
                  rows={2}
                  className="text-sm"
                />
              </div>

              {/* Smart links */}
              {(relatedNotes.length > 0 || relatedKnowledge.length > 0 || relatedIdeas.length > 0) && (
                <div className="space-y-3 rounded-xl border border-violet-200/50 bg-violet-50/30 p-3 dark:border-violet-400/20 dark:bg-violet-500/8">
                  <p className="inline-flex items-center gap-1.5 text-sm font-medium">
                    <Lightbulb className="h-4 w-4 text-violet-500" />
                    {copy.reviewSmartLinks}
                  </p>
                  {relatedNotes.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">{copy.reviewRelatedNotes}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {relatedNotes.slice(0, 6).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => setSelectedNoteIds((ids) => toggleId(ids, n.id))}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs transition-colors",
                              selectedNoteIds.includes(n.id)
                                ? "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                                : "border-border hover:border-violet-400/60",
                            )}
                          >
                            {n.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {relatedKnowledge.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">{copy.reviewRelatedKnowledge}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {relatedKnowledge.slice(0, 6).map((k) => (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() => setSelectedKnowledgeIds((ids) => toggleId(ids, k.id))}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs transition-colors",
                              selectedKnowledgeIds.includes(k.id)
                                ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "border-border hover:border-amber-400/60",
                            )}
                          >
                            {k.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {relatedIdeas.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">{copy.reviewRelatedIdeas}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {relatedIdeas.slice(0, 6).map((idea) => (
                          <button
                            key={idea.id}
                            type="button"
                            onClick={() => setSelectedIdeaIds((ids) => toggleId(ids, idea.id))}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs transition-colors",
                              selectedIdeaIds.includes(idea.id)
                                ? "border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
                                : "border-border hover:border-cyan-400/60",
                            )}
                          >
                            {idea.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Related Resources with filter tabs */}
              {webResources.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="inline-flex items-center gap-1.5 text-sm font-medium">
                      <Sparkles className="h-4 w-4 text-pink-500" />
                      {copy.reviewRelatedResources}
                    </p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex gap-1 overflow-x-auto pb-0.5">
                    {(
                      [
                        { key: "all" as const, label: copy.reviewResourceAll },
                        { key: "Article" as const, label: copy.reviewResourceArticle },
                        { key: "YouTube" as const, label: copy.reviewResourceVideo },
                        { key: "Podcast" as const, label: copy.reviewResourcePodcast },
                        { key: "Shopping" as const, label: copy.reviewResourceShopping },
                      ] as { key: ResourceFilter; label: string }[]
                    ).map(({ key, label }) => {
                      const count =
                        key === "all"
                          ? webResources.length
                          : webResources.filter((r) => r.type === key).length;
                      if (count === 0 && key !== "all") return null;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setResourceFilter(key)}
                          className={cn(
                            "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            resourceFilter === key
                              ? "border-pink-500 bg-pink-500 text-white"
                              : "border-border hover:border-pink-400/60 hover:bg-pink-500/8",
                          )}
                        >
                          {key === "YouTube" && <Video className="h-3 w-3" />}
                          {key === "Podcast" && <Headphones className="h-3 w-3" />}
                          {key === "Shopping" && <ShoppingCart className="h-3 w-3" />}
                          {label}
                          <span className={cn("rounded-full px-1 text-[10px]", resourceFilter === key ? "bg-white/20" : "bg-muted")}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Resource cards */}
                  <div className="space-y-2">
                    {webResources
                      .filter((r) => resourceFilter === "all" || r.type === resourceFilter)
                      .slice(0, 6)
                      .map((r, idx) => {
                        const isPinned = pinnedResourceUrls.includes(r.url);
                        return (
                          <div
                            key={`${r.url}-${idx}`}
                            className={cn(
                              "group relative rounded-xl border p-3 transition-colors",
                              isPinned
                                ? "border-pink-400/60 bg-pink-50/40 dark:bg-pink-500/10"
                                : "border-border hover:border-pink-300/60 hover:bg-muted/30",
                            )}
                          >
                            <div className="mb-1.5 flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "border-0 px-1.5 py-0.5 text-[10px] font-medium",
                                    r.type === "YouTube" && "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
                                    r.type === "Article" && "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
                                    r.type === "Podcast" && "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
                                    r.type === "Shopping" && "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
                                    r.type === "Other" && "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {r.type === "YouTube" && <Video className="mr-0.5 h-2.5 w-2.5" />}
                                  {r.type === "Podcast" && <Headphones className="mr-0.5 h-2.5 w-2.5" />}
                                  {r.type === "Shopping" && <ShoppingCart className="mr-0.5 h-2.5 w-2.5" />}
                                  {r.type}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">{r.source}</span>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPinnedResourceUrls((urls) =>
                                      urls.includes(r.url)
                                        ? urls.filter((u) => u !== r.url)
                                        : [...urls, r.url],
                                    )
                                  }
                                  title={isPinned ? "Unpin" : "Pin"}
                                  className={cn(
                                    "rounded p-0.5 text-xs transition-colors",
                                    isPinned
                                      ? "text-pink-500"
                                      : "text-muted-foreground/40 opacity-0 group-hover:opacity-100",
                                  )}
                                >
                                  {isPinned ? "★" : "☆"}
                                </button>
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded p-0.5 text-muted-foreground/40 opacity-0 transition-colors hover:text-foreground group-hover:opacity-100"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </div>
                            <a href={r.url} target="_blank" rel="noreferrer" className="block">
                              <p className="text-sm font-medium leading-snug hover:underline">{r.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{r.description}</p>
                            </a>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="grid w-full max-w-full grid-cols-1 gap-2 sm:grid-cols-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={aiPlannerBtnCancel}
                  onClick={() => onOpenChange(false)}
                >
                  {copy.cancel}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={aiPlannerBtnSubmit}
                  onClick={() => void handleCreate()}
                  disabled={createTask.isPending || !title.trim()}
                >
                  {createTask.isPending ? copy.reviewCreating : copy.addTaskButton}
                </Button>
              </div>
            </div>
          </>
        )}

        {phase === "error" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{copy.toastAiPlannerError}</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={aiPlannerBtnCancel}
                onClick={() => onOpenChange(false)}
              >
                {copy.cancel}
              </Button>
              <Button type="button" variant="outline" size="sm" className={aiPlannerBtnSubmit} onClick={handleRetry}>
                {copy.createAiRetry}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
