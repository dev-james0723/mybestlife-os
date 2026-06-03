"use client";

import { useMemo, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import {
  OSControl,
  OSDialogSurface,
  OSIconControl,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleModelPhoto } from "@/components/relationship/role-model-photo";
import { RoleModelDNA } from "@/components/relationship/role-models/role-model-dna";
import { useRoleModelInsight } from "@/hooks/use-role-model-intelligence";
import {
  useRoleModelMindSkills,
  useGenerateNeuralSkill,
} from "@/hooks/use-role-model-neural-skills";
import { findPresetSkillForRoleModel } from "@/lib/mind-council/role-model-skill-map";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sparkles,
  MessageCircle,
  Pencil,
  Trash2,
  Star,
  RefreshCw,
  Zap,
  Link2,
  Lightbulb,
  ShieldAlert,
  Brain,
  Loader2,
  ExternalLink,
  Compass,
} from "lucide-react";
import type { RoleModel } from "@/types/database";
import type { TalkOptions } from "@/hooks/use-role-model-talk";
import type { RoleModelInsightContextPayload } from "@/types/role-model-intelligence";

const EASE = [0.16, 1, 0.3, 1] as const;
const DISCLAIMER = "AI-generated interpretive lens. Not the real person.";

type Props = {
  open: boolean;
  roleModel: RoleModel | null;
  projectMap: Map<string, string>;
  goalMap: Map<string, string>;
  noteMap: Map<string, string>;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite?: () => void;
  onTalk: (rm: RoleModel, opts?: TalkOptions) => void;
  buildContext: (rm: RoleModel) => RoleModelInsightContextPayload;
};

/** Heuristic "Life OS match" derived from the AI overlap buckets (stable, no extra call). */
function computeMatchScore(insight: { overlapWithUser: { high: string[]; medium: string[]; caution: string[] } } | null): number | null {
  if (!insight) return null;
  const { high, medium, caution } = insight.overlapWithUser;
  const raw = 55 + high.length * 10 + medium.length * 4 - caution.length * 6;
  return Math.max(8, Math.min(98, raw));
}

