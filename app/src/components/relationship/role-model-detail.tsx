"use client";

/**
 * RoleModelDetail
 *
 * Read-only side panel showing the curated profile of one role model.
 * Pairs with RoleModelForm: clicking "Edit" closes this and opens the form.
 *
 * Design notes:
 * - Hero with photo + name + admiration blurb forms the emotional anchor.
 * - Each section is omitted when the underlying field is empty — no hollow
 *   labels.
 * - Quotes use a serif italic styling to feel like quotations, not data.
 * - Links open in a new tab with rel=noreferrer.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleModelPhoto } from "@/components/relationship/role-model-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowUpRight,
  ExternalLink,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import {
  formatRelationshipCopy,
  getRelationshipUiCopy,
  type RelationshipUiCopy,
} from "@/lib/i18n/relationship-ui";
import { formatDate } from "@/lib/utils/date";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { buildLinkKindOptions } from "@/components/relationship/role-model-form";
import type { RoleModel } from "@/types/database";

type Props = {
  open: boolean;
  onClose: () => void;
  roleModel: RoleModel | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite?: () => void;
  /** Resolves linked entity IDs to display names for chips. */
  projectMap: Map<string, string>;
  goalMap: Map<string, string>;
  noteMap: Map<string, string>;
};

export function RoleModelDetail({
  open,
  onClose,
  roleModel,
  onEdit,
  onDelete,
  onToggleFavorite,
  projectMap,
  goalMap,
  noteMap,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const reduce = useReducedMotion();
  const linkKindLabels = useMemo(() => {
    const opts = buildLinkKindOptions(copy);
    return new Map(opts.map((o) => [o.value, o.label]));
  }, [copy]);
  // Localized hrefs for linked-entity navigation. The destination pages don't
  // accept a `?selected=<id>` param yet, so each chip routes to the listing
  // page where the user can locate the entity by name.
  const projectsHref = useLocalizedPath("/projects");
  const goalsHref = useLocalizedPath("/goals");

  // Keyboard shortcuts while the detail is open: E → edit, F → favorite.
  // Esc-to-close is already handled by Radix's Dialog primitive inside the
  // SlideOverPanel, so we deliberately don't double-bind it.
  //
  // Important guards:
  //  • Only attach when the panel is open (no global no-op listener).
  //  • Ignore when the user is typing in any editable control. The detail
  //    itself is read-only, but the listener is window-scoped and would
  //    otherwise hijack `f`/`e` typed in the gallery search box behind us.
  //  • Ignore modifier combos so Cmd-F (browser find) and Cmd-E etc.
  //    continue to work as the platform expects.
  useEffect(() => {
    if (!open || !roleModel) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "e") {
        e.preventDefault();
        onEdit();
      } else if (key === "f" && onToggleFavorite) {
        e.preventDefault();
        onToggleFavorite();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, roleModel, onEdit, onToggleFavorite]);

  if (!roleModel) {
    return (
      <SlideOverPanel
        open={open}
        onClose={onClose}
        title=""
        width="2xl"
      >
        <div />
      </SlideOverPanel>
    );
  }

  const initials = roleModel.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const photo = roleModel.photo_url ?? roleModel.image_url;
  const bio = roleModel.bio ?? roleModel.description;
  const linkedCount =
    roleModel.linked_project_ids.length +
    roleModel.linked_goal_ids.length +
    roleModel.linked_note_ids.length;

  return (
    <SlideOverPanel
      open={open}
      onClose={onClose}
      title={roleModel.name}
      width="2xl"
      actions={
        onToggleFavorite ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onToggleFavorite}
            aria-label={
              roleModel.is_favorite
                ? copy.rmFavoriteRemoveAria
                : copy.rmFavoriteAddAria
            }
            aria-pressed={roleModel.is_favorite}
            className={
              roleModel.is_favorite
                ? "text-primary hover:text-primary"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            <motion.span
              key={String(roleModel.is_favorite)}
              initial={reduce ? false : { scale: 0.7, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 520, damping: 18 }}
              className="inline-flex"
            >
              <Sparkles
                className="h-4 w-4"
                fill={roleModel.is_favorite ? "currentColor" : "none"}
              />
            </motion.span>
          </Button>
        ) : undefined
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {copy.delete}
          </Button>
          <Button type="button" variant="default" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            {copy.edit}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Hero */}
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 ring-2 ring-border shrink-0">
            <RoleModelPhoto src={photo} pixelSize={80} />
            <AvatarFallback className="bg-muted text-base">
              {initials || <UserRound className="h-8 w-8 text-muted-foreground" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-2">
            {roleModel.category && (
              <Badge variant="secondary" className="font-normal">
                {capitalize(roleModel.category)}
              </Badge>
            )}
            {roleModel.admiration_blurb && (
              <p className="text-sm text-foreground text-pretty">
                {roleModel.admiration_blurb}
              </p>
            )}
          </div>
        </div>

        {/* Tags */}
        {roleModel.tags.length > 0 && (
          <SectionTags label={copy.rmSectionTags} tags={roleModel.tags} />
        )}

        {/* Bio */}
        {bio && (
          <Section title={copy.rmSectionBio}>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {bio}
            </p>
          </Section>
        )}

        {/* Spotlight quote — rendered above the full Quotes list. Surfaces
            one quote at a time as a glanceable "card", with a refresh
            control to cycle through. Only worth showing when there's more
            than one quote — otherwise the Quotes section already covers it. */}
        {roleModel.quotes.length >= 2 && (
          <SpotlightQuote
            quotes={roleModel.quotes}
            roleModelId={roleModel.id}
            sectionTitle={copy.rmSectionSpotlight}
            nextAriaLabel={copy.rmSpotlightNextAria}
          />
        )}

        {/* Quotes */}
        {roleModel.quotes.length > 0 && (
          <Section title={copy.rmSectionQuotes}>
            <ul className="space-y-3">
              {roleModel.quotes.map((q, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border-l-2 border-primary/40 bg-muted/30 px-4 py-3"
                >
                  <p className="text-sm italic text-foreground/90 text-pretty">
                    &ldquo;{q.text}&rdquo;
                  </p>
                  {q.source && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      — {q.source}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Key lessons */}
        {roleModel.key_lessons.length > 0 && (
          <Section title={copy.rmSectionKeyLessons}>
            <ul className="space-y-3">
              {roleModel.key_lessons.map((l, idx) => (
                <li key={idx} className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {l.title}
                  </p>
                  {l.detail && (
                    <p className="text-sm text-muted-foreground text-pretty">
                      {l.detail}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Reference links */}
        {roleModel.links.length > 0 && (
          <Section title={copy.rmSectionLinks}>
            <ul className="space-y-2">
              {roleModel.links.map((link, idx) => (
                <li key={idx}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{link.label || link.url}</span>
                    {link.kind && (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[10px] font-normal"
                      >
                        {linkKindLabels.get(link.kind) ?? link.kind}
                      </Badge>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Linked entities */}
        {linkedCount > 0 && (
          <>
            {roleModel.linked_project_ids.length > 0 && (
              <Section
                title={copy.rmSectionProjects}
                count={roleModel.linked_project_ids.length}
              >
                <LinkedEntityRow
                  ids={roleModel.linked_project_ids}
                  resolve={(id) => projectMap.get(id) ?? id}
                  href={projectsHref}
                  openAriaTemplate={copy.rmLinkedOpenInAria}
                  areaLabel={copy.rmSectionProjects}
                />
              </Section>
            )}
            {roleModel.linked_goal_ids.length > 0 && (
              <Section
                title={copy.rmSectionGoals}
                count={roleModel.linked_goal_ids.length}
              >
                <LinkedEntityRow
                  ids={roleModel.linked_goal_ids}
                  resolve={(id) => goalMap.get(id) ?? id}
                  href={goalsHref}
                  openAriaTemplate={copy.rmLinkedOpenInAria}
                  areaLabel={copy.rmSectionGoals}
                />
              </Section>
            )}
          </>
        )}

        {/* Personal notes */}
        {roleModel.notes && (
          <Section title={copy.rmSectionPersonalNotes}>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap text-pretty">
              {roleModel.notes}
            </p>
          </Section>
        )}

        <Separator />
        <p className="text-xs text-muted-foreground">
          {formatRelationshipCopy(copy.rmUpdated, {
            date: formatDate(roleModel.updated_at),
          })}
        </p>
      </div>
    </SlideOverPanel>
  );
}

// ============================================================================
// Sub-components (purely presentational)
// ============================================================================

function Section({
  title,
  count,
  children,
}: {
  title: string;
  /** Optional pill rendered next to the title — handy for collections. */
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        {count !== undefined && count > 0 && (
          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function SectionTags({ label, tags }: { label: string; tags: string[] }) {
  return (
    <Section title={label}>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Badge key={t} variant="outline" className="font-normal">
            {t}
          </Badge>
        ))}
      </div>
    </Section>
  );
}

/**
 * LinkedEntityRow
 *
 * Clickable badges for each linked entity. The destination listing pages
 * don't accept a per-id query yet, so every chip in a row points to the same
 * page (e.g. `/projects`). The compromise: the user lands on the right area
 * with the entity name fresh in mind. We chose this over a "search query"
 * style URL to avoid leaking implementation details and to stay forward-
 * compatible with a future deep-link param.
 */
function LinkedEntityRow({
  ids,
  resolve,
  href,
  openAriaTemplate,
  areaLabel,
}: {
  ids: string[];
  resolve: (id: string) => string;
  href: string;
  openAriaTemplate: string;
  areaLabel: string;
}) {
  const ariaLabel = formatRelationshipCopy(openAriaTemplate, {
    area: areaLabel,
  });
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const label = resolve(id);
        return (
          <Link
            key={id}
            href={href}
            aria-label={`${label} — ${ariaLabel}`}
            className="group inline-flex items-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <Badge
              variant="secondary"
              className="font-normal max-w-[18rem] truncate group-hover:bg-secondary/80 transition-colors"
            >
              <span className="truncate">{label}</span>
              <ArrowUpRight
                className="ml-1 h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity"
                aria-hidden
              />
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * SpotlightQuote
 *
 * Surfaces one of the role model's quotes as a glanceable "card" that the
 * user can cycle through. The default index is randomized per (open + role
 * model) so re-opening the same person feels fresh; an explicit "next" button
 * lets the user advance manually.
 *
 * Resets index when the role model changes (effect on `roleModelId`) so we
 * never show a stale index after switching profiles in quick succession.
 */
function SpotlightQuote({
  quotes,
  roleModelId,
  sectionTitle,
  nextAriaLabel,
}: {
  quotes: { text: string; source?: string | null }[];
  roleModelId: string;
  sectionTitle: string;
  nextAriaLabel: string;
}) {
  const reduce = useReducedMotion();
  // Pick a random starting quote per role model so two visits feel different.
  const initialIndex = useMemo(
    () => Math.floor(Math.random() * quotes.length),
    // We intentionally only re-randomize when the role model or the size of
    // the quotes array changes — not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roleModelId, quotes.length],
  );
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const quote = quotes[index] ?? quotes[0];

  return (
    <section
      className="space-y-3"
      aria-labelledby={`role-model-spotlight-${roleModelId}`}
    >
      <div className="flex items-center justify-between">
        <h4
          id={`role-model-spotlight-${roleModelId}`}
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {sectionTitle}
        </h4>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => setIndex((i) => (i + 1) % quotes.length)}
          aria-label={nextAriaLabel}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-transparent to-transparent p-5">
        {/* Soft sparkle accent — pure decoration, hidden from AT. */}
        <Sparkles
          className="absolute right-3 top-3 h-4 w-4 text-primary/30"
          aria-hidden
          fill="currentColor"
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.blockquote
            key={index}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2"
          >
            <p className="text-base italic text-foreground text-pretty leading-relaxed">
              &ldquo;{quote.text}&rdquo;
            </p>
            {quote.source && (
              <footer className="text-xs text-muted-foreground">
                — {quote.source}
              </footer>
            )}
          </motion.blockquote>
        </AnimatePresence>
      </div>
    </section>
  );
}

// Map of link kind → localized label is built once per render in the parent
// using buildLinkKindOptions. Re-exporting `RelationshipUiCopy` so callers
// don't need to import it just to satisfy peer types.
export type { RelationshipUiCopy };
