"use client";

/**
 * RelationshipForm
 *
 * Sectioned form body for creating/editing a relationship. Designed to be
 * dropped inside a Dialog body — owns its draft state and emits a clean
 * payload via `onSubmit`.
 *
 * Sections (top-to-bottom scan order):
 *   1. Photo (anchored at the top so it sets the visual identity)
 *   2. Essentials — name (required), category, strength, favorite + Role Model
 *   3. Contact — email, phone, social profiles
 *   4. Interaction history — last contact date, last interaction notes
 *   5. Long-form — commitments, preferences, general notes
 *   6. Linked items — projects, goals, notes, and ideas
 *   7. Tags
 *
 * Validation:
 *   - `person_name` non-empty (HTML required + JS guard).
 *   - Everything else is optional. Empty strings are normalized to `null`
 *     before submit so the DB stays clean (no "" vs null ambiguity).
 */

import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  OSControl,
  OSIconControl,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { useAppStore } from "@/stores/app-store";
import {
  formatRelationshipCopy,
  getRelationshipUiCopy,
  type RelationshipUiCopy,
} from "@/lib/i18n/relationship-ui";
import {
  CATEGORY_DROPDOWN_ORDER,
  STRENGTH_DROPDOWN_ORDER,
  getCategoryLabel,
  getStrengthLabel,
} from "@/components/relationship/utils/relationship-display";
import { RelationshipPhotoPicker } from "@/components/relationship/forms/relationship-photo-picker";
import { RelationshipTagInput } from "@/components/relationship/forms/relationship-tag-input";
import {
  relationshipDialogFooterClassName,
  relationshipFieldClassName,
  relationshipInnerPanelClassName,
  relationshipSelectTriggerClassName,
  relationshipTextAreaClassName,
} from "@/components/relationship/relationship-os";
import {
  DEFAULT_RELATIONSHIP_CATEGORY,
  DEFAULT_RELATIONSHIP_STRENGTH,
  RELATIONSHIP_SOCIAL_PLATFORMS,
  normalizeRelationshipSocialUrl,
  type RelationshipCategory,
  type RelationshipInsert,
  type RelationshipSocialLink,
  type RelationshipSocialPlatform,
  type RelationshipStrength,
} from "@/types/relationship";
import type { Goal, Idea, Note, Project } from "@/types/database";
import { normalizeRoleModelName } from "@/lib/relationships/role-model-conversion";
import { cn } from "@/lib/utils";
import {
  BriefcaseBusiness,
  AtSign,
  Camera,
  Check,
  GitFork,
  Globe2,
  Lightbulb,
  Plus,
  Sparkles,
  Star,
  StickyNote,
  Target,
  Trash2,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RelationshipFormInitial = {
  /** Used to scope photo uploads to the right storage path. */
  id?: string;
  person_name?: string;
  photo_url?: string | null;
  category?: string;
  relationship_strength?: string;
  email?: string | null;
  phone?: string | null;
  social_links?: RelationshipSocialLink[];
  last_contact_date?: string | null;
  last_interaction_notes?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  commitments_made?: string | null;
  preferences_and_details?: string | null;
  general_notes?: string | null;
  tags?: string[];
  linked_project_id?: string | null;
  linked_project_ids?: string[];
  linked_goal_ids?: string[];
  linked_note_ids?: string[];
  linked_idea_ids?: string[];
  is_favorite?: boolean;
};

export type RelationshipFormSubmission = {
  payload: RelationshipInsert;
  /** Form-only intent; the parent creates the Role Model after this row saves. */
  addToRoleModel: boolean;
};

type Props = {
  /** Existing values when editing; partial means "use defaults". */
  initial?: RelationshipFormInitial;
  projects: readonly Project[];
  goals: readonly Goal[];
  notes: readonly Note[];
  ideas: readonly Idea[];
  /** Existing Role Model names are used for friendly duplicate prevention. */
  roleModelNames?: readonly string[];
  onSubmit: (submission: RelationshipFormSubmission) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RelationshipForm({
  initial,
  projects,
  goals,
  notes,
  ideas,
  roleModelNames = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);

  // ---- draft state ----
  const [personName, setPersonName] = useState(initial?.person_name ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    initial?.photo_url ?? null,
  );
  const [category, setCategory] = useState<RelationshipCategory>(
    coerceCategory(initial?.category),
  );
  const [strength, setStrength] = useState<RelationshipStrength>(
    coerceStrength(initial?.relationship_strength),
  );
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [socialLinks, setSocialLinks] = useState<RelationshipSocialLink[]>(
    initial?.social_links ?? [],
  );
  const [lastContactDate, setLastContactDate] = useState(
    initial?.last_contact_date ?? "",
  );
  const [lastInteractionNotes, setLastInteractionNotes] = useState(
    initial?.last_interaction_notes ?? "",
  );
  const [nextAction, setNextAction] = useState(initial?.next_action ?? "");
  const [nextActionDate, setNextActionDate] = useState(
    initial?.next_action_date ?? "",
  );
  const [commitments, setCommitments] = useState(
    initial?.commitments_made ?? "",
  );
  const [preferences, setPreferences] = useState(
    initial?.preferences_and_details ?? "",
  );
  const [generalNotes, setGeneralNotes] = useState(
    initial?.general_notes ?? "",
  );
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>(
    initial?.linked_project_ids ??
      (initial?.linked_project_id ? [initial.linked_project_id] : []),
  );
  const [linkedGoalIds, setLinkedGoalIds] = useState<string[]>(
    initial?.linked_goal_ids ?? [],
  );
  const [linkedNoteIds, setLinkedNoteIds] = useState<string[]>(
    initial?.linked_note_ids ?? [],
  );
  const [linkedIdeaIds, setLinkedIdeaIds] = useState<string[]>(
    initial?.linked_idea_ids ?? [],
  );
  const [isFavorite, setIsFavorite] = useState(initial?.is_favorite ?? false);
  const [addToRoleModel, setAddToRoleModel] = useState(false);

  const isAlreadyRoleModel = useMemo(() => {
    const key = normalizeRoleModelName(personName);
    return (
      key.length > 0 &&
      roleModelNames.some((name) => normalizeRoleModelName(name) === key)
    );
  }, [personName, roleModelNames]);

  // Note: we deliberately do NOT useEffect-sync from `initial`. The parent
  // remounts this component (via the Dialog's `key`) whenever `initial`
  // changes, which gives a clean state reset without the cascading-renders
  // smell of setState-in-effect.

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmedName = personName.trim();
      if (trimmedName.length === 0) return;

      const cleanSocialLinks = socialLinks.flatMap((link) => {
        const url = normalizeRelationshipSocialUrl(link.url);
        return url ? [{ ...link, url }] : [];
      });

      const payload: RelationshipInsert = {
        person_name: trimmedName,
        photo_url: photoUrl,
        category,
        relationship_strength: strength,
        email: nullIfEmpty(email),
        phone: nullIfEmpty(phone),
        social_links: cleanSocialLinks,
        last_contact_date: nullIfEmpty(lastContactDate),
        last_interaction_notes: nullIfEmpty(lastInteractionNotes),
        next_action: nullIfEmpty(nextAction),
        next_action_date: nullIfEmpty(nextActionDate),
        commitments_made: nullIfEmpty(commitments),
        preferences_and_details: nullIfEmpty(preferences),
        general_notes: nullIfEmpty(generalNotes),
        tags,
        linked_project_id: linkedProjectIds[0] ?? null,
        linked_project_ids: linkedProjectIds,
        linked_goal_ids: linkedGoalIds,
        linked_note_ids: linkedNoteIds,
        linked_idea_ids: linkedIdeaIds,
        is_favorite: isFavorite,
      };
      onSubmit({
        payload,
        addToRoleModel: addToRoleModel && !isAlreadyRoleModel,
      });
    },
    [
      personName,
      photoUrl,
      category,
      strength,
      email,
      phone,
      socialLinks,
      lastContactDate,
      lastInteractionNotes,
      nextAction,
      nextActionDate,
      commitments,
      preferences,
      generalNotes,
      tags,
      linkedProjectIds,
      linkedGoalIds,
      linkedNoteIds,
      linkedIdeaIds,
      isFavorite,
      addToRoleModel,
      isAlreadyRoleModel,
      onSubmit,
    ],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ---- Photo ---- */}
      <Section title={copy.relFieldPhoto}>
        <RelationshipPhotoPicker
          value={photoUrl}
          onChange={setPhotoUrl}
          relationshipId={initial?.id ?? null}
          hintText={copy.relFieldPhotoHint}
          uploadingText={copy.relPhotoUploading}
          removeAriaLabel={copy.relPhotoRemoveAria}
          errors={{
            wrong_type: copy.relPhotoErrorWrongType,
            too_large: copy.relPhotoErrorTooLarge,
            empty: copy.relPhotoErrorEmpty,
            auth: copy.relPhotoErrorAuth,
            unknown: copy.relPhotoErrorUnknown,
          }}
        />
      </Section>

      {/* ---- Essentials ---- */}
      <Section title={copy.relFormSectionEssentials}>
        <Field id="rel-name" label={`${copy.relFieldName} *`}>
          <Input
            id="rel-name"
            className={relationshipFieldClassName}
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder={copy.relFieldNamePlaceholder}
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="rel-category" label={copy.relFieldCategory}>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as RelationshipCategory)}
            >
              <SelectTrigger
                id="rel-category"
                className={relationshipSelectTriggerClassName}
              >
                <SelectValue placeholder={copy.relFieldCategoryPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_DROPDOWN_ORDER.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {getCategoryLabel(slug, copy)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="rel-strength" label={copy.relFieldStrength}>
            <Select
              value={strength}
              onValueChange={(v) => setStrength(v as RelationshipStrength)}
            >
              <SelectTrigger
                id="rel-strength"
                className={relationshipSelectTriggerClassName}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STRENGTH_DROPDOWN_ORDER.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {getStrengthLabel(slug, copy)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <QuickActionButton
            id="rel-favorite"
            active={isFavorite}
            icon={Star}
            label={copy.relFieldFavorite}
            hint={copy.relFieldFavoriteHint}
            onClick={() => setIsFavorite((value) => !value)}
          />
          <QuickActionButton
            id="rel-add-role-model"
            active={addToRoleModel || isAlreadyRoleModel}
            icon={Sparkles}
            label={
              isAlreadyRoleModel
                ? copy.relFieldAlreadyRoleModel
                : addToRoleModel
                  ? copy.relFieldRoleModelQueued
                  : copy.relFieldAddToRoleModel
            }
            hint={copy.relFieldRoleModelHint}
            disabled={personName.trim().length === 0 || isAlreadyRoleModel}
            onClick={() => setAddToRoleModel((value) => !value)}
          />
        </div>
      </Section>

      {/* ---- Contact ---- */}
      <Section title={copy.relFormSectionContact}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="rel-email" label={copy.relFieldEmail}>
            <Input
              id="rel-email"
              type="email"
              className={relationshipFieldClassName}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.relFieldEmailPlaceholder}
            />
          </Field>
          <Field id="rel-phone" label={copy.relFieldPhone}>
            <Input
              id="rel-phone"
              type="tel"
              className={relationshipFieldClassName}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={copy.relFieldPhonePlaceholder}
            />
          </Field>
        </div>
        <SocialLinksEditor
          value={socialLinks}
          onChange={setSocialLinks}
          copy={copy}
        />
      </Section>

      {/* ---- Interaction history ---- */}
      <Section title={copy.relFormSectionInteraction}>
        <Field id="rel-last-contact" label={copy.relFieldLastContact}>
          <DatePickerInput
            value={lastContactDate}
            onChange={setLastContactDate}
            className={relationshipSelectTriggerClassName}
          />
        </Field>
        <Field
          id="rel-last-notes"
          label={copy.relFieldLastInteractionNotes}
        >
          <Textarea
            id="rel-last-notes"
            className={relationshipTextAreaClassName}
            value={lastInteractionNotes}
            onChange={(e) => setLastInteractionNotes(e.target.value)}
            placeholder={copy.relFieldLastInteractionPlaceholder}
            rows={3}
          />
        </Field>
        <Field id="rel-next-action" label={copy.relFieldNextAction}>
          <Textarea
            id="rel-next-action"
            className={relationshipTextAreaClassName}
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder={copy.relFieldNextActionPlaceholder}
            rows={2}
          />
        </Field>
        <Field
          id="rel-next-action-date"
          label={copy.relFieldNextActionDate}
        >
          <DatePickerInput
            value={nextActionDate}
            onChange={setNextActionDate}
            className={relationshipSelectTriggerClassName}
          />
        </Field>
      </Section>

      {/* ---- Long-form context ---- */}
      <Section title={copy.relFormSectionLongForm}>
        <Field id="rel-commitments" label={copy.relFieldCommitments}>
          <Textarea
            id="rel-commitments"
            className={relationshipTextAreaClassName}
            value={commitments}
            onChange={(e) => setCommitments(e.target.value)}
            placeholder={copy.relFieldCommitmentsPlaceholder}
            rows={3}
          />
        </Field>
        <Field id="rel-preferences" label={copy.relFieldPreferences}>
          <Textarea
            id="rel-preferences"
            className={relationshipTextAreaClassName}
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder={copy.relFieldPreferencesPlaceholder}
            rows={3}
          />
        </Field>
        <Field id="rel-general-notes" label={copy.relFieldGeneralNotes}>
          <Textarea
            id="rel-general-notes"
            className={relationshipTextAreaClassName}
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder={copy.relFieldGeneralNotesPlaceholder}
            rows={3}
          />
        </Field>
      </Section>

      {/* ---- Linked Life OS items ---- */}
      <Section title={copy.relFormSectionLinkedItems}>
        <p className="text-xs leading-5 text-muted-foreground">
          {copy.relLinkedItemsHint}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LinkedEntityGroup
            kind="project"
            icon={BriefcaseBusiness}
            label={copy.relLinkedProjects}
            items={projects.map((project) => ({
              id: project.id,
              title: project.name,
            }))}
            selected={linkedProjectIds}
            onToggle={(id, on) =>
              setLinkedProjectIds((current) => toggleId(current, id, on))
            }
            copy={copy}
          />
          <LinkedEntityGroup
            kind="goal"
            icon={Target}
            label={copy.relLinkedGoals}
            items={goals.map((goal) => ({ id: goal.id, title: goal.name }))}
            selected={linkedGoalIds}
            onToggle={(id, on) =>
              setLinkedGoalIds((current) => toggleId(current, id, on))
            }
            copy={copy}
          />
          <LinkedEntityGroup
            kind="note"
            icon={StickyNote}
            label={copy.relLinkedNotes}
            items={notes.map((note) => ({ id: note.id, title: note.title }))}
            selected={linkedNoteIds}
            onToggle={(id, on) =>
              setLinkedNoteIds((current) => toggleId(current, id, on))
            }
            copy={copy}
          />
          <LinkedEntityGroup
            kind="idea"
            icon={Lightbulb}
            label={copy.relLinkedIdeas}
            items={ideas.map((idea) => ({
              id: idea.id,
              title:
                idea.title?.trim() ||
                idea.content.trim().slice(0, 80) ||
                copy.relLinkedIdeas,
            }))}
            selected={linkedIdeaIds}
            onToggle={(id, on) =>
              setLinkedIdeaIds((current) => toggleId(current, id, on))
            }
            copy={copy}
          />
        </div>
      </Section>

      {/* ---- Tags ---- */}
      <Section title={copy.relFormSectionMeta}>
        <Field id="rel-tags" label={copy.relFieldTags} hint={copy.relFieldTagsHint}>
          <RelationshipTagInput
            value={tags}
            onChange={setTags}
            placeholder={copy.relFieldTagsPlaceholder}
            ariaLabel={copy.relFieldTags}
          />
        </Field>
      </Section>

      {/* ---- Footer ---- */}
      <div className={relationshipDialogFooterClassName}>
        <OSControl type="button" variant="ghost" onClick={onCancel}>
          {copy.cancel}
        </OSControl>
        <OSPrimaryAction type="submit" disabled={isSubmitting || personName.trim().length === 0}>
          {isSubmitting ? copy.saving : copy.relSaveRelationship}
        </OSPrimaryAction>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Section / Field primitives — keeps the form body readable.
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={relationshipInnerPanelClassName}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function QuickActionButton({
  id,
  active,
  icon: Icon,
  label,
  hint,
  disabled = false,
  onClick,
}: {
  id: string;
  active: boolean;
  icon: LucideIcon;
  label: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex min-h-20 items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-[border-color,background,box-shadow] disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-lime-300/70 bg-lime-300/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
          : "border-slate-200/80 bg-white/55 hover:border-slate-300 hover:bg-white/78 dark:border-white/10 dark:bg-white/[0.025] dark:hover:border-white/18 dark:hover:bg-white/[0.055]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border",
          active
            ? "border-lime-300/60 bg-lime-300/20 text-lime-800 dark:text-lime-200"
            : "border-slate-200 bg-white/70 text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]",
        )}
      >
        <Icon className="size-4" fill={active ? "currentColor" : "none"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          {label}
          {active ? <Check className="size-3.5 text-lime-700 dark:text-lime-200" /> : null}
        </span>
        <span className="mt-1 block text-xs leading-4 text-muted-foreground">
          {hint}
        </span>
      </span>
    </button>
  );
}

const SOCIAL_PLATFORM_META: Record<
  RelationshipSocialPlatform,
  { label: string; icon: LucideIcon }
> = {
  linkedin: { label: "LinkedIn", icon: AtSign },
  instagram: { label: "Instagram", icon: Camera },
  x: { label: "X", icon: Globe2 },
  facebook: { label: "Facebook", icon: Globe2 },
  threads: { label: "Threads", icon: Globe2 },
  youtube: { label: "YouTube", icon: Globe2 },
  tiktok: { label: "TikTok", icon: Globe2 },
  github: { label: "GitHub", icon: GitFork },
  website: { label: "Website", icon: Globe2 },
  other: { label: "Other", icon: Globe2 },
};

function SocialLinksEditor({
  value,
  onChange,
  copy,
}: {
  value: RelationshipSocialLink[];
  onChange: (next: RelationshipSocialLink[]) => void;
  copy: RelationshipUiCopy;
}) {
  const add = () =>
    onChange([...value, { platform: "linkedin", url: "" }]);

  const patch = (index: number, next: Partial<RelationshipSocialLink>) => {
    onChange(
      value.map((link, currentIndex) =>
        currentIndex === index ? { ...link, ...next } : link,
      ),
    );
  };

  const remove = (index: number) =>
    onChange(value.filter((_, currentIndex) => currentIndex !== index));

  return (
    <div className="space-y-2.5">
      <div>
        <Label className="text-sm font-medium">{copy.relFieldSocials}</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          {copy.relFieldSocialsHint}
        </p>
      </div>

      {value.length > 0 ? (
        <div className="space-y-2">
          {value.map((link, index) => {
            const meta = SOCIAL_PLATFORM_META[link.platform];
            const Icon = meta.icon;
            const urlId = `rel-social-url-${index}`;
            return (
              <div
                key={`${link.platform}-${index}`}
                className="grid grid-cols-[1fr_3rem] gap-2 sm:grid-cols-[11rem_minmax(0,1fr)_3rem]"
              >
                <Select
                  value={link.platform}
                  onValueChange={(platform) =>
                    patch(index, {
                      platform: platform as RelationshipSocialPlatform,
                    })
                  }
                >
                  <SelectTrigger
                    className={cn(
                      relationshipSelectTriggerClassName,
                      "col-span-1",
                    )}
                    aria-label={`${copy.relFieldSocials} ${index + 1}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_SOCIAL_PLATFORMS.map((platform) => {
                      const option = SOCIAL_PLATFORM_META[platform];
                      const OptionIcon = option.icon;
                      return (
                        <SelectItem key={platform} value={platform}>
                          <span className="flex items-center gap-2">
                            <OptionIcon className="size-3.5" />
                            {option.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <div className="col-span-2 flex min-w-0 items-center gap-2 sm:col-span-1">
                  <Icon className="size-4 shrink-0 text-muted-foreground sm:hidden" />
                  <Label htmlFor={urlId} className="sr-only">
                    {meta.label} {copy.relFieldSocialUrlPlaceholder}
                  </Label>
                  <Input
                    id={urlId}
                    type="url"
                    inputMode="url"
                    className={relationshipFieldClassName}
                    value={link.url}
                    onChange={(event) => patch(index, { url: event.target.value })}
                    placeholder={copy.relFieldSocialUrlPlaceholder}
                  />
                </div>

                <OSIconControl
                  type="button"
                  variant="ghost"
                  className="col-start-2 row-start-1 text-muted-foreground hover:text-destructive sm:col-start-3"
                  onClick={() => remove(index)}
                  aria-label={`${copy.relFieldRemoveSocial}: ${meta.label}`}
                >
                  <Trash2 className="size-4" />
                </OSIconControl>
              </div>
            );
          })}
        </div>
      ) : null}

      <OSControl type="button" variant="ghost" onClick={add}>
        <Plus className="mr-1.5 size-4" />
        {copy.relFieldAddSocial}
      </OSControl>
    </div>
  );
}

function LinkedEntityGroup({
  kind,
  icon: Icon,
  label,
  items,
  selected,
  onToggle,
  copy,
}: {
  kind: "project" | "goal" | "note" | "idea";
  icon: LucideIcon;
  label: string;
  items: { id: string; title: string }[];
  selected: string[];
  onToggle: (id: string, on: boolean) => void;
  copy: RelationshipUiCopy;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/52 dark:border-white/10 dark:bg-white/[0.025]">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-3 py-2.5 dark:border-white/8">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 shrink-0 text-lime-700 dark:text-lime-200" />
          {label}
        </span>
        {selected.length > 0 ? (
          <span className="shrink-0 rounded-full bg-lime-300/18 px-2 py-0.5 text-[11px] font-medium text-lime-800 dark:text-lime-200">
            {formatRelationshipCopy(copy.relLinkedSelectedCount, {
              count: selected.length,
            })}
          </span>
        ) : null}
      </div>
      {items.length > 0 ? (
        <div className="max-h-40 space-y-1 overflow-y-auto p-2">
          {items.map((item) => {
            const inputId = `rel-linked-${kind}-${item.id}`;
            const checked = selected.includes(item.id);
            return (
              <label
                key={item.id}
                htmlFor={inputId}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors",
                  checked
                    ? "bg-lime-300/12 text-foreground"
                    : "text-muted-foreground hover:bg-white/70 hover:text-foreground dark:hover:bg-white/[0.05]",
                )}
              >
                <Checkbox
                  id={inputId}
                  checked={checked}
                  onCheckedChange={(next) => onToggle(item.id, next === true)}
                />
                <span className="min-w-0 truncate">{item.title}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="px-3 py-4 text-xs text-muted-foreground">
          {copy.relLinkedEmpty}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toggleId(current: string[], id: string, on: boolean): string[] {
  if (on) return current.includes(id) ? current : [...current, id];
  return current.filter((value) => value !== id);
}

function nullIfEmpty(v: string): string | null {
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function coerceCategory(v: string | undefined): RelationshipCategory {
  if (!v) return DEFAULT_RELATIONSHIP_CATEGORY;
  const list: readonly string[] = CATEGORY_DROPDOWN_ORDER;
  return list.includes(v)
    ? (v as RelationshipCategory)
    : DEFAULT_RELATIONSHIP_CATEGORY;
}

function coerceStrength(v: string | undefined): RelationshipStrength {
  if (!v) return DEFAULT_RELATIONSHIP_STRENGTH;
  const list: readonly string[] = STRENGTH_DROPDOWN_ORDER;
  return list.includes(v)
    ? (v as RelationshipStrength)
    : DEFAULT_RELATIONSHIP_STRENGTH;
}
