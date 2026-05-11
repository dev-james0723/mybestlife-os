"use client";

/**
 * Slide-over panel showing the full record for one relationship.
 *
 * Header:
 *   - Avatar + name + category/strength chips
 *   - Favorite star (live optimistic toggle)
 *   - Edit and Delete buttons
 *
 * Body (only sections with data render — keeps the panel uncluttered):
 *   - Contact (email, phone)
 *   - Last contact + last interaction notes
 *   - Next action + due date
 *   - Commitments
 *   - Preferences & details
 *   - General notes
 *   - Tags
 *   - Linked project (clickable chip — closes the panel and deep-links to
 *     /projects?openId=<id>, which the projects page consumes to auto-open
 *     the corresponding project detail modal)
 */

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  CalendarClock,
  ArrowRight,
  Handshake,
  Heart,
  StickyNote,
  Briefcase,
  ArrowUpRight,
} from "lucide-react";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Pencil, Trash2, UserRound } from "lucide-react";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { RelationshipFavoriteStar } from "@/components/relationship/cards/relationship-favorite-star";
import { useAppStore } from "@/stores/app-store";
import {
  formatRelationshipCopy,
  getRelationshipUiCopy,
} from "@/lib/i18n/relationship-ui";
import {
  getCategoryLabel,
  getInitials,
  getStrengthChipClassName,
  getStrengthLabel,
} from "@/components/relationship/utils/relationship-display";
import { formatDate, formatRelative } from "@/lib/utils/date";
import type { Relationship, Project } from "@/types/database";

type Props = {
  relationship: Relationship | null;
  projects: readonly Project[];
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
};

