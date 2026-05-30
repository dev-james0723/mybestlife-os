"use client";

/**
 * RelationshipIntelligenceModal (spec §12) — the upgraded detail view. A large
 * two-column modal (single column on mobile) with a hero, snapshot strip, and
 * the full intelligence layer:
 *   left  — contact, last interaction, commitments, preferences, notes, tags,
 *           linked project, shared memories, promise keeper
 *   right — AI report (why this person matters, memory capsule, next touchpoint,
 *           care-without-overdoing, don't-forget, hidden connections),
 *           context health, weather, message draft
 *
 * The AI report is cached in `relationship_ai_reports`; we only call the
 * `analyze` route on first open or explicit refresh (spec §24).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  CalendarClock,
  ArrowRight,
  Heart,
  StickyNote,
  Briefcase,
  ArrowUpRight,
  Sparkles,
  Compass,
  BookHeart,
  ShieldCheck,
  Lightbulb,
  Link2,
  Pencil,
  Trash2,
  UserRound,
  PenLine,
  RefreshCw,
} from "lucide-react";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { RelationshipFavoriteStar } from "@/components/relationship/cards/relationship-favorite-star";
import { RelationshipPromiseKeeper } from "@/components/relationship/intelligence/relationship-promise-keeper";
import { RelationshipContextHealth } from "@/components/relationship/intelligence/relationship-context-health";
import { RelationshipSharedMemories } from "@/components/relationship/intelligence/relationship-shared-memories";
import { RelationshipMessageDraftPanel } from "@/components/relationship/intelligence/relationship-message-draft-panel";
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
import {
  getWeatherLabel,
  getWeatherChipClassName,
} from "@/components/relationship/utils/intelligence-display";
import {
  computeContextHealth,
  computeRelationshipWeather,
  countOpenPromises,
  isPromiseEffectivelyOverdue,
} from "@/lib/relationships/intelligence";
import { buildRelationshipInsightContext } from "@/lib/relationships/relationship-insight-context";
import { requestRelationshipAnalysis } from "@/lib/relationships/insight-api";
import {
  useRelationshipInteractions,
  useRelationshipImages,
  useRelationshipAiReport,
} from "@/hooks/use-relationship-intelligence";
import { relationshipAiReportsRepository } from "@/lib/repositories/relationship-ai-reports";
import { useQueryClient } from "@tanstack/react-query";
import { relationshipAiReportKey } from "@/hooks/use-relationship-intelligence";
import { formatDate, formatRelative } from "@/lib/utils/date";
import type {
  Relationship,
  Project,
  RelationshipPromise,
} from "@/types/database";
import type { RelationshipIntelligenceReport } from "@/types/relationship-intelligence";

type Props = {
  relationship: Relationship | null;
  projects: readonly Project[];
  goals?: readonly import("@/types/database").Goal[];
  notes?: readonly import("@/types/database").Note[];
  promises: readonly RelationshipPromise[];
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onLogInteraction: () => void;
};

export function RelationshipIntelligenceModal({
  relationship,
  projects,
  goals,
  notes,
  promises,
  open,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onLogInteraction,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const localeSlug = useLocaleSlug();
  const reduce = useReducedMotion();
  const queryClient = useQueryClient();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [generating, setGenerating] = useState(false);

  const relId = relationship?.id ?? null;
  const { data: interactions } = useRelationshipInteractions(relId);
  const { data: images } = useRelationshipImages(relId);
  const { data: cachedReport } = useRelationshipAiReport(relId);

  const relPromises = useMemo(
    () => promises.filter((p) => p.relationship_id === relId),
    [promises, relId],
  );

  const report = (cachedReport?.report_json ??
    null) as RelationshipIntelligenceReport | null;

  if (!relationship) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent size="2xl">
          <DialogTitle className="sr-only">—</DialogTitle>
          <div />
        </DialogContent>
      </Dialog>
    );
  }

  const r = relationship;
  const linkedProject = r.linked_project_id
    ? projects.find((p) => p.id === r.linked_project_id)
    : null;
  const initials = getInitials(r.person_name);
  const lastContactText = r.last_contact_date
    ? `${formatDate(r.last_contact_date)} · ${formatRelative(r.last_contact_date)}`
    : copy.relCardNeverContacted;

  const openPromiseCount = countOpenPromises(relPromises);
  const overduePromiseCount = relPromises.filter((p) =>
    isPromiseEffectivelyOverdue(p),
  ).length;

  const health = computeContextHealth({
    relationship: r,
    promiseCount: relPromises.length,
    interactionCount: interactions?.length ?? 0,
    imageCount: images?.length ?? 0,
  });
  const weather = computeRelationshipWeather({
    relationship: r,
    openPromiseCount,
    overduePromiseCount,
  });

  async function generateInsight() {
    if (!relId) return;
    setGenerating(true);
    try {
      const context = buildRelationshipInsightContext({
        relationship: r,
        interactions: interactions ?? [],
        promises: relPromises,
        images: images ?? [],
        projects,
        goals,
        notes,
      });
      const fresh = await requestRelationshipAnalysis({
        relationshipId: relId,
        locale: language,
        context,
      });
      await relationshipAiReportsRepository.upsert({
        relationship_id: relId,
        report: fresh,
        model_used: fresh.modelUsed ?? null,
      });
      queryClient.invalidateQueries({ queryKey: relationshipAiReportKey(relId) });
    } catch {
      toast.error(copy.wizardError);
    } finally {
      setGenerating(false);
    }
  }

  const insightContextString = report
    ? JSON.stringify({
        person: r.person_name,
        why: report.whyThisPersonMatters,
        capsule: report.relationshipMemoryCapsule,
        commitments: r.commitments_made,
        preferences: r.preferences_and_details,
      })
    : JSON.stringify({
        person: r.person_name,
        commitments: r.commitments_made,
        preferences: r.preferences_and_details,
        next_action: r.next_action,
      });

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          size="5xl"
          className="flex max-h-[92vh] flex-col gap-0 p-0"
        >
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="sr-only">{r.person_name}</DialogTitle>
            {/* Hero */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 shrink-0 ring-1 ring-border">
                {r.photo_url ? (
                  <AvatarImage src={r.photo_url} alt={r.person_name} />
                ) : null}
                <AvatarFallback className="bg-muted text-base">
                  {initials || <UserRound className="h-6 w-6 text-muted-foreground" />}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold">{r.person_name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="font-normal text-[11px]">
                    {getCategoryLabel(r.category, copy)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`font-normal text-[11px] ${getStrengthChipClassName(
                      r.relationship_strength,
                    )}`}
                  >
                    {getStrengthLabel(r.relationship_strength, copy)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`font-normal text-[11px] ${getWeatherChipClassName(
                      weather.status,
                    )} ${weather.urgent && !reduce ? "animate-pulse" : ""}`}
                  >
                    {getWeatherLabel(weather.status, copy)}
                  </Badge>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <RelationshipFavoriteStar
                  active={r.is_favorite}
                  onClick={onToggleFavorite}
                  addLabel={formatRelationshipCopy(copy.relCardFavoriteAddAria, {
                    name: r.person_name,
                  })}
                  removeLabel={formatRelationshipCopy(
                    copy.relCardFavoriteRemoveAria,
                    { name: r.person_name },
                  )}
                />
                <Button size="sm" variant="outline" onClick={onLogInteraction}>
                  <PenLine className="mr-1.5 h-3.5 w-3.5" />
                  {copy.hubLogInteraction}
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={onEdit} aria-label={copy.relDetailEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmingDelete(true)}
                  aria-label={copy.relDetailDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="grid grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-2">
              {/* ---- Left column ---- */}
              <div className="space-y-5">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                  {lastContactText}
                </p>

                {(r.email || r.phone) && (
                  <Section icon={<Mail className="h-4 w-4" />} title={copy.relDetailSectionContact}>
                    {r.email && (
                      <Row icon={<Mail className="h-3.5 w-3.5" />}>
                        <a href={`mailto:${r.email}`} className="text-primary hover:underline">
                          {r.email}
                        </a>
                      </Row>
                    )}
                    {r.phone && (
                      <Row icon={<Phone className="h-3.5 w-3.5" />}>
                        <a href={`tel:${r.phone}`} className="text-primary hover:underline">
                          {r.phone}
                        </a>
                      </Row>
                    )}
                  </Section>
                )}

                {r.next_action && (
                  <Section icon={<ArrowRight className="h-4 w-4" />} title={copy.relDetailSectionNextAction}>
                    <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                      <p className="text-sm font-medium text-pretty">{r.next_action}</p>
                      {r.next_action_date && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatRelationshipCopy(copy.relCardDueOn, {
                            date: formatDate(r.next_action_date),
                          })}
                        </p>
                      )}
                    </div>
                  </Section>
                )}

                {r.last_interaction_notes && (
                  <Section icon={<StickyNote className="h-4 w-4" />} title={copy.relDetailSectionLastInteraction}>
                    <Prose>{r.last_interaction_notes}</Prose>
                  </Section>
                )}

                <RelationshipPromiseKeeper relationshipId={r.id} promises={relPromises} />

                {r.preferences_and_details && (
                  <Section icon={<Heart className="h-4 w-4" />} title={copy.relDetailSectionPreferences}>
                    <Prose>{r.preferences_and_details}</Prose>
                  </Section>
                )}

                {r.general_notes && (
                  <Section icon={<StickyNote className="h-4 w-4" />} title={copy.relDetailSectionGeneralNotes}>
                    <Prose>{r.general_notes}</Prose>
                  </Section>
                )}

                {r.tags.length > 0 && (
                  <Section icon={<StickyNote className="h-4 w-4" />} title={copy.relDetailSectionTags}>
                    <div className="flex flex-wrap gap-1.5">
                      {r.tags.map((t) => (
                        <Badge key={t} variant="outline" className="font-normal">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </Section>
                )}

                {linkedProject && (
                  <Section icon={<Briefcase className="h-4 w-4" />} title={copy.relDetailSectionLinkedProject}>
                    <Link
                      href={withLocalePrefix(localeSlug, `/projects?openId=${linkedProject.id}`)}
                      onClick={onClose}
                      className="group flex items-center justify-between gap-2 rounded-md border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="min-w-0 truncate">{linkedProject.name}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </Link>
                  </Section>
                )}

                <RelationshipSharedMemories relationshipId={r.id} />
              </div>

              {/* ---- Right column (intelligence) ---- */}
              <div className="space-y-5">
                <RelationshipContextHealth health={health} />

                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-4 w-4" aria-hidden />
                    AI
                  </h3>
                  <Button size="sm" variant="outline" onClick={generateInsight} disabled={generating}>
                    {generating ? (
                      <>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        {copy.modalGenerating}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        {report ? copy.modalRefreshInsight : copy.modalGenerateInsight}
                      </>
                    )}
                  </Button>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  {!report && !generating && (
                    <motion.p
                      key="empty"
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-md border border-dashed border-border bg-card/40 px-3 py-4 text-sm text-muted-foreground"
                    >
                      {copy.modalNoInsightYet}
                    </motion.p>
                  )}

                  {report && (
                    <motion.div
                      key="report"
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-5"
                    >
                      {report.whyThisPersonMatters && (
                        <Section icon={<Compass className="h-4 w-4" />} title={copy.modalWhyMatters}>
                          <Prose>{report.whyThisPersonMatters}</Prose>
                        </Section>
                      )}

                      <Section icon={<BookHeart className="h-4 w-4" />} title={copy.modalMemoryCapsule}>
                        <div className="space-y-2 text-sm">
                          {report.relationshipMemoryCapsule.whoTheyAre && (
                            <Prose>{report.relationshipMemoryCapsule.whoTheyAre}</Prose>
                          )}
                          {report.relationshipMemoryCapsule.whatToRemember.length > 0 && (
                            <BulletList
                              label={copy.modalWhatToRemember}
                              items={report.relationshipMemoryCapsule.whatToRemember}
                            />
                          )}
                          {report.relationshipMemoryCapsule.openLoops.length > 0 && (
                            <BulletList
                              label={copy.modalOpenLoops}
                              items={report.relationshipMemoryCapsule.openLoops}
                            />
                          )}
                        </div>
                      </Section>

                      {report.nextBestTouchpoint.recommendation && (
                        <Section icon={<ArrowRight className="h-4 w-4" />} title={copy.modalNextTouchpoint}>
                          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 space-y-1.5">
                            <p className="text-sm font-medium text-pretty">
                              {report.nextBestTouchpoint.recommendation}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {copy.modalTiming}: {report.nextBestTouchpoint.timing}
                              {report.nextBestTouchpoint.channel
                                ? ` · ${copy.modalChannel}: ${report.nextBestTouchpoint.channel}`
                                : ""}
                            </p>
                            {report.nextBestTouchpoint.reason && (
                              <p className="text-xs text-muted-foreground text-pretty">
                                {report.nextBestTouchpoint.reason}
                              </p>
                            )}
                            {report.nextBestTouchpoint.whatNotToSay &&
                              report.nextBestTouchpoint.whatNotToSay.length > 0 && (
                                <BulletList
                                  label={copy.modalWhatNotToSay}
                                  items={report.nextBestTouchpoint.whatNotToSay}
                                />
                              )}
                          </div>
                        </Section>
                      )}

                      {report.careWithoutOverdoing && (
                        <Section icon={<ShieldCheck className="h-4 w-4" />} title={copy.modalCareWithout}>
                          <Prose>{report.careWithoutOverdoing}</Prose>
                        </Section>
                      )}

                      {report.dontForget.length > 0 && (
                        <Section icon={<Lightbulb className="h-4 w-4" />} title={copy.modalDontForget}>
                          <ul className="space-y-1">
                            {report.dontForget.map((d, i) => (
                              <li
                                key={i}
                                className="rounded-md bg-muted/50 px-2.5 py-1.5 text-sm text-pretty"
                              >
                                {d}
                              </li>
                            ))}
                          </ul>
                        </Section>
                      )}

                      {report.hiddenConnections.length > 0 && (
                        <Section icon={<Link2 className="h-4 w-4" />} title={copy.modalHiddenConnections}>
                          <ul className="space-y-1.5">
                            {report.hiddenConnections.map((c, i) => (
                              <li key={i} className="rounded-md border border-border bg-card/40 px-3 py-2">
                                <p className="text-sm font-medium">{c.title}</p>
                                <p className="text-xs text-muted-foreground text-pretty">
                                  {c.explanation}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </Section>
                      )}

                      {report.boundaryAndSensitivityNotes.length > 0 && (
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {report.boundaryAndSensitivityNotes.map((b, i) => (
                            <li key={i}>· {b}</li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <RelationshipMessageDraftPanel
                  relationshipId={r.id}
                  context={insightContextString}
                />
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.relDetailDeleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {formatRelationshipCopy(copy.relDetailDeleteConfirmDescription, {
                name: r.person_name,
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

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
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

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground text-pretty">
      {children}
    </p>
  );
}

function BulletList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <ul className="space-y-0.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-foreground text-pretty">
            · {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
