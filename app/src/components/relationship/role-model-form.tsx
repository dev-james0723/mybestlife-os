"use client";

/**
 * RoleModelForm
 *
 * The full create/edit experience for a Role Model, rendered inside a
 * SlideOverPanel by the parent view.
 *
 * Highlights:
 * - Hero "Auto-fill with AI" interaction at the top — the signature feature
 *   of the page. Distinct from regular form controls visually.
 * - 5 logical sections: Essentials → Profile → Wisdom → Links → Personal.
 * - All free-form data is editable after AI fills it. AI never silently saves.
 * - Saves are still optimistic via the React Query mutation hooks, called by
 *   the parent.
 *
 * This component is *fully controlled* by the parent (`open`, `mode`,
 * `initial`, `onSubmit`, etc.). It owns its internal draft state, but emits
 * the final clean payload on submit.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  OSControl,
  OSGlassPanel,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import { osDialogSurfaceClassName } from "@/components/ui/os-glass";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import {
  KeyLessonsEditor,
  LinksEditor,
  PhotoEditor,
  QuotesEditor,
  TagsEditor,
} from "@/components/relationship/role-model-editors";
import { useAppStore } from "@/stores/app-store";
import {
  formatRelationshipCopy,
  getRelationshipUiCopy,
  type RelationshipUiCopy,
} from "@/lib/i18n/relationship-ui";
import {
  useRoleModelAutoFill,
  type UseRoleModelAutoFillReturn,
} from "@/hooks/use-role-model-auto-fill";
import {
  deleteRoleModelPhoto,
  isRoleModelStorageUrl,
} from "@/lib/role-models/photo-storage";
import type { RoleModelPhotoUploadErrorCode } from "@/hooks/use-role-model-photo-upload";
import {
  ROLE_MODEL_LINK_KINDS,
  ROLE_MODEL_SUGGESTED_CATEGORIES,
  type RoleModelKeyLesson,
  type RoleModelLink,
  type RoleModelLinkKind,
  type RoleModelQuote,
  type RoleModelSuggestedCategory,
} from "@/types/role-model";
import type { RoleModel, Project, Goal, Note, Task } from "@/types/database";
import type { CreateRoleModelInput } from "@/lib/repositories/role-models";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  relationshipDialogFooterClassName,
  relationshipFieldClassName,
  relationshipInnerPanelClassName,
  relationshipSelectTriggerClassName,
  relationshipTextAreaClassName,
} from "@/components/relationship/relationship-os";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";

// ============================================================================
// Types & helpers
// ============================================================================

export type RoleModelFormSubmit = {
  /** Clean payload ready for `useCreateRoleModel` / `useUpdateRoleModel`. */
  payload: CreateRoleModelInput;
};

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  /** Existing role model when editing. Null/undefined when creating. */
  initial?: RoleModel | null;
  onClose: () => void;
  onSubmit: (data: RoleModelFormSubmit) => Promise<void> | void;
  /** Only shown in edit mode. */
  onDelete?: () => void;
  /** Linked-entity sources (already loaded by the view). */
  projects: Project[];
  goals: Goal[];
  notes: Note[];
  /** Optional — passed to AI autofill so it can infer related project links via tasks. */
  tasks?: Task[];
  /** Disable the save button while a save mutation is in-flight. */
  isSaving?: boolean;
};

type FormState = {
  name: string;
  photo_url: string | null;
  category: string | null;
  admiration_blurb: string | null;
  bio: string | null;
  quotes: RoleModelQuote[];
  key_lessons: RoleModelKeyLesson[];
  tags: string[];
  links: RoleModelLink[];
  notes: string | null;
  is_favorite: boolean;
  linked_project_ids: string[];
  linked_goal_ids: string[];
  linked_note_ids: string[];
};

const EMPTY_FORM: FormState = {
  name: "",
  photo_url: null,
  category: null,
  admiration_blurb: null,
  bio: null,
  quotes: [],
  key_lessons: [],
  tags: [],
  links: [],
  notes: null,
  is_favorite: false,
  linked_project_ids: [],
  linked_goal_ids: [],
  linked_note_ids: [],
};