export function RelationshipDetailPanel({
  relationship,
  projects,
  open,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const localeSlug = useLocaleSlug();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!relationship) {
    // Sheet still mounts when the user closed it during a refresh — null
    // means we have nothing meaningful to render, so render an empty
    // panel rather than crashing on undefined fields.
    return (
      <SlideOverPanel open={open} onClose={onClose} title="" width="lg">
        <div />
      </SlideOverPanel>
    );
  }

  const linkedProject =
    relationship.linked_project_id
      ? projects.find((p) => p.id === relationship.linked_project_id)
      : null;

  const initials = getInitials(relationship.person_name);
  const lastContactText = relationship.last_contact_date
    ? `${formatDate(relationship.last_contact_date)} · ${formatRelative(
        relationship.last_contact_date,
      )}`
    : copy.relCardNeverContacted;

  return (
    <>
      <SlideOverPanel
        open={open}
        onClose={onClose}
        title={relationship.person_name}
        width="lg"
        actions={
          <>
            <RelationshipFavoriteStar
              active={relationship.is_favorite}
              onClick={onToggleFavorite}
              addLabel={formatRelationshipCopy(
                copy.relCardFavoriteAddAria,
                { name: relationship.person_name },
              )}
              removeLabel={formatRelationshipCopy(
                copy.relCardFavoriteRemoveAria,
                { name: relationship.person_name },
              )}
            />
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {copy.relDetailEdit}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmingDelete(true)}
              aria-label={copy.relDetailDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* ---- Identity strip ---- */}
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 ring-1 ring-border">
              {relationship.photo_url ? (
                <AvatarImage
                  src={relationship.photo_url}
                  alt={relationship.person_name}
                />
              ) : null}
              <AvatarFallback className="bg-muted text-base">
                {initials || (
                  <UserRound className="h-7 w-7 text-muted-foreground" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="font-normal">
                  {getCategoryLabel(relationship.category, copy)}
                </Badge>
                <Badge
                  variant="outline"
                  className={`font-normal ${getStrengthChipClassName(
                    relationship.relationship_strength,
                  )}`}
                >
                  {getStrengthLabel(
                    relationship.relationship_strength,
                    copy,
                  )}
                </Badge>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                {lastContactText}
              </p>
            </div>
          </div>

          {/* ---- Contact ---- */}
          {(relationship.email || relationship.phone) && (
            <DetailSection
              icon={<Mail className="h-4 w-4" aria-hidden />}
              title={copy.relDetailSectionContact}
            >
              {relationship.email && (
                <ContactRow
                  icon={<Mail className="h-3.5 w-3.5" />}
                  label={copy.relFieldEmail}
                  value={
                    <a
                      href={`mailto:${relationship.email}`}
                      className="text-primary hover:underline"
                    >
                      {relationship.email}
                    </a>
                  }
                />
              )}
              {relationship.phone && (
                <ContactRow
                  icon={<Phone className="h-3.5 w-3.5" />}
                  label={copy.relFieldPhone}
                  value={
                    <a
                      href={`tel:${relationship.phone}`}
                      className="text-primary hover:underline"
                    >
                      {relationship.phone}
                    </a>
                  }
                />
              )}
            </DetailSection>
          )}

          {/* ---- Last interaction ---- */}
          {relationship.last_interaction_notes && (
            <DetailSection
              icon={<StickyNote className="h-4 w-4" aria-hidden />}
              title={copy.relDetailSectionLastInteraction}
            >
              <ProseBlock>{relationship.last_interaction_notes}</ProseBlock>
            </DetailSection>
          )}

          {/* ---- Next action ---- */}
          {relationship.next_action && (
            <DetailSection
              icon={<ArrowRight className="h-4 w-4" aria-hidden />}
              title={copy.relDetailSectionNextAction}
            >
              <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                <p className="text-sm font-medium text-foreground text-pretty">
                  {relationship.next_action}
                </p>
                {relationship.next_action_date && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatRelationshipCopy(copy.relCardDueOn, {
                      date: formatDate(relationship.next_action_date),
                    })}
                  </p>
                )}
              </div>
            </DetailSection>
          )}

          {/* ---- Commitments ---- */}
          {relationship.commitments_made && (
            <DetailSection
              icon={<Handshake className="h-4 w-4" aria-hidden />}
              title={copy.relDetailSectionCommitments}
            >
              <ProseBlock>{relationship.commitments_made}</ProseBlock>
            </DetailSection>
          )}

          {/* ---- Preferences ---- */}
          {relationship.preferences_and_details && (
            <DetailSection
              icon={<Heart className="h-4 w-4" aria-hidden />}
              title={copy.relDetailSectionPreferences}
            >
              <ProseBlock>{relationship.preferences_and_details}</ProseBlock>
            </DetailSection>
          )}

          {/* ---- General notes ---- */}
          {relationship.general_notes && (
            <DetailSection
              icon={<StickyNote className="h-4 w-4" aria-hidden />}
              title={copy.relDetailSectionGeneralNotes}
            >
              <ProseBlock>{relationship.general_notes}</ProseBlock>
            </DetailSection>
          )}

          {/* ---- Tags ---- */}
          {relationship.tags.length > 0 && (
            <DetailSection
              icon={<StickyNote className="h-4 w-4" aria-hidden />}
              title={copy.relDetailSectionTags}
            >
              <div className="flex flex-wrap gap-1.5">
                {relationship.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="font-normal"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </DetailSection>
          )}

          {/* ---- Linked project ---- */}
          {linkedProject && (
            <DetailSection
              icon={<Briefcase className="h-4 w-4" aria-hidden />}
              title={copy.relDetailSectionLinkedProject}
            >
              <Link
                href={withLocalePrefix(
                  localeSlug,
                  `/projects?openId=${linkedProject.id}`,
                )}
                onClick={onClose}
                className="group flex items-center justify-between gap-2 rounded-md border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0 truncate">{linkedProject.name}</span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden
                />
              </Link>
            </DetailSection>
          )}
        </div>
      </SlideOverPanel>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {copy.relDetailDeleteConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {formatRelationshipCopy(copy.relDetailDeleteConfirmDescription, {
                name: relationship.person_name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmingDelete(false);
                onDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {copy.relDetailDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-primitives
// ---------------------------------------------------------------------------

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="min-w-0 truncate">{value}</span>
    </div>
  );
}

function ProseBlock({ children }: { children: ReactNode }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground text-pretty">
      {children}
    </p>
  );
}
