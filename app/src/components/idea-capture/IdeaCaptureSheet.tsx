"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckSquare,
  FolderKanban,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Mic,
  Plus,
  Square,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/shared/rich-text-editor";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";
import { getThemedItemLabel } from "@/lib/theme-labels";
import { getThemeUiCopy } from "@/lib/i18n/theme-ui";
import { getDailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import { useAppStore } from "@/stores/app-store";
import { useIdeaCaptureStore, selectHasDraft } from "@/stores/ideaCaptureStore";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { useIdeaCaptureTrigger } from "@/hooks/useIdeaCaptureTrigger";
import { useGeminiVoiceCapture } from "@/hooks/useGeminiVoiceCapture";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { hasDraft } from "@/types/idea";
import { stripHtml } from "@/lib/utils/html";
import {
  EASE_HEAVY_GRACEFUL,
  EASE_IN_OUT_CUBIC,
  REDUCED_MOTION_FADE,
} from "@/lib/animation/easings";
import { uploadIdeaAttachment, removeIdeaAttachment } from "@/lib/idea-capture/uploadAttachment";
import { routeIdea } from "@/lib/idea-capture/routeIdea";
import { fetchAISuggestions } from "@/lib/idea-capture/aiAssist";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import { CreatePlannerTaskAiDialog } from "@/components/daily-planner/create-planner-task-ai-dialog";
import { AddKnowledgeModal } from "@/components/knowledge/AddKnowledgeModal";
import { CreateGoalAiDialog } from "@/components/goals/CreateGoalAiDialog";
import type {
  AISuggestions,
  DestinationRoute,
  ImageAttachment,
} from "@/types/idea";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Quick-Add chip options. "idea" remains the inline capture flow; all
 * others act as triggers that open a focused AI modal on top of the sheet
 * (the sheet itself stays open underneath so users can keep capturing).
 */
type ChipKind = "idea" | "project" | "task" | "knowledge" | "goal";

const CHIP_KINDS: ChipKind[] = ["idea", "project", "task", "knowledge", "goal"];

const CHIP_ICONS: Record<ChipKind, React.ComponentType<{ className?: string }>> = {
  idea: Lightbulb,
  project: FolderKanban,
  task: CheckSquare,
  knowledge: BookOpen,
  goal: Target,
};

/** Default planner block size, kept in sync with daily-planner page. */
const PLANNER_DEFAULT_BLOCK_MINUTES = 10;

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif,image/heic";
const SWIPE_DISMISS_THRESHOLD = 80;
const MAX_ATTACHMENTS = 6;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB — matches storage bucket limit.

// ─── Drag handle ──────────────────────────────────────────────────────────────

function DragHandle({ onSwipeDown }: { onSwipeDown: () => void }) {
  const touchStartY = useRef(0);

  return (
    <div
      aria-hidden="true"
      className="mx-auto mt-3 mb-0 h-1.5 w-10 rounded-full bg-muted-foreground/25 cursor-grab active:cursor-grabbing touch-none"
      onTouchStart={(e) => {
        touchStartY.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        const delta = e.changedTouches[0].clientY - touchStartY.current;
        if (delta >= SWIPE_DISMISS_THRESHOLD) onSwipeDown();
      }}
    />
  );
}

// ─── Draft restored banner ────────────────────────────────────────────────────

function DraftRestoredBanner({
  label,
  reducedMotion,
}: {
  label: string;
  reducedMotion: boolean;
}) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={
        reducedMotion
          ? REDUCED_MOTION_FADE
          : { duration: 0.18, ease: EASE_IN_OUT_CUBIC }
      }
      className="mx-5 mt-2 flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground"
    >
      <span className="size-1.5 rounded-full bg-foreground/50" aria-hidden="true" />
      {label}
    </motion.div>
  );
}

// ─── Capture kind chips ───────────────────────────────────────────────────────

/**
 * Chip strip for picking a capture mode.
 *
 * - "idea" toggles the inline text-capture mode (the default).
 * - The remaining chips are *triggers*: clicking them launches the matching
 *   AI dialog on top of the sheet without disturbing the active idea draft.
 *   The chip remains a momentary action — `selected` stays on "idea".
 */