function fromRoleModel(rm: RoleModel): FormState {
  // Bio supersedes legacy `description` but we fall back so existing rows
  // don't appear blank to the user.
  return {
    name: rm.name,
    photo_url: rm.photo_url ?? rm.image_url ?? null,
    category: rm.category ?? null,
    admiration_blurb: rm.admiration_blurb ?? null,
    bio: rm.bio ?? rm.description ?? null,
    quotes: rm.quotes ?? [],
    key_lessons: rm.key_lessons ?? [],
    tags: rm.tags ?? [],
    links: rm.links ?? [],
    notes: rm.notes ?? null,
    is_favorite: rm.is_favorite,
    linked_project_ids: [...rm.linked_project_ids],
    linked_goal_ids: [...rm.linked_goal_ids],
    linked_note_ids: [...rm.linked_note_ids],
  };
}

function toPayload(form: FormState): CreateRoleModelInput {
  // Drop empty entries that snuck into the editors (placeholder rows).
  const cleanQuotes = form.quotes.filter((q) => q.text.trim().length > 0);
  const cleanLessons = form.key_lessons.filter(
    (l) => l.title.trim().length > 0,
  );
  const cleanLinks = form.links.filter(
    (l) => l.label.trim().length > 0 && l.url.trim().length > 0,
  );

  const trimmedBio = form.bio?.trim() || null;

  return {
    name: form.name.trim(),
    photo_url: form.photo_url?.trim() || null,
    category: form.category?.trim() || null,
    admiration_blurb: form.admiration_blurb?.trim() || null,
    bio: trimmedBio,
    quotes: cleanQuotes,
    key_lessons: cleanLessons,
    tags: form.tags
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0),
    links: cleanLinks,
    notes: form.notes?.trim() || null,
    is_favorite: form.is_favorite,
    linked_project_ids: form.linked_project_ids,
    linked_goal_ids: form.linked_goal_ids,
    linked_note_ids: form.linked_note_ids,
    // Keep the legacy mirror filled so old read paths still work until they
    // migrate. The DB has no NOT NULL on `description`, so this is purely
    // belt-and-braces.
    description: trimmedBio,
    image_url: form.photo_url?.trim() || null,
  };
}

// ============================================================================
// Component
// ============================================================================

