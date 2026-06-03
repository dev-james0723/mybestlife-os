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
 *   2. Essentials — name (required), category (required), strength
 *   3. Contact — email, phone
 *   4. Interaction history — last contact date, last interaction notes
 *   5. Forward-looking — next action + due date
 *   6. Long-form — commitments, preferences, general notes
 *   7. Tags & links — tags chip input, linked project, favorite toggle
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
import { OSControl, OSPrimaryAction } from "@/components/ui/os-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { useAppStore } from "@/stores/app-store";
import { getRelationshipUiCopy } from "@/lib/i18n/relationship-ui";
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
  type RelationshipCategory,
  type RelationshipInsert,
  type RelationshipStrength,
} from "@/types/relationship";
import type { Project } from "@/types/database";

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
  last_contact_date?: string | null;
  last_interaction_notes?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  commitments_made?: string | null;
  preferences_and_details?: string | null;
  general_notes?: string | null;
  tags?: string[];
  linked_project_id?: string | null;
  is_favorite?: boolean;
};

type Props = {
  /** Existing values when editing; partial means "use defaults". */
  initial?: RelationshipFormInitial;
  /** Used to populate the linked-project dropdown. */
  projects: readonly Project[];
  onSubmit: (payload: RelationshipInsert) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
};

const NO_PROJECT_VALUE = "__none__";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RelationshipForm({
  initial,
  projects,
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
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(
    initial?.linked_project_id ?? null,
  );
  const [isFavorite, setIsFavorite] = useState(initial?.is_favorite ?? false);

  // Note: we deliberately do NOT useEffect-sync from `initial`. The parent
  // remounts this component (via the Dialog's `key`) whenever `initial`
  // changes, which gives a clean state reset without the cascading-renders
  // smell of setState-in-effect.

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmedName = personName.trim();
      if (trimmedName.length === 0) return;

      const payload: RelationshipInsert = {
        person_name: trimmedName,
        photo_url: photoUrl,
        category,
        relationship_strength: strength,
        email: nullIfEmpty(email),
        phone: nullIfEmpty(phone),
        last_contact_date: nullIfEmpty(lastContactDate),
        last_interaction_notes: nullIfEmpty(lastInteractionNotes),
        next_action: nullIfEmpty(nextAction),
        next_action_date: nullIfEmpty(nextActionDate),
        commitments_made: nullIfEmpty(commitments),
        preferences_and_details: nullIfEmpty(preferences),
        general_notes: nullIfEmpty(generalNotes),
        tags,
        linked_project_id: linkedProjectId,
        is_favorite: isFavorite,
      };
      onSubmit(payload);
    },
    [
      personName,
      photoUrl,
      category,
      strength,
      email,
      phone,
      lastContactDate,
      lastInteractionNotes,
      nextAction,
      nextActionDate,
      commitments,
      preferences,
      generalNotes,
      tags,
      linkedProjectId,
      isFavorite,
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

      {/* ---- Tags & links ---- */}
      <Section title={copy.relFormSectionMeta}>
        <Field id="rel-tags" label={copy.relFieldTags} hint={copy.relFieldTagsHint}>
          <RelationshipTagInput
            value={tags}
            onChange={setTags}
            placeholder={copy.relFieldTagsPlaceholder}
            ariaLabel={copy.relFieldTags}
          />
        </Field>
        <Field id="rel-project" label={copy.relFieldLinkedProject}>
          <Select
            value={linkedProjectId ?? NO_PROJECT_VALUE}
            onValueChange={(v) =>
              setLinkedProjectId(v === NO_PROJECT_VALUE ? null : v)
            }
          >
            <SelectTrigger
              id="rel-project"
              className={relationshipSelectTriggerClassName}
            >
              <SelectValue placeholder={copy.relFieldLinkedProjectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROJECT_VALUE}>
                {copy.relFieldLinkedProjectNone}
              </SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-center gap-2">
          <Checkbox
            id="rel-favorite"
            checked={isFavorite}
            onCheckedChange={(v) => setIsFavorite(v === true)}
            className="!size-12"
          />
          <Label htmlFor="rel-favorite" className="cursor-pointer text-sm font-normal">
            {copy.relFieldFavorite}
          </Label>
        </div>
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