function KindChips({
  selected,
  onSelect,
  onLaunchModal,
  labels,
  tooltips,
  groupLabel,
}: {
  selected: ChipKind;
  onSelect: (k: ChipKind) => void;
  onLaunchModal: (k: Exclude<ChipKind, "idea">) => void;
  labels: Record<ChipKind, string>;
  tooltips: Record<ChipKind, string>;
  groupLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={groupLabel}
      className="-mx-1 flex gap-1.5 overflow-x-auto px-5 pt-3 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {CHIP_KINDS.map((kind) => {
        const Icon = CHIP_ICONS[kind];
        const active = selected === kind;
        return (
          <Tooltip key={kind}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => {
                    if (kind === "idea") {
                      onSelect(kind);
                    } else {
                      onLaunchModal(kind);
                    }
                  }}
                  aria-pressed={kind === "idea" ? active : undefined}
                  aria-label={tooltips[kind]}
                  className={cn(
                    "inline-flex min-h-[2rem] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                    "transition-[background-color,color,border-color,transform] duration-150 ease-out",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    "active:scale-[0.97]",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-foreground/70 hover:border-foreground/30 hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {labels[kind]}
                  {kind !== "idea" && (
                    <Sparkles
                      className="size-3 opacity-70"
                      aria-hidden="true"
                    />
                  )}
                </button>
              }
            />
            <TooltipContent side="bottom" sideOffset={6}>
              <span className="font-medium">{tooltips[kind]}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ─── Attachment strip ─────────────────────────────────────────────────────────

function AttachmentStrip({
  attachments,
  onRemove,
  removeLabel,
  reducedMotion,
}: {
  attachments: ImageAttachment[];
  onRemove: (id: string) => void;
  removeLabel: string;
  reducedMotion: boolean;
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-5 pt-3">
      {attachments.map((att) => (
        <motion.div
          key={att.id}
          layout={!reducedMotion}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          transition={
            reducedMotion
              ? REDUCED_MOTION_FADE
              : { duration: 0.18, ease: EASE_IN_OUT_CUBIC }
          }
          className="group relative size-16 overflow-hidden rounded-md bg-muted"
        >
          {att.preview_url ? (
            <img
              src={att.preview_url}
              alt=""
              data-user-image
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="size-5 text-muted-foreground/60" aria-hidden="true" />
            </div>
          )}
          {att.upload_state === "uploading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2
                className="size-4 animate-spin text-foreground"
                aria-hidden="true"
              />
            </div>
          )}
          {att.upload_state === "error" && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-destructive/15"
              title={att.error}
            >
              <AlertCircle className="size-4 text-destructive" aria-hidden="true" />
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(att.id)}
            aria-label={removeLabel}
            className={cn(
              "absolute top-1 right-1 flex size-5 items-center justify-center rounded-full",
              "bg-foreground/80 text-background opacity-0 transition-opacity",
              "group-hover:opacity-100 focus-visible:opacity-100 focus:outline-none"
            )}
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}

// ─── AI suggestions panel ─────────────────────────────────────────────────────

function AISuggestionsPanel({
  suggestions,
  destinationLabels,
  onApplyAll,
  onDismiss,
  titleLabel,
  tagsLabel,
  destinationsLabel,
  applyAllLabel,
  dismissLabel,
  reducedMotion,
}: {
  suggestions: AISuggestions;
  destinationLabels: Record<DestinationRoute, string>;
  onApplyAll: () => void;
  onDismiss: () => void;
  titleLabel: string;
  tagsLabel: string;
  destinationsLabel: string;
  applyAllLabel: string;
  dismissLabel: string;
  reducedMotion: boolean;
}) {
  const hasTitle = Boolean(suggestions.title);
  const hasTags = suggestions.ai_tags.length > 0;
  const hasDests = suggestions.suggestedDestinations.length > 0;
  if (!hasTitle && !hasTags && !hasDests) return null;

  return (
    <motion.div
      role="region"
      aria-label="AI suggestions"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      transition={
        reducedMotion
          ? REDUCED_MOTION_FADE
          : { duration: 0.2, ease: EASE_HEAVY_GRACEFUL }
      }
      className="mx-5 mt-3 rounded-lg border border-border bg-card/60 p-3"
    >
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
        <Sparkles className="size-3" aria-hidden="true" />
        AI
      </div>
      <div className="flex flex-col gap-2">
        {hasTitle && (
          <div className="flex items-start gap-2 text-xs">
            <span className="shrink-0 text-muted-foreground">{titleLabel}:</span>
            <span className="text-foreground">{suggestions.title}</span>
          </div>
        )}
        {hasTags && (
          <div className="flex items-start gap-2 text-xs">
            <span className="shrink-0 text-muted-foreground">{tagsLabel}:</span>
            <span className="flex flex-wrap gap-1">
              {suggestions.ai_tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground/80"
                >
                  {t}
                </span>
              ))}
            </span>
          </div>
        )}
        {hasDests && (
          <div className="flex items-start gap-2 text-xs">
            <span className="shrink-0 text-muted-foreground">{destinationsLabel}:</span>
            <span className="flex flex-wrap gap-1">
              {suggestions.suggestedDestinations.map((d) => (
                <span
                  key={d}
                  className="rounded-full border border-primary/40 bg-primary/5 px-2 py-0.5 text-[11px] text-primary"
                >
                  {destinationLabels[d]}
                </span>
              ))}
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5">
        <Button variant="ghost" size="xs" onClick={onDismiss}>
          {dismissLabel}
        </Button>
        <Button size="xs" onClick={onApplyAll}>
          {applyAllLabel}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Mode toolbar ─────────────────────────────────────────────────────────────

function ModeButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: "default" | "recording" | "loading";
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full",
              "transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              variant === "recording"
                ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                : active
                  ? "bg-primary/15 text-primary hover:bg-primary/25"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          />
        }
      >
        {variant === "loading" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : variant === "recording" ? (
          <span className="relative inline-flex">
            <Icon className="size-3.5 fill-current" aria-hidden="true" />
            <span className="absolute -top-0.5 -right-0.5 size-1.5 animate-pulse rounded-full bg-destructive" />
          </span>
        ) : (
          <Icon className="size-4" aria-hidden="true" />
        )}
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        <span className="font-medium">{label}</span>
      </TooltipContent>
    </Tooltip>
  );
}

function ModeToolbar({
  ideasHref,
  goToIdeasLabel,
  onMicClick,
  onImageClick,
  onAIClick,
  voiceLabel,
  voiceTranscribingLabel,
  stopRecordingLabel,
  imageLabel,
  aiLabel,
  aiGeneratingLabel,
  voiceSupported,
  voiceUnsupportedLabel,
  isRecording,
  voiceTranscribing,
  aiLoading,
  characterCount,
}: {
  ideasHref: string;
  goToIdeasLabel: string;
  onMicClick: () => void;
  onImageClick: () => void;
  onAIClick: () => void;
  voiceLabel: string;
  voiceTranscribingLabel: string;
  stopRecordingLabel: string;
  imageLabel: string;
  aiLabel: string;
  aiGeneratingLabel: string;
  voiceSupported: boolean;
  voiceUnsupportedLabel: string;
  isRecording: boolean;
  voiceTranscribing: boolean;
  aiLoading: boolean;
  characterCount: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2">
      <span
        aria-live="polite"
        className={cn(
          "min-w-[1.5rem] select-none text-[11px] tabular-nums text-muted-foreground/60",
          characterCount === 0 && "invisible"
        )}
      >
        {characterCount > 0 ? characterCount : "0"}
      </span>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Link
          href={ideasHref}
          className={cn(
            "shrink-0 text-xs font-medium text-muted-foreground",
            "underline-offset-2 transition-colors hover:text-foreground hover:underline",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
          )}
        >
          {goToIdeasLabel}
        </Link>
        <div className="flex items-center gap-0.5">
          <ModeButton
            icon={isRecording ? Square : Mic}
            label={
              !voiceSupported
                ? voiceUnsupportedLabel
                : voiceTranscribing
                  ? voiceTranscribingLabel
                  : isRecording
                    ? stopRecordingLabel
                    : voiceLabel
            }
            disabled={!voiceSupported || voiceTranscribing}
            active={isRecording}
            variant={
              voiceTranscribing ? "loading" : isRecording ? "recording" : "default"
            }
            onClick={onMicClick}
          />
          <ModeButton
            icon={ImageIcon}
            label={imageLabel}
            onClick={onImageClick}
          />
          <ModeButton
            icon={Sparkles}
            label={aiLoading ? aiGeneratingLabel : aiLabel}
            disabled={aiLoading}
            active={aiLoading}
            variant={aiLoading ? "loading" : "default"}
            onClick={onAIClick}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Action bar ───────────────────────────────────────────────────────────────

function ActionBar({
  canSave,
  saving,
  saved,
  saveAction,
  errorMessage,
  onSave,
  onSaveAndCaptureAnother,
  ui,
}: {
  canSave: boolean;
  saving: boolean;
  saved: boolean;
  /** Which footer button initiated the in-flight save (for per-button spinners). */
  saveAction: "save" | "another" | null;
  errorMessage: string | null;
  onSave: () => void;
  onSaveAndCaptureAnother: () => void;
  ui: ReturnType<typeof getThemeUiCopy>;
}) {
  const saveBusy = saving && saveAction === "save";
  const anotherBusy = saving && saveAction === "another";
  return (
    <div className="flex flex-col gap-2 border-t border-border/60 bg-card/40 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
      {errorMessage && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-xs text-destructive"
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {errorMessage}
        </p>
      )}

      <div className="flex items-stretch gap-2">
        <Button
          size="sm"
          disabled={!canSave || saving}
          onClick={onSave}
          aria-label={ui.ideaCaptureFooterSave}
          className="min-w-0 flex-1 justify-center font-semibold"
        >
          <AnimatePresence mode="wait" initial={false}>
            {saved ? (
              <motion.span
                key="saved"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.18, ease: EASE_IN_OUT_CUBIC }}
                className="flex items-center gap-1"
              >
                <Check className="size-3.5" aria-hidden="true" />
                {ui.ideaCaptureSaved}
              </motion.span>
            ) : (
              <motion.span
                key={saveBusy ? "saving" : "save"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="inline-flex items-center gap-1"
              >
                {saveBusy && (
                  <Loader2
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {saveBusy ? ui.quickCaptureSaving : ui.ideaCaptureFooterSave}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={!canSave || saving}
          onClick={onSaveAndCaptureAnother}
          aria-label={ui.ideaCaptureFooterCaptureAnother}
          className="min-w-0 flex-1 justify-center"
        >
          {anotherBusy ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              {ui.quickCaptureSaving}
            </span>
          ) : (
            ui.ideaCaptureFooterCaptureAnother
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export function IdeaCaptureSheet() {
  // ── Store ────────────────────────────────────────────────────────────────
  const open = useIdeaCaptureStore((s) => s.open);
  const draft = useIdeaCaptureStore((s) => s.draft);
  const saveState = useIdeaCaptureStore((s) => s.saveState);
  const errorMessage = useIdeaCaptureStore((s) => s.errorMessage);
  const closeSheet = useIdeaCaptureStore((s) => s.closeSheet);
  const toggle = useIdeaCaptureStore((s) => s.toggle);
  const setDraft = useIdeaCaptureStore((s) => s.setDraft);
  const resetDraft = useIdeaCaptureStore((s) => s.resetDraft);
  const setSaveState = useIdeaCaptureStore((s) => s.setSaveState);
  const pendingDraft = useIdeaCaptureStore(selectHasDraft);

  // ── i18n ─────────────────────────────────────────────────────────────────
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getThemeUiCopy(language), [language]);
  const { uiTheme } = useTheme();
  const ideasHref = useLocalizedPath("/ideas");

  // ── Reduced motion ───────────────────────────────────────────────────────
  const reducedMotion = useReducedMotion() ?? false;

  // ── Global keyboard shortcut ─────────────────────────────────────────────
  useIdeaCaptureTrigger();

  // ── FAB label ─────────────────────────────────────────────────────────────
  const fabLabel = getThemedItemLabel("quick-capture", uiTheme, language);

  // ── Quick-Add chip labels & tooltips ─────────────────────────────────────
  const chipLabels: Record<ChipKind, string> = useMemo(
    () => ({
      idea: ui.captureKindIdea,
      project: ui.captureKindProject,
      task: ui.captureKindTask,
      knowledge: ui.captureKindKnowledge,
      goal: ui.captureKindGoal,
    }),
    [ui]
  );

  const chipTooltips: Record<ChipKind, string> = useMemo(
    () => ({
      idea: ui.captureChipTooltipIdea,
      project: ui.captureChipTooltipProject,
      task: ui.captureChipTooltipTask,
      knowledge: ui.captureChipTooltipKnowledge,
      goal: ui.captureChipTooltipGoal,
    }),
    [ui]
  );

  // Destination labels stay around for the AI-suggestions panel which
  // surfaces the routes the assistant recommends.
  const destinationLabels: Record<DestinationRoute, string> = useMemo(
    () => ({
      task: ui.ideaCaptureDestinationTask,
      kb: ui.ideaCaptureDestinationKB,
      timeline: ui.ideaCaptureDestinationTimeline,
      graph: ui.ideaCaptureDestinationGraph,
    }),
    [ui]
  );

  // ── Quick-Add modal launchers ────────────────────────────────────────────
  // The IdeaCaptureSheet stays mounted underneath these dialogs so the user
  // returns to it once the modal closes (per requirements).
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);

  const openKnowledgeModal = useKnowledgeStore((s) => s.openAddModal);
  const isKnowledgeModalOpen = useKnowledgeStore((s) => s.isAddModalOpen);

  // The Knowledge add modal is also mounted by KnowledgeLayout when on the
  // /knowledge route. To avoid double-mounting, this sheet only renders it
  // when we're not on a knowledge page.
  const pathname = usePathname();
  const onKnowledgeRoute = useMemo(
    () => /\/knowledge(?:\/|$)/.test(pathname ?? ""),
    [pathname]
  );

  const plannerCopy = useMemo(
    () => getDailyPlannerUiCopy(language),
    [language]
  );

  const handleLaunchModal = useCallback(
    (kind: Exclude<ChipKind, "idea">) => {
      switch (kind) {
        case "project":
          setProjectModalOpen(true);
          break;
        case "task":
          setTaskModalOpen(true);
          break;
        case "knowledge":
          openKnowledgeModal();
          break;
        case "goal":
          setGoalModalOpen(true);
          break;
      }
    },
    [openKnowledgeModal]
  );

  // ── Rich text editor ─────────────────────────────────────────────────────
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [editorRevision, setEditorRevision] = useState(0);

  const bumpEditorRevision = useCallback(() => {
    setEditorRevision((n) => n + 1);
  }, []);

  const syncEditorToDraft = useCallback(() => {
    const html = editorRef.current?.getHtml() ?? "";
    setDraft({ content: html });
    bumpEditorRevision();
  }, [setDraft, bumpEditorRevision]);

  const resetEditor = useCallback(() => {
    editorRef.current?.reset();
    setEditorKey((k) => k + 1);
    bumpEditorRevision();
  }, [bumpEditorRevision]);

  useEffect(() => {
    if (!open) return;
    const stored = useIdeaCaptureStore.getState().draft.content;
    queueMicrotask(() => {
      if (stored) editorRef.current?.setHtml(stored);
      bumpEditorRevision();
    });
  }, [open, editorKey, bumpEditorRevision]);

  // ── Draft restored banner ─────────────────────────────────────────────────
  const draftBannerShownRef = useRef(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  useEffect(() => {
    if (open && pendingDraft && !draftBannerShownRef.current) {
      draftBannerShownRef.current = true;
      setShowDraftBanner(true);
      const t = setTimeout(() => setShowDraftBanner(false), 2500);
      return () => clearTimeout(t);
    }
  }, [open, pendingDraft]);

  // ── Voice capture ─────────────────────────────────────────────────────────
  const appendFromVoice = useCallback(
    (text: string) => {
      const current = useIdeaCaptureStore.getState().draft;
      const html = editorRef.current?.getHtml() ?? current.content;
      const plain = editorRef.current?.getText() ?? stripHtml(html);
      const joiner =
        plain.length === 0
          ? ""
          : /\s$/.test(plain)
            ? ""
            : " ";
      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const nextHtml = html + (plain.length === 0 ? escaped : joiner + escaped);
      editorRef.current?.setHtml(nextHtml);
      setDraft({
        content: nextHtml,
        sourceType: "voice",
        voiceTranscript:
          (current.voiceTranscript ?? "") +
          (current.voiceTranscript ? " " : "") +
          text,
      });
      bumpEditorRevision();
    },
    [setDraft, bumpEditorRevision]
  );

  const voice = useGeminiVoiceCapture({ onFinal: appendFromVoice });

  useEffect(() => {
    if (!voice.error) return;
    // "unsupported" is already surfaced via the mic button tooltip.
    if (voice.error === "unsupported") return;
    // Permission denials get their own actionable message.
    if (
      voice.error === "not-allowed" ||
      voice.error === "service-not-allowed"
    ) {
      toast.error(ui.ideaCaptureVoicePermissionDenied);
      return;
    }
    if (voice.error.includes("Gemini is not configured")) {
      toast.error(ui.ideaCaptureVoiceGeminiUnavailable);
      return;
    }
    toast.error(ui.ideaCaptureVoiceError);
  }, [voice.error, ui]);

  useEffect(() => {
    if (!open) {
      voice.invalidate();
      voice.stop();
    }
  }, [open, voice.invalidate, voice.stop]);

  const handleMicClick = useCallback(() => {
    if (!voice.supported || voice.transcribing) return;
    if (voice.isRecording) voice.stop();
    else void voice.start();
  }, [voice]);

  // ── Image upload ──────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = ""; // allow picking the same file again
      if (files.length === 0) return;

      for (const file of files) {
        // Budget guards — fetch fresh each iteration so sequential picks count.
        const snapshot = useIdeaCaptureStore.getState().draft;
        if (snapshot.attachments.length >= MAX_ATTACHMENTS) {
          toast.error(ui.ideaCaptureAttachmentLimitReached);
          break;
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
          toast.error(ui.ideaCaptureAttachmentTooLarge);
          continue;
        }

        const tempId = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);
        const pending: ImageAttachment = {
          id: tempId,
          file,
          preview_url: previewUrl,
          mime_type: file.type,
          size: file.size,
          upload_state: "uploading",
        };
        setDraft({ attachments: [...snapshot.attachments, pending] });

        try {
          const uploaded = await uploadIdeaAttachment(file);
          const latest = useIdeaCaptureStore.getState().draft;
          const next = latest.attachments.map((a) =>
            a.id === tempId
              ? { ...uploaded, preview_url: previewUrl }
              : a
          );
          setDraft({ attachments: next });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          toast.error(ui.ideaCaptureUploadFailed);
          const latest = useIdeaCaptureStore.getState().draft;
          const next = latest.attachments.map((a) =>
            a.id === tempId
              ? { ...a, upload_state: "error" as const, error: message }
              : a
          );
          setDraft({ attachments: next });
          URL.revokeObjectURL(previewUrl);
        }
      }
    },
    [setDraft, ui]
  );

  const handleRemoveAttachment = useCallback(
    async (id: string) => {
      const current = useIdeaCaptureStore.getState().draft;
      const target = current.attachments.find((a) => a.id === id);
      setDraft({
        attachments: current.attachments.filter((a) => a.id !== id),
      });
      if (target?.preview_url) URL.revokeObjectURL(target.preview_url);
      if (target?.storage_path) {
        try {
          await removeIdeaAttachment(target.storage_path);
        } catch {
          /* best-effort cleanup — user already removed it from the UI */
        }
      }
    },
    [setDraft]
  );

  // ── AI suggestions ────────────────────────────────────────────────────────
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  const cancelInFlightAI = useCallback(() => {
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
  }, []);

  const handleAIClick = useCallback(async () => {
    if (aiLoading) return;
    const html = editorRef.current?.getHtml() ?? draft.content;
    const content = stripHtml(html).trim();
    if (content.length < 4) return;
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiLoading(true);
    try {
      const result = await fetchAISuggestions({
        content,
        existingKind: draft.captureKind,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setSuggestions(result);
    } catch (err) {
      if ((err as DOMException | undefined)?.name === "AbortError") return;
      toast.error(ui.ideaCaptureAIFailed);
    } finally {
      if (aiAbortRef.current === controller) aiAbortRef.current = null;
      setAiLoading(false);
    }
  }, [aiLoading, draft.content, draft.captureKind, ui]);

  // When the sheet closes (via any path), cancel pending AI and release
  // attachment object URLs. Unmount-time cleanup sits in a separate effect.
  useEffect(() => {
    if (!open) cancelInFlightAI();
  }, [open, cancelInFlightAI]);
  useEffect(() => () => cancelInFlightAI(), [cancelInFlightAI]);

  const handleApplySuggestions = useCallback(() => {
    if (!suggestions) return;
    const current = useIdeaCaptureStore.getState().draft;
    const mergedDestinations = Array.from(
      new Set([...current.destinations, ...suggestions.suggestedDestinations])
    );
    setDraft({
      title: suggestions.title ?? current.title,
      destinations: mergedDestinations as DestinationRoute[],
      captureKind: suggestions.suggestedKind ?? current.captureKind,
    });
    setSuggestions(null);
  }, [suggestions, setDraft]);

  // Drop any live object URLs on the current draft before we reset it.
  const revokeDraftPreviews = useCallback(() => {
    for (const att of useIdeaCaptureStore.getState().draft.attachments) {
      if (att.preview_url) URL.revokeObjectURL(att.preview_url);
    }
  }, []);

  // ── Save flow ─────────────────────────────────────────────────────────────
  const saveInFlightRef = useRef(false);
  const handleSave = useCallback(
    async (andCaptureAnother = false) => {
      // Guard against rapid double-invocation (clicking + Cmd+Enter).
      if (saveInFlightRef.current) return;

      const html = editorRef.current?.getHtml() ?? "";
      const text = editorRef.current?.getText().trim() ?? "";
      const content = html.trim() || text;
      const snapshot = {
        ...useIdeaCaptureStore.getState().draft,
        content,
      };

      if (!hasDraft(snapshot)) return;
      saveInFlightRef.current = true;

      // Drop any in-flight Gemini transcripts, then stop the mic.
      voice.invalidate();
      if (voice.isRecording) voice.stop();
      // Cancel any in-flight AI call; its suggestions wouldn't be applied anyway.
      cancelInFlightAI();
      setSaveState("saving");
      try {
        const result = await routeIdea(snapshot);

        setSaveState("saved");

        // Per-destination confirmation toasts.
        const summaryBits: string[] = [];
        if (result.taskIds.length > 0) summaryBits.push(ui.ideaCaptureRoutedToTasks);
        if (result.knowledgeItemId) summaryBits.push(ui.ideaCaptureRoutedToKB);
        if (result.nodeIds.length > 0) summaryBits.push(ui.ideaCaptureRoutedToGraph);
        const title =
          summaryBits.length > 0 ? summaryBits.join(" · ") : ui.ideaCaptureSaved;

        toast.success(title, {
          action: {
            label: ui.ideaCaptureGoToIdeas,
            onClick: () => {
              window.location.href = ideasHref;
            },
          },
        });

        if (result.partialErrors.length > 0) {
          console.warn("[idea-capture] Partial routing errors:", result.partialErrors);
        }

        if (andCaptureAnother) {
          revokeDraftPreviews();
          resetDraft();
          resetEditor();
          setSuggestions(null);
          setSaveState("idle");
        } else {
          setTimeout(() => {
            revokeDraftPreviews();
            resetDraft();
            resetEditor();
            setSuggestions(null);
            closeSheet();
            setSaveState("idle");
          }, 800);
        }
      } catch (err) {
        // Log the real error so DevTools shows e.g. Postgres error code 42703
        // (undefined_column) when migrations haven't been pushed.
        console.error("[idea-capture] save failed:", err);
        const message =
          (err as { message?: unknown })?.message &&
          typeof (err as { message: unknown }).message === "string"
            ? (err as { message: string }).message
            : ui.ideaCaptureErrorSave;
        setSaveState("error", message);
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [
      voice,
      ideasHref,
      ui,
      setSaveState,
      resetDraft,
      resetEditor,
      closeSheet,
      cancelInFlightAI,
      revokeDraftPreviews,
    ]
  );

  // ── Footer save buttons: track which action is in-flight (per-button spinners)
  const [footerSaveAction, setFooterSaveAction] = useState<
    "save" | "another" | null
  >(null);

  useEffect(() => {
    if (!open) setFooterSaveAction(null);
  }, [open]);

  useEffect(() => {
    if (saveState === "idle" || saveState === "error") {
      setFooterSaveAction(null);
    }
  }, [saveState]);

  // ── Keyboard shortcuts inside the sheet ───────────────────────────────────
  const handleSheetKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          setFooterSaveAction("another");
          void handleSave(true);
        } else {
          setFooterSaveAction("save");
          void handleSave(false);
        }
      }
    },
    [handleSave]
  );

  const saving = saveState === "saving";
  const saved = saveState === "saved";
  const canSave = hasDraft(draft) && !saving && !saved;
  const [characterCount, setCharacterCount] = useState(() => stripHtml(draft.content).length);
  useEffect(() => {
    setCharacterCount(editorRef.current?.getText().length ?? stripHtml(draft.content).length);
  }, [editorRevision, draft.content]);

  return (
    <TooltipProvider delay={250}>
      {/* ── FAB trigger ────────────────────────────────────────────────── */}
      <Button
        onClick={toggle}
        title={`${fabLabel} (⌘⇧I)`}
        className={cn(
          "fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] right-6 z-40 size-14 rounded-full",
          "bg-primary text-primary-foreground",
          "shadow-lg shadow-foreground/10 dark:shadow-primary/20",
          "ring-1 ring-foreground/5 dark:ring-primary/30",
          "transition-[transform,box-shadow] duration-200 ease-out",
          "hover:bg-primary/90 hover:scale-105 hover:shadow-xl",
          "active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        size="icon"
        aria-label={fabLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Plus className="size-6" aria-hidden="true" />
        {pendingDraft && !open && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-2 right-2 size-2 rounded-full",
              "bg-primary-foreground ring-2 ring-primary"
            )}
          />
        )}
      </Button>

      {/* Hidden file input — outside the Sheet so it survives dismissal */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* ── Sheet ──────────────────────────────────────────────────────── */}
      <Sheet
        open={open}
        onOpenChange={(isOpen: boolean) => {
          if (!isOpen) closeSheet();
        }}
      >
        <SheetContent
          side="bottom-card"
          showCloseButton={false}
          className="gap-0 p-0 sm:max-w-xl"
          onKeyDown={handleSheetKeyDown}
          aria-label={ui.ideaCaptureSheetTitle}
        >
          <DragHandle onSwipeDown={closeSheet} />

          <SheetHeader className="flex-row items-center justify-between px-5 pt-3 pb-0">
            <SheetTitle className="text-base font-semibold tracking-tight">
              {ui.ideaCaptureSheetTitle}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={closeSheet}
              aria-label={ui.ideaCaptureAriaClose}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </SheetHeader>

          <AnimatePresence initial={false}>
            {showDraftBanner && (
              <DraftRestoredBanner
                label={ui.ideaCaptureDraftRestored}
                reducedMotion={reducedMotion}
              />
            )}
          </AnimatePresence>

          <KindChips
            selected="idea"
            onSelect={() => setDraft({ captureKind: "idea" })}
            onLaunchModal={handleLaunchModal}
            labels={chipLabels}
            tooltips={chipTooltips}
            groupLabel={ui.ideaCaptureAriaGroupKind}
          />

          <div className="px-5 pt-3">
            <RichTextEditor
              key={editorKey}
              ref={editorRef}
              initialHtml=""
              placeholder={ui.ideaCapturePlaceholder}
              minHeightClass="min-h-[8rem] max-h-[40dvh] overflow-y-auto"
              onChange={syncEditorToDraft}
            />
            {(voice.isRecording || voice.transcribing) && (
              <p
                role="status"
                aria-live="polite"
                className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-destructive"
              >
                {voice.isRecording && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block size-1.5 animate-pulse rounded-full bg-destructive" />
                    {ui.ideaCaptureRecording}
                  </span>
                )}
                {voice.transcribing && (
                  <span className="italic text-muted-foreground">
                    {ui.ideaCaptureVoiceTranscribing}
                  </span>
                )}
              </p>
            )}
          </div>

          <AttachmentStrip
            attachments={draft.attachments}
            onRemove={handleRemoveAttachment}
            removeLabel={ui.ideaCaptureRemoveAttachment}
            reducedMotion={reducedMotion}
          />

          <AnimatePresence initial={false}>
            {suggestions && (
              <AISuggestionsPanel
                suggestions={suggestions}
                destinationLabels={destinationLabels}
                onApplyAll={handleApplySuggestions}
                onDismiss={() => setSuggestions(null)}
                titleLabel={ui.ideaCaptureSuggestedTitle}
                tagsLabel={ui.ideaCaptureSuggestedTags}
                destinationsLabel={ui.ideaCaptureSuggestedDestinations}
                applyAllLabel={ui.ideaCaptureAIApplyAll}
                dismissLabel={ui.ideaCaptureAIDismiss}
                reducedMotion={reducedMotion}
              />
            )}
          </AnimatePresence>

          <ModeToolbar
            ideasHref={ideasHref}
            goToIdeasLabel={ui.ideaCaptureGoToIdeas}
            onMicClick={handleMicClick}
            onImageClick={handleImageClick}
            onAIClick={handleAIClick}
            voiceLabel={ui.ideaCaptureModeVoice}
            voiceTranscribingLabel={ui.ideaCaptureVoiceTranscribing}
            stopRecordingLabel={ui.ideaCaptureStopRecording}
            imageLabel={ui.ideaCaptureModeImage}
            aiLabel={ui.ideaCaptureModeAIAssist}
            aiGeneratingLabel={ui.ideaCaptureAIGenerating}
            voiceSupported={voice.supported}
            voiceUnsupportedLabel={ui.ideaCaptureVoiceUnsupported}
            isRecording={voice.isRecording}
            voiceTranscribing={voice.transcribing}
            aiLoading={aiLoading}
            characterCount={characterCount}
          />

          <ActionBar
            canSave={canSave}
            saving={saving}
            saved={saved}
            saveAction={footerSaveAction}
            errorMessage={errorMessage}
            onSave={() => {
              setFooterSaveAction("save");
              void handleSave(false);
            }}
            onSaveAndCaptureAnother={() => {
              setFooterSaveAction("another");
              void handleSave(true);
            }}
            ui={ui}
          />
        </SheetContent>
      </Sheet>

      {/* ── Quick-Add modals (open on top of the Sheet) ────────────────── */}
      <CreateProjectModal
        open={projectModalOpen}
        onOpenChange={setProjectModalOpen}
      />

      <CreatePlannerTaskAiDialog
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        locale={language}
        copy={plannerCopy}
        blockMinutes={PLANNER_DEFAULT_BLOCK_MINUTES}
        onAddToPlan={() => {
          /* no-op: when launched from the capture sheet we just create the
             task and rely on the dialog's own success toast. The user stays
             in the capture sheet to continue jotting ideas. */
        }}
      />

      <CreateGoalAiDialog
        open={goalModalOpen}
        onOpenChange={setGoalModalOpen}
      />

      {/* The Knowledge add modal is also rendered by KnowledgeLayout when on
          /knowledge — guard against double-mount by only rendering it here
          off-route. */}
      {!onKnowledgeRoute && isKnowledgeModalOpen && <AddKnowledgeModal />}
    </TooltipProvider>
  );
}