export function RoleModelForm({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
  onDelete,
  projects,
  goals,
  notes,
  tasks = [],
  isSaving = false,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const autofill = useRoleModelAutoFill();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // Snapshot of the form at the moment it was last seeded — used to detect
  // unsaved changes so we can prompt before discarding. Stored as the JSON
  // string so equality checks are cheap and array/object identity isn't a
  // false-positive trigger.
  const [baseline, setBaseline] = useState<string>(() =>
    JSON.stringify(EMPTY_FORM),
  );
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Re-seed the form whenever the panel opens or the initial row changes.
  useEffect(() => {
    if (!open) return;
    const seeded = initial ? fromRoleModel(initial) : EMPTY_FORM;
    // Intentional prop-to-local form sync when the sheet opens or changes rows.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(seeded);
    setBaseline(JSON.stringify(seeded));
    autofill.reset();
    // We intentionally exclude `autofill` from deps — it's stable across
    // renders and re-running this effect on its identity changes would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  // Dirty when the current form deviates from what we seeded (or what was
  // last saved). Cheap because `form` is a small POJO. Includes any AI-fill
  // changes — if you close right after auto-filling and haven't saved, we
  // still warn. That's intentional: AI-filled content is real work.
  const isDirty = useMemo(
    () => JSON.stringify(form) !== baseline,
    [form, baseline],
  );

  // Single chokepoint for "the user wants to close". When dirty, show the
  // discard alert. Otherwise close immediately. Used by the Cancel button,
  // SlideOverPanel's Esc / outside-click, and any future close trigger.
  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  const confirmDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    onClose();
  }, [onClose]);

  const handleAutoFill = async () => {
    if (!form.name.trim()) {
      toast.error(copy.rmAutoFillErrorMissingName);
      return;
    }

    const autofillContext = {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      })),
      goals: goals.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        project_id: t.project_id,
      })),
    };

    const result = await autofill.run(form.name, autofillContext);
    if (!result) {
      // The state already reflects the error/cancellation; nudge the user.
      if (autofill.error) {
        toast.error(
          autofill.error === "MISSING_NAME"
            ? copy.rmAutoFillErrorMissingName
            : copy.rmAutoFillErrorGeneric,
          autofill.errorDetail
            ? { description: autofill.errorDetail.slice(0, 400) }
            : undefined,
        );
      }
      return;
    }

    // Merge the AI result into the form. Fields the user already typed are
    // preserved (we never overwrite non-empty values silently).
    setForm((prev) => ({
      ...prev,
      name: prev.name || result.name,
      photo_url: prev.photo_url || result.photo_url,
      category: prev.category || result.category,
      admiration_blurb: prev.admiration_blurb || result.admiration_blurb,
      bio: prev.bio || result.bio,
      quotes: prev.quotes.length > 0 ? prev.quotes : result.quotes,
      key_lessons:
        prev.key_lessons.length > 0 ? prev.key_lessons : result.key_lessons,
      tags: prev.tags.length > 0 ? prev.tags : result.tags,
      links: prev.links.length > 0 ? prev.links : result.links,
      linked_project_ids:
        prev.linked_project_ids.length > 0
          ? prev.linked_project_ids
          : result.linked_project_ids,
      linked_goal_ids:
        prev.linked_goal_ids.length > 0
          ? prev.linked_goal_ids
          : result.linked_goal_ids,
      linked_note_ids:
        prev.linked_note_ids.length > 0
          ? prev.linked_note_ids
          : result.linked_note_ids,
    }));

    toast.success(copy.rmAutoFillToastSuccess);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = toPayload(form);
    // Snapshot the previous storage URL (if any) before submitting. We only
    // clean it up *after* the parent's onSubmit resolves so a failed save
    // doesn't leave the user without their photo.
    const previousPhoto = initial?.photo_url ?? initial?.image_url ?? null;
    await onSubmit({ payload });
    // Reset the dirty baseline to the just-saved form so a subsequent close
    // doesn't prompt the user (the data is already persisted).
    setBaseline(JSON.stringify(form));
    if (
      previousPhoto &&
      previousPhoto !== payload.photo_url &&
      isRoleModelStorageUrl(previousPhoto)
    ) {
      void deleteRoleModelPhoto(previousPhoto);
    }
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateString = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value || null }));
  };

  const toggleLinked = (
    field: "linked_project_ids" | "linked_goal_ids" | "linked_note_ids",
    id: string,
    on: boolean,
  ) => {
    setForm((f) => ({
      ...f,
      [field]: on ? [...f[field], id] : f[field].filter((x) => x !== id),
    }));
  };

  const linkKindOptions = useMemo(
    () => buildLinkKindOptions(copy),
    [copy],
  );
  const categoryOptions = useMemo(
    () => buildCategoryOptions(copy),
    [copy],
  );

  // Show the "review-first" banner whenever AI succeeded *and* the user
  // hasn't yet edited the name field substantially. We use the simpler
  // heuristic of "show until a save happens" — clearing happens on close.
  const showReviewBanner = autofill.status === "success";

  // A signal that flips on every successful AI fill — used by the FormSection
  // wrapper to play a one-shot entrance and by the aria-live region.
  const aiPulse =
    autofill.status === "success" ? autofill.meta?.generated_at ?? null : null;

  const formId = "role-model-form";

  return (
    <>
    <SlideOverPanel
      open={open}
      onClose={requestClose}
      title={mode === "create" ? copy.rmCreateTitle : copy.rmEditTitle}
      width="2xl"
      footer={
        <div className={cn(relationshipDialogFooterClassName, "justify-between sm:justify-between")}>
          {mode === "edit" && onDelete ? (
            <OSControl
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {copy.delete}
            </OSControl>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <OSControl type="button" variant="outline" onClick={requestClose}>
              {copy.cancel}
            </OSControl>
            <OSPrimaryAction
              type="submit"
              form={formId}
              disabled={!form.name.trim() || isSaving}
            >
              {isSaving ? copy.saving : mode === "create" ? copy.create : copy.save}
            </OSPrimaryAction>
          </div>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-8">
        {/* ----- AI hero ----- */}
        <AiHero
          copy={copy}
          autofill={autofill}
          name={form.name}
          onNameChange={(v) => update("name", v)}
          onRun={handleAutoFill}
        />

        {/*
          aria-live region announces the AI-fill completion to assistive tech
          without visually changing anything (sr-only). Polite politeness
          is correct here — this is an enrichment, not an interruption.
        */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {autofill.status === "success" ? copy.rmAutoFillAriaAnnounce : ""}
        </div>

        {showReviewBanner && (
          <ReviewBanner copy={copy} model={autofill.meta?.extraction_model} />
        )}

        {/* ----- Section 1: Essentials ----- */}
        <FormSection title={copy.rmFormSectionEssentials} pulseSignal={aiPulse}>
          <PhotoEditor
            value={form.photo_url}
            onChange={(v) => update("photo_url", v)}
            fallbackText={form.name}
            roleModelId={initial?.id ?? null}
            // Pulse the avatar when AI fills in a fresh photo URL. Using
            // `generated_at` ensures the signal changes on every new AI fill,
            // even if the result re-uses the same photo URL.
            pulseSignal={
              autofill.status === "success" && autofill.result?.photo_url
                ? autofill.meta?.generated_at ?? autofill.result.photo_url
                : null
            }
            onUploaded={({ previousUrl, nextUrl }) => {
              if (
                previousUrl &&
                previousUrl !== nextUrl &&
                isRoleModelStorageUrl(previousUrl)
              ) {
                // Best-effort orphan cleanup of the previously-hosted photo.
                void deleteRoleModelPhoto(previousUrl);
              }
              toast.success(copy.rmPhotoUploadSuccessToast);
            }}
            labelPhoto={copy.rmLabelPhoto}
            placeholder={copy.rmLabelPhotoUrlPlaceholder}
            removeLabel={copy.rmRemove}
            uploadTabLabel={copy.rmPhotoTabUpload}
            urlTabLabel={copy.rmPhotoTabUrl}
            dropzoneIdle={copy.rmPhotoDropzoneIdle}
            dropzoneActive={copy.rmPhotoDropzoneActive}
            dropzoneHint={copy.rmPhotoDropzoneHint}
            dropzoneBrowse={copy.rmPhotoDropzoneBrowse}
            uploadingLabel={copy.rmPhotoUploading}
            fileInputAria={copy.rmPhotoFileInputAria}
            errorMessages={photoErrorMessages(copy)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rm-category">{copy.rmLabelCategory}</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  value={
                    isSuggestedCategory(form.category)
                      ? form.category
                      : "__custom"
                  }
                  onValueChange={(v) =>
                    update("category", v === "__custom" ? form.category : v)
                  }
                >
                  <SelectTrigger
                    className={cn(
                      relationshipSelectTriggerClassName,
                      "w-full sm:w-[180px]",
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="rm-category"
                  value={form.category ?? ""}
                  onChange={(e) =>
                    update("category", e.target.value || null)
                  }
                  placeholder={copy.rmLabelCategoryPlaceholder}
                  className={cn(relationshipFieldClassName, "flex-1")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{copy.rmLabelFavorite}</Label>
              <button
                type="button"
                onClick={() => update("is_favorite", !form.is_favorite)}
                className={cn(
                  relationshipSelectTriggerClassName,
                  "flex w-full items-center gap-2 px-3 text-left",
                  form.is_favorite && "border-lime-300/60 bg-lime-300/12",
                )}
                aria-pressed={form.is_favorite}
                aria-label={
                  form.is_favorite
                    ? copy.rmFavoriteRemoveAria
                    : copy.rmFavoriteAddAria
                }
              >
                <Sparkles
                  className={cn(
                    "h-4 w-4",
                    form.is_favorite ? "text-primary" : "text-muted-foreground",
                  )}
                  fill={form.is_favorite ? "currentColor" : "none"}
                />
                <span className={form.is_favorite ? "text-foreground" : "text-muted-foreground"}>
                  {form.is_favorite
                    ? copy.rmFavoriteRemoveAria
                    : copy.rmFavoriteAddAria}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rm-blurb">{copy.rmLabelAdmirationBlurb}</Label>
            <Input
              id="rm-blurb"
              className={relationshipFieldClassName}
              value={form.admiration_blurb ?? ""}
              onChange={updateString("admiration_blurb")}
              placeholder={copy.rmLabelAdmirationBlurbPlaceholder}
              maxLength={280}
            />
          </div>
        </FormSection>

        {/* ----- Section 2: Profile (bio) ----- */}
        <FormSection title={copy.rmFormSectionProfile} pulseSignal={aiPulse}>
          <div className="space-y-2">
            <Label htmlFor="rm-bio">{copy.rmLabelBio}</Label>
            <Textarea
              id="rm-bio"
              className={relationshipTextAreaClassName}
              value={form.bio ?? ""}
              onChange={updateString("bio")}
              placeholder={copy.rmLabelBioPlaceholder}
              rows={6}
            />
          </div>
        </FormSection>

        {/* ----- Section 3: Wisdom ----- */}
        <FormSection title={copy.rmFormSectionWisdom} pulseSignal={aiPulse}>
          <QuotesEditor
            value={form.quotes}
            onChange={(v) => update("quotes", v)}
            label={copy.rmLabelQuotes}
            emptyText={copy.rmLabelQuotesEmpty}
            textLabel={copy.rmLabelQuoteText}
            sourceLabel={copy.rmLabelQuoteSource}
            addLabel={copy.rmAddQuote}
            removeLabel={copy.rmRemove}
          />
          <KeyLessonsEditor
            value={form.key_lessons}
            onChange={(v) => update("key_lessons", v)}
            label={copy.rmLabelKeyLessons}
            emptyText={copy.rmLabelKeyLessonsEmpty}
            titleLabel={copy.rmLabelLessonTitle}
            detailLabel={copy.rmLabelLessonDetail}
            addLabel={copy.rmAddLesson}
            removeLabel={copy.rmRemove}
          />
          <TagsEditor
            value={form.tags}
            onChange={(v) => update("tags", v)}
            label={copy.rmLabelTags}
            placeholder={copy.rmLabelTagsPlaceholder}
            helpText={copy.rmLabelTagsHelp}
            removeLabel={copy.rmRemove}
          />
        </FormSection>

        {/* ----- Section 4: Links ----- */}
        <FormSection title={copy.rmFormSectionLinks} pulseSignal={aiPulse}>
          <LinksEditor
            value={form.links}
            onChange={(v) => update("links", v)}
            kindOptions={linkKindOptions}
            label={copy.rmLabelLinks}
            emptyText={copy.rmLabelLinksEmpty}
            linkLabelLabel={copy.rmLabelLinkLabel}
            urlLabel={copy.rmLabelLinkUrl}
            kindLabel={copy.rmLabelLinkKind}
            addLabel={copy.rmAddLink}
            removeLabel={copy.rmRemove}
          />

          <LinkedEntitySection
            label={copy.rmLabelProjects}
            items={projects.map((p) => ({ id: p.id, title: p.name }))}
            selected={form.linked_project_ids}
            onToggle={(id, on) => toggleLinked("linked_project_ids", id, on)}
          />
          <LinkedEntitySection
            label={copy.rmLabelGoals}
            items={goals.map((g) => ({ id: g.id, title: g.name }))}
            selected={form.linked_goal_ids}
            onToggle={(id, on) => toggleLinked("linked_goal_ids", id, on)}
          />
          <LinkedEntitySection
            label={copy.rmLabelNotes}
            items={notes.map((n) => ({ id: n.id, title: n.title }))}
            selected={form.linked_note_ids}
            onToggle={(id, on) => toggleLinked("linked_note_ids", id, on)}
          />
        </FormSection>

        {/* ----- Section 5: Personal ----- */}
        <FormSection title={copy.rmFormSectionPersonal}>
          <div className="space-y-2">
            <Label htmlFor="rm-notes">{copy.rmLabelNotesPersonal}</Label>
            <Textarea
              id="rm-notes"
              className={relationshipTextAreaClassName}
              value={form.notes ?? ""}
              onChange={updateString("notes")}
              placeholder={copy.rmLabelNotesPersonalPlaceholder}
              rows={4}
            />
          </div>
        </FormSection>
      </form>
    </SlideOverPanel>

    {/*
      Discard confirmation. Only opens when `requestClose` detects the form
      is dirty. Living outside the SlideOverPanel keeps focus management
      sane: Radix's Dialog/Sheet primitives manage focus per-portal, so
      stacking inside another modal would otherwise trap focus oddly.
    */}
    <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
      <AlertDialogContent className={osDialogSurfaceClassName}>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.rmDiscardChangesTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy.rmDiscardChangesDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11 rounded-xl">
            {copy.rmDiscardKeepEditing}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDiscard}
            className="min-h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {copy.rmDiscardConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function FormSection({
  title,
  children,
  /**
   * Optional value that — when it changes — triggers a brief entrance
   * animation on this section. Used to call attention to AI-filled fields
   * without being a distracting always-on effect.
   */
  pulseSignal = null,
}: {
  title: string;
  children: React.ReactNode;
  pulseSignal?: string | number | null;
}) {
  return (
    <motion.section
      className={relationshipInnerPanelClassName}
      // Re-key the wrapper on each pulse so framer-motion replays initial→animate.
      key={pulseSignal ?? "section"}
      initial={pulseSignal ? { opacity: 0.5, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      <h3 className="text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </motion.section>
  );
}

function AiHero({
  copy,
  autofill,
  name,
  onNameChange,
  onRun,
}: {
  copy: RelationshipUiCopy;
  autofill: UseRoleModelAutoFillReturn;
  name: string;
  onNameChange: (v: string) => void;
  onRun: () => void;
}) {
  const isLoading = autofill.isLoading;
  const hasResult = autofill.status === "success";

  return (
    <OSGlassPanel className="p-4 sm:p-5">
      {/* Decorative halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {copy.rmAutoFillSectionTitle}
            </h3>
            <p className="text-xs text-muted-foreground text-pretty max-w-prose">
              {copy.rmAutoFillSectionHelp}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rm-name">{copy.rmLabelName}</Label>
          <Input
            id="rm-name"
            className={relationshipFieldClassName}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Marie Curie"
            autoFocus
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <OSPrimaryAction
            type="button"
            onClick={onRun}
            disabled={!name.trim() || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {hasResult ? copy.rmAutoFillCtaRefresh : copy.rmAutoFillCta}
          </OSPrimaryAction>

          {isLoading && (
            <OSControl
              type="button"
              variant="ghost"
              onClick={autofill.cancel}
            >
              {copy.cancel}
            </OSControl>
          )}

          <AutoFillStatus copy={copy} status={autofill.status} />
        </div>

        {autofill.status === "error" && (
          <ErrorPill copy={copy} error={autofill.error} />
        )}
      </div>
    </OSGlassPanel>
  );
}

function AutoFillStatus({
  copy,
  status,
}: {
  copy: RelationshipUiCopy;
  status: UseRoleModelAutoFillReturn["status"];
}) {
  if (status === "researching") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {copy.rmAutoFillResearching}
      </span>
    );
  }
  if (status === "extracting") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {copy.rmAutoFillExtracting}
      </span>
    );
  }
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-primary">
        <CheckCircle2 className="h-3 w-3" />
        {copy.rmAutoFillSuccess}
      </span>
    );
  }
  return null;
}

function ErrorPill({
  copy,
  error,
}: {
  copy: RelationshipUiCopy;
  error: string | null;
}) {
  const isMissingName = error === "MISSING_NAME";
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>
        {isMissingName ? copy.rmAutoFillErrorMissingName : copy.rmAutoFillError}
      </span>
    </div>
  );
}

function ReviewBanner({
  copy,
  model,
}: {
  copy: RelationshipUiCopy;
  model: string | undefined;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-amber-300/40 bg-amber-100/40 px-4 py-3 text-xs text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200"
    >
      <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <p>{copy.rmAutoFillReviewBanner}</p>
        {model && (
          <p className="opacity-80">
            {formatRelationshipCopy(copy.rmAutoFillMetaModel, { model })}
          </p>
        )}
      </div>
    </div>
  );
}

function LinkedEntitySection({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: { id: string; title: string }[];
  selected: string[];
  onToggle: (id: string, on: boolean) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="max-h-36 space-y-2 overflow-y-auto rounded-2xl border border-slate-200/75 bg-white/72 p-3 dark:border-white/8 dark:bg-white/[0.035]">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <Checkbox
              checked={selected.includes(item.id)}
              onCheckedChange={(checked) => onToggle(item.id, checked === true)}
            />
            <span className="truncate">{item.title}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Static option builders
// ============================================================================

function buildCategoryOptions(
  copy: RelationshipUiCopy,
): { value: RoleModelSuggestedCategory | "__custom"; label: string }[] {
  const map: Record<RoleModelSuggestedCategory, string> = {
    philosopher: copy.rmCategoryPhilosopher,
    scientist: copy.rmCategoryScientist,
    entrepreneur: copy.rmCategoryEntrepreneur,
    artist: copy.rmCategoryArtist,
    writer: copy.rmCategoryWriter,
    athlete: copy.rmCategoryAthlete,
    leader: copy.rmCategoryLeader,
    engineer: copy.rmCategoryEngineer,
    designer: copy.rmCategoryDesigner,
    musician: copy.rmCategoryMusician,
    activist: copy.rmCategoryActivist,
    teacher: copy.rmCategoryTeacher,
    explorer: copy.rmCategoryExplorer,
    spiritual: copy.rmCategorySpiritual,
    other: copy.rmCategoryOther,
  };
  return [
    ...ROLE_MODEL_SUGGESTED_CATEGORIES.map((c) => ({ value: c, label: map[c] })),
  ];
}

function isSuggestedCategory(
  v: string | null | undefined,
): v is RoleModelSuggestedCategory {
  if (!v) return false;
  return (ROLE_MODEL_SUGGESTED_CATEGORIES as readonly string[]).includes(v);
}

/**
 * Maps the upload-hook error codes to localized strings. Centralized here so
 * the translation work lives next to the rest of the form's i18n.
 */
function photoErrorMessages(
  copy: RelationshipUiCopy,
): Record<RoleModelPhotoUploadErrorCode, string> {
  return {
    wrong_type: copy.rmPhotoErrorWrongType,
    too_large: copy.rmPhotoErrorTooLarge,
    empty: copy.rmPhotoErrorEmpty,
    auth: copy.rmPhotoErrorAuth,
    unknown: copy.rmPhotoErrorUnknown,
  };
}

export function buildLinkKindOptions(
  copy: RelationshipUiCopy,
): { value: RoleModelLinkKind; label: string }[] {
  const map: Record<RoleModelLinkKind, string> = {
    wikipedia: copy.rmLinkKindWikipedia,
    official: copy.rmLinkKindOfficial,
    book: copy.rmLinkKindBook,
    article: copy.rmLinkKindArticle,
    video: copy.rmLinkKindVideo,
    podcast: copy.rmLinkKindPodcast,
    social: copy.rmLinkKindSocial,
    other: copy.rmLinkKindOther,
  };
  return ROLE_MODEL_LINK_KINDS.map((k) => ({ value: k, label: map[k] }));
}
