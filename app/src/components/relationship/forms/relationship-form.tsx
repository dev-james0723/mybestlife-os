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
  type SVGProps,
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
  Check,
  Globe2,
  Link2,
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
  { label: string; iconPath?: string; fallbackIcon?: LucideIcon }
> = {
  linkedin: {
    label: "LinkedIn",
    iconPath:
      "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  instagram: {
    label: "Instagram",
    iconPath:
      "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913a5.885 5.885 0 0 0 1.384 2.126A5.868 5.868 0 0 0 4.14 23.37c.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558a5.898 5.898 0 0 0 2.126-1.384 5.86 5.86 0 0 0 1.384-2.126c.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913a5.89 5.89 0 0 0-1.384-2.126A5.847 5.847 0 0 0 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227a3.81 3.81 0 0 1-.899 1.382 3.744 3.744 0 0 1-1.38.896c-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421a3.716 3.716 0 0 1-1.379-.899 3.644 3.644 0 0 1-.9-1.38c-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 0 1-2.88 0 1.44 1.44 0 0 1 2.88 0z",
  },
  x: {
    label: "X",
    iconPath:
      "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z",
  },
  facebook: {
    label: "Facebook",
    iconPath:
      "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  threads: {
    label: "Threads",
    iconPath:
      "M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z",
  },
  youtube: {
    label: "YouTube",
    iconPath:
      "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
  tiktok: {
    label: "TikTok",
    iconPath:
      "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  },
  github: {
    label: "GitHub",
    iconPath:
      "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
  website: { label: "Website", fallbackIcon: Globe2 },
  other: { label: "Other", fallbackIcon: Link2 },
};

function SocialPlatformIcon({
  platform,
  ...props
}: SVGProps<SVGSVGElement> & { platform: RelationshipSocialPlatform }) {
  const meta = SOCIAL_PLATFORM_META[platform];

  if (meta.iconPath) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <path d={meta.iconPath} />
      </svg>
    );
  }

  const FallbackIcon = meta.fallbackIcon ?? Globe2;
  return <FallbackIcon aria-hidden="true" {...props} />;
}

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
                    <SelectValue>
                      <span className="flex min-w-0 items-center gap-2">
                        <SocialPlatformIcon
                          platform={link.platform}
                          className="size-4 shrink-0"
                        />
                        <span className="truncate">{meta.label}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_SOCIAL_PLATFORMS.map((platform) => {
                      const option = SOCIAL_PLATFORM_META[platform];
                      return (
                        <SelectItem key={platform} value={platform}>
                          <span className="flex items-center gap-2">
                            <SocialPlatformIcon
                              platform={platform}
                              className="size-4"
                            />
                            {option.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <div className="col-span-2 flex min-w-0 items-center gap-2 sm:col-span-1">
                  <SocialPlatformIcon
                    platform={link.platform}
                    className="size-4 shrink-0 text-muted-foreground sm:hidden"
                  />
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