export function RoleModelIntelligenceModal({
  open,
  roleModel,
  projectMap,
  goalMap,
  noteMap,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTalk,
  buildContext,
}: Props) {
  const reduce = useReducedMotion();
  const rmId = roleModel?.id ?? null;
  const { insight, meta, isPeeking, generate } = useRoleModelInsight(rmId);
  const { byRoleModelId } = useRoleModelMindSkills(open && Boolean(roleModel));
  const generateSkill = useGenerateNeuralSkill();

  const preset = useMemo(
    () => (roleModel ? findPresetSkillForRoleModel(roleModel.name) : undefined),
    [roleModel],
  );
  const savedSkill = roleModel ? byRoleModelId.get(roleModel.id) : undefined;

  // The peeked insight is keyed by roleModelId via react-query, so switching
  // models swaps the data automatically — no imperative reset needed.

  if (!roleModel) return null;

  const matchScore = computeMatchScore(insight);
  const photo = roleModel.photo_url ?? roleModel.image_url;
  const blurb = roleModel.admiration_blurb;
  const bio = roleModel.bio ?? roleModel.description;
  const hasInsight = Boolean(insight);
  const generating = generate.isPending;

  const runGenerate = (forceRefresh: boolean) => {
    generate.mutate(
      { context: buildContext(roleModel), forceRefresh },
      { onError: () => toast.error("Could not generate insight. Please try again.") },
    );
  };

  const enter = (i: number) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay: 0.05 + i * 0.06, ease: EASE },
        };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <OSDialogSurface
        size="5xl"
        showCloseButton
        className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] flex-col overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">{roleModel.name} — Intelligence</DialogTitle>

        <div className="flex-1 overflow-y-auto">
          {/* ---- Hero ---- */}
          <div className="relative overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 opacity-90"
              style={{
                background:
                  "radial-gradient(120% 120% at 0% 0%, rgba(99,102,241,0.18), transparent 55%), radial-gradient(120% 120% at 100% 0%, rgba(14,165,233,0.16), transparent 55%)",
              }}
            />
            <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:gap-5 sm:p-7">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border/60 sm:h-28 sm:w-28">
                {photo ? (
                  <RoleModelPhoto src={photo} alt={roleModel.name} pixelSize={120} className="rounded-2xl" />
                ) : (
                  <Avatar className="h-full w-full rounded-2xl">
                    <AvatarFallback className="rounded-2xl text-2xl">
                      {roleModel.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {roleModel.category ? (
                  <Badge variant="secondary" className="text-[11px] uppercase tracking-wide">
                    {roleModel.category}
                  </Badge>
                ) : null}
                <h2 className="font-heading text-2xl font-semibold leading-tight sm:text-3xl">
                  {roleModel.name}
                </h2>
                {blurb ? (
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{blurb}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <OSPrimaryAction
                    onClick={() => onTalk(roleModel)}
                    className="group relative"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Talk To {roleModel.name}
                    {!reduce && (
                      <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-sky-400/0 transition group-hover:ring-sky-400/40" />
                    )}
                  </OSPrimaryAction>
                  {onToggleFavorite ? (
                    <OSIconControl onClick={onToggleFavorite} aria-label="Toggle favorite">
                      <Star className={cn("h-4 w-4", roleModel.is_favorite && "fill-amber-400 text-amber-500")} />
                    </OSIconControl>
                  ) : null}
                  <OSIconControl onClick={onEdit} aria-label="Edit role model">
                    <Pencil className="h-4 w-4" />
                  </OSIconControl>
                  <OSIconControl
                    onClick={onDelete}
                    aria-label="Delete role model"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </OSIconControl>
                </div>
                <p className="text-[11px] text-muted-foreground/70">{DISCLAIMER}</p>
              </div>
            </div>

            {/* ---- Snapshot strip ---- */}
            <div className="relative grid grid-cols-2 gap-px border-y border-border/50 bg-border/40 sm:grid-cols-4">
              <Snapshot label="Life OS Match" value={matchScore != null ? `${matchScore}%` : "—"} hint={matchScore == null ? "Generate insight" : "From overlap"} />
              <Snapshot label="DNA Mapped" value={insight ? `${insight.roleModelDNA.length} traits` : "—"} />
              <Snapshot
                label="Linked"
                value={`${roleModel.linked_project_ids.length + roleModel.linked_goal_ids.length + roleModel.linked_note_ids.length}`}
                hint="projects · goals · notes"
              />
              <Snapshot label="Lens" value={preset ? "Curated" : savedSkill ? "Neural Skill" : "Not set"} />
            </div>
          </div>

          {/* ---- Body: two columns ---- */}
          <div className="grid grid-cols-1 gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            {/* Left: core profile */}
            <div className="space-y-5">
              {bio ? (
                <Section title="Profile" icon={<Compass className="h-4 w-4" />}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{bio}</p>
                </Section>
              ) : null}

              {roleModel.tags.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {roleModel.tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {roleModel.quotes.length ? (
                <Section title="Quotes">
                  <ul className="space-y-2.5">
                    {roleModel.quotes.map((q, i) => (
                      <li key={i} className="border-l-2 border-primary/40 pl-3 text-sm italic text-foreground/90">
                        “{q.text}”
                        {q.source ? <span className="mt-0.5 block text-xs not-italic text-muted-foreground">— {q.source}</span> : null}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {roleModel.key_lessons.length ? (
                <Section title="Key Lessons">
                  <ul className="space-y-2">
                    {roleModel.key_lessons.map((l, i) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium text-foreground">{l.title}</span>
                        {l.detail ? <span className="block text-xs text-muted-foreground">{l.detail}</span> : null}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {roleModel.links.length ? (
                <Section title="Links">
                  <ul className="space-y-1.5">
                    {roleModel.links.map((lk, i) => (
                      <li key={i}>
                        <a
                          href={lk.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {lk.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              <LinkedEntities
                roleModel={roleModel}
                projectMap={projectMap}
                goalMap={goalMap}
                noteMap={noteMap}
              />

              {roleModel.notes ? (
                <Section title="Personal Notes">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{roleModel.notes}</p>
                </Section>
              ) : null}
            </div>

            {/* Right: AI intelligence */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-heading text-sm font-semibold uppercase tracking-wide">AI Intelligence</h3>
                </div>
                {hasInsight ? (
                  <OSControl
                    variant="ghost"
                    onClick={() => runGenerate(true)}
                    disabled={generating}
                  >
                    {generating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                    Refresh
                  </OSControl>
                ) : null}
              </div>

              {!hasInsight && !isPeeking ? (
                <GenerateCTA onGenerate={() => runGenerate(false)} loading={generating} />
              ) : null}

              {(isPeeking || (generating && !hasInsight)) ? <InsightSkeleton /> : null}

              {insight ? (
                <div className="space-y-4">
                  <motion.div {...enter(0)}>
                    <InsightCard title="Why Now?" icon={<Zap className="h-4 w-4 text-amber-500" />} glow>
                      <p className="text-sm leading-relaxed text-foreground/90">{insight.whyNow}</p>
                    </InsightCard>
                  </motion.div>

                  {insight.hiddenConnections.length ? (
                    <motion.div {...enter(1)}>
                      <InsightCard title="Hidden Connections" icon={<Link2 className="h-4 w-4 text-sky-500" />}>
                        <ul className="space-y-3">
                          {insight.hiddenConnections.map((c, i) => (
                            <li key={i} className="rounded-lg border border-border/60 bg-background/50 p-3">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">{c.title}</p>
                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                  {Math.round(c.confidence)}% · {c.sourceType.replace("_", " ")}
                                </Badge>
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground">{c.explanation}</p>
                              <p className="mt-1.5 text-xs italic text-foreground/80">↳ {c.reflectionQuestion}</p>
                            </li>
                          ))}
                        </ul>
                      </InsightCard>
                    </motion.div>
                  ) : null}

                  {insight.roleModelDNA.length ? (
                    <motion.div {...enter(2)}>
                      <InsightCard title="Role Model DNA" icon={<Brain className="h-4 w-4 text-indigo-500" />}>
                        <RoleModelDNA dimensions={insight.roleModelDNA} overlap={insight.overlapWithUser} />
                      </InsightCard>
                    </motion.div>
                  ) : null}

                  {insight.whatNotToCopy.length ? (
                    <motion.div {...enter(3)}>
                      <InsightCard title="What Not To Copy" icon={<ShieldAlert className="h-4 w-4 text-rose-500" />}>
                        <ul className="space-y-1.5">
                          {insight.whatNotToCopy.map((w, i) => (
                            <li key={i} className="flex gap-2 text-sm text-foreground/90">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </InsightCard>
                    </motion.div>
                  ) : null}

                  {insight.mirrorInsight ? (
                    <motion.div {...enter(4)}>
                      <InsightCard title="What This Reveals About You" icon={<Lightbulb className="h-4 w-4 text-violet-500" />}>
                        <p className="text-sm leading-relaxed text-foreground/90">{insight.mirrorInsight}</p>
                      </InsightCard>
                    </motion.div>
                  ) : null}

                  {insight.challengePrompts.length ? (
                    <motion.div {...enter(5)}>
                      <InsightCard title="Challenge Me" icon={<Zap className="h-4 w-4 text-amber-500" />}>
                        <div className="space-y-2">
                          {insight.challengePrompts.map((cp, i) => (
                            <div key={i} className="rounded-lg border border-border/60 bg-background/50 p-3">
                              <p className="mb-1 text-sm font-medium">{cp.title}</p>
                              <p className="mb-2 text-xs leading-relaxed text-muted-foreground">{cp.prompt}</p>
                              <OSControl
                                variant="outline"
                                className="group hover:border-amber-400/60 hover:text-amber-600"
                                onClick={() => onTalk(roleModel, { prompt: cp.prompt })}
                              >
                                <Zap className="mr-1.5 h-3.5 w-3.5" />
                                Send to {roleModel.name}
                              </OSControl>
                            </div>
                          ))}
                        </div>
                      </InsightCard>
                    </motion.div>
                  ) : null}
                </div>
              ) : null}

              {/* Neural Skill / Mind Council */}
              <NeuralSkillPanel
                roleModel={roleModel}
                hasPreset={Boolean(preset)}
                hasSaved={Boolean(savedSkill)}
                onTalk={() => onTalk(roleModel)}
                onGenerate={() => {
                  generateSkill.mutate(
                    {
                      roleModelId: roleModel.id,
                      roleModelName: roleModel.name,
                      context: buildContext(roleModel),
                    },
                    {
                      onSuccess: () => toast.success("Neural Skill created."),
                      onError: () => toast.error("Could not create Neural Skill."),
                    },
                  );
                }}
                generating={generateSkill.isPending}
                bestFor={savedSkill?.skill_json.bestFor ?? []}
                avoidFor={savedSkill?.skill_json.avoidFor ?? []}
              />

              {meta?.generatedAt ? (
                <p className="text-[11px] text-muted-foreground/60">
                  Generated {new Date(meta.generatedAt).toLocaleDateString()}
                  {meta.modelUsed ? ` · ${meta.modelUsed}` : ""}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </OSDialogSurface>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Internal building blocks
// ---------------------------------------------------------------------------

function Snapshot({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-background/70 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-[10px] text-muted-foreground/70">{hint}</p> : null}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function InsightCard({
  title,
  icon,
  children,
  glow,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm",
        glow && "shadow-[0_0_0_1px_rgba(99,102,241,0.12),0_8px_30px_-12px_rgba(99,102,241,0.35)]",
      )}
    >
      <h4 className="mb-2.5 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

function GenerateCTA({ onGenerate, loading }: { onGenerate: () => void; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 text-center">
      <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
      <p className="mb-1 text-sm font-medium">Reveal the hidden intelligence</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Connect this role model to your real projects, goals, and identity.
      </p>
      <OSPrimaryAction onClick={onGenerate} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Generate Insight
      </OSPrimaryAction>
    </div>
  );
}

function InsightSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-border/60 bg-muted/40 p-4">
          <div className="mb-2 h-3 w-32 rounded bg-muted-foreground/20" />
          <div className="mb-1.5 h-2.5 w-full rounded bg-muted-foreground/15" />
          <div className="h-2.5 w-2/3 rounded bg-muted-foreground/15" />
        </div>
      ))}
    </div>
  );
}

function LinkedEntities({
  roleModel,
  projectMap,
  goalMap,
  noteMap,
}: {
  roleModel: RoleModel;
  projectMap: Map<string, string>;
  goalMap: Map<string, string>;
  noteMap: Map<string, string>;
}) {
  const groups: { label: string; ids: string[]; map: Map<string, string> }[] = [
    { label: "Projects", ids: roleModel.linked_project_ids, map: projectMap },
    { label: "Goals", ids: roleModel.linked_goal_ids, map: goalMap },
    { label: "Notes", ids: roleModel.linked_note_ids, map: noteMap },
  ].filter((g) => g.ids.length > 0);

  if (!groups.length) return null;

  return (
    <Section title="Linked in your Life OS" icon={<Link2 className="h-4 w-4" />}>
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">{g.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.ids.map((id) => (
                <Badge key={id} variant="secondary" className="text-xs">
                  {g.map.get(id) ?? "Untitled"}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function NeuralSkillPanel({
  roleModel,
  hasPreset,
  hasSaved,
  onTalk,
  onGenerate,
  generating,
  bestFor,
  avoidFor,
}: {
  roleModel: RoleModel;
  hasPreset: boolean;
  hasSaved: boolean;
  onTalk: () => void;
  onGenerate: () => void;
  generating: boolean;
  bestFor: string[];
  avoidFor: string[];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Brain className="h-4 w-4 text-indigo-500" />
        Mind Council Lens
      </h4>

      {hasPreset ? (
        <p className="mb-3 text-xs text-muted-foreground">
          A curated lens is ready. <span className="font-medium text-foreground">Talk To {roleModel.name}</span> to think with it.
        </p>
      ) : hasSaved ? (
        <div className="mb-3 space-y-2">
          {bestFor.length ? (
            <div>
              <p className="text-[11px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Best for</p>
              <p className="text-xs text-foreground/90">{bestFor.join(" · ")}</p>
            </div>
          ) : null}
          {avoidFor.length ? (
            <div>
              <p className="text-[11px] font-semibold uppercase text-rose-600 dark:text-rose-400">Avoid for</p>
              <p className="text-xs text-foreground/90">{avoidFor.join(" · ")}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">
          Turn {roleModel.name} into a reusable thinking lens for your Mind Council.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <OSPrimaryAction onClick={onTalk}>
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
          Talk To {roleModel.name}
        </OSPrimaryAction>
        {!hasPreset && !hasSaved ? (
          <OSControl onClick={onGenerate} disabled={generating}>
            {generating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            Create Neural Skill
          </OSControl>
        ) : null}
      </div>
    </div>
  );
}
