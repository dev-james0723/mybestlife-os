"use client";

import Link from "next/link";
import {
  Briefcase,
  CheckSquare,
  BookOpen,
  Share2,
  Paperclip,
  MapPin,
  Lightbulb,
  Target,
  Package,
  ExternalLink,
  Trophy,
  Building2,
  FileText,
  Box,
  AppWindow,
} from "lucide-react";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useGoals } from "@/hooks/use-goals";
import { useKnowledgeItemsPickList } from "@/hooks/use-knowledge-items-pick";
import { useCareerNetworkNodes } from "@/hooks/use-career-network";
import type { Idea } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { withAppLocalePrefix } from "@/lib/i18n/locale-path";
import { IDEA_DESTINATION_OPTIONS } from "@/lib/ideas/constants";
import { ideaRelatedResources } from "@/lib/ideas/idea-helpers";
import {
  IDEA_RELATED_CATEGORY_PILL,
  resolveIdeaRelatedCategory,
  type IdeaRelatedCategory,
} from "@/lib/ideas/idea-related-display";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIdeasStore } from "@/stores/ideas-store";
import type { IdeaRelatedResource, IdeaRelatedScope } from "@/types/idea";

type Row = {
  key: string;
  icon: typeof Briefcase;
  scope?: IdeaRelatedScope;
  category?: IdeaRelatedCategory;
  title: string;
  subtitle?: string;
  href?: string;
  external?: boolean;
  percentage?: number;
  explanation?: string;
};

const CATEGORY_ICON: Record<IdeaRelatedCategory, typeof Briefcase> = {
  idea: Lightbulb,
  project: Briefcase,
  goal: Target,
  task: CheckSquare,
  knowledge: BookOpen,
  bucket: Trophy,
  career: Building2,
  asset: Box,
  document: FileText,
  software: AppWindow,
  resource: Package,
};

function relatedHref(r: IdeaRelatedResource, language: AppLocale): { href?: string; external?: boolean } {
  if (r.scope === "knowledge") {
    return { href: withAppLocalePrefix(language, `/knowledge-base/${r.id}/oracle`) };
  }
  if (r.scope === "idea") {
    return { href: withAppLocalePrefix(language, `/ideas?idea=${encodeURIComponent(r.id)}`) };
  }
  if (r.scope === "project") return { href: withAppLocalePrefix(language, "/projects") };
  if (r.scope === "goal") return { href: withAppLocalePrefix(language, "/goals") };
  if (r.scope === "task") return { href: withAppLocalePrefix(language, "/tasks") };
  if (r.scope === "bucket") return { href: withAppLocalePrefix(language, "/bucket-list") };
  if (r.scope === "career") {
    if (r.url) return { href: r.url, external: true };
    return { href: withAppLocalePrefix(language, "/career") };
  }
  if (r.scope === "resource") {
    if (r.url) return { href: r.url, external: true };
    if (r.resourceKind === "software_vault") return { href: withAppLocalePrefix(language, "/vault") };
    return { href: withAppLocalePrefix(language, "/resources") };
  }
  return {};
}

export function IdeaRelatedResources({
  idea,
  language,
  className,
  dense,
}: {
  idea: Idea;
  language: AppLocale;
  className?: string;
  dense?: boolean;
}) {
  const ui = getIdeasUiCopy(language);
  const { data: projects } = useProjects();
  const { data: tasks } = useTasks();
  const { data: goals } = useGoals();
  const { data: knowledgeRows } = useKnowledgeItemsPickList();
  const { data: nodes } = useCareerNetworkNodes();
  const ideas = useIdeasStore((s) => s.items);

  const rows: Row[] = [];
  const seen = new Set<string>();

  for (const rel of ideaRelatedResources(idea).sort((a, b) => b.percentage - a.percentage)) {
    const category = resolveIdeaRelatedCategory(rel);
    const Icon = CATEGORY_ICON[category] ?? Package;
    const link = relatedHref(rel, language);
    const key = `${rel.scope}-${rel.id}`;
    seen.add(key);
    rows.push({
      key,
      icon: Icon,
      scope: rel.scope,
      category,
      title: rel.title,
      subtitle: rel.subtitle ?? ui.relatedScopeLabels[rel.scope],
      href: link.href,
      external: link.external,
      percentage: rel.percentage,
      explanation: rel.explanation,
    });
  }

  for (const id of idea.linked_project_ids) {
    if (seen.has(`project-${id}`)) continue;
    const name = projects?.find((p) => p.id === id)?.name;
    rows.push({
      key: `p-${id}`,
      icon: Briefcase,
      scope: "project",
      category: "project",
      title: name ?? ui.unknownProject,
      subtitle: name ? undefined : id.slice(0, 8),
      href: withAppLocalePrefix(language, "/projects"),
    });
  }

  for (const id of idea.linked_goal_ids) {
    if (seen.has(`goal-${id}`)) continue;
    const goal = goals?.find((g) => g.id === id);
    rows.push({
      key: `g-${id}`,
      icon: Target,
      scope: "goal",
      category: "goal",
      title: goal?.name ?? ui.unknownGoal,
      subtitle: goal?.status ?? id.slice(0, 8),
      href: withAppLocalePrefix(language, "/goals"),
    });
  }

  for (const id of idea.linked_task_ids) {
    if (seen.has(`task-${id}`)) continue;
    const t = tasks?.find((x) => x.id === id);
    rows.push({
      key: `t-${id}`,
      icon: CheckSquare,
      scope: "task",
      category: "task",
      title: t?.title ?? ui.unknownTask,
      subtitle: t?.title ? undefined : id.slice(0, 8),
      href: withAppLocalePrefix(language, "/tasks"),
    });
  }

  for (const id of idea.linked_knowledge_item_ids) {
    if (seen.has(`knowledge-${id}`)) continue;
    const k = knowledgeRows?.find((x) => x.id === id);
    rows.push({
      key: `k-${id}`,
      icon: BookOpen,
      scope: "knowledge",
      category: "knowledge",
      title: k?.title?.trim() || ui.unknownKnowledge,
      href: withAppLocalePrefix(language, `/knowledge-base/${id}/oracle`),
    });
  }

  for (const id of idea.linked_idea_ids) {
    if (seen.has(`idea-${id}`)) continue;
    const linked = ideas.find((x) => x.id === id);
    rows.push({
      key: `i-${id}`,
      icon: Lightbulb,
      scope: "idea",
      category: "idea",
      title: linked?.title?.trim() || ui.unknownIdea,
      subtitle: id.slice(0, 8),
      href: withAppLocalePrefix(language, `/ideas?idea=${encodeURIComponent(id)}`),
    });
  }

  for (const id of idea.linked_node_ids) {
    const n = nodes?.find((x) => x.id === id);
    rows.push({
      key: `n-${id}`,
      icon: Share2,
      category: "career",
      title: n?.name ?? ui.nodeLabel,
      subtitle: n?.name ? undefined : id.slice(0, 8),
    });
  }

  const attachmentCount = Array.isArray(idea.attachments) ? idea.attachments.length : 0;
  if (attachmentCount > 0) {
    rows.push({
      key: "attachments",
      icon: Paperclip,
      title: ui.attachmentCount(attachmentCount),
    });
  }

  for (const d of idea.destinations ?? []) {
    const opt = IDEA_DESTINATION_OPTIONS.find((o) => o.value === d);
    const title = opt ? ui[opt.labelKey] : d;
    rows.push({
      key: `dst-${d}`,
      icon: MapPin,
      title,
    });
  }

  if (rows.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {ui.noRelatedResource}
      </p>
    );
  }

  return (
    <ul className={cn("space-y-2", dense ? "space-y-1.5" : "", className)}>
      {rows.map((r) => {
        const Icon = r.icon;
        return (
          <li
            key={r.key}
            className={cn(
              "min-w-0 rounded-xl border border-border/50 bg-muted/10 p-3 text-sm",
              "transition-colors hover:border-border/70 hover:bg-muted/15",
            )}
          >
            <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5">
              <Icon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {r.category ? (
                    <span
                      className={cn(
                        "inline-flex max-w-full shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-xl",
                        IDEA_RELATED_CATEGORY_PILL[r.category],
                      )}
                    >
                      {ui.relatedCategoryLabels[r.category]}
                    </span>
                  ) : null}
                  <p className="min-w-[8rem] flex-1 break-words font-medium leading-tight text-foreground [overflow-wrap:anywhere]">
                    {r.title}
                  </p>
                </div>
                {r.subtitle ? (
                  <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{r.subtitle}</p>
                ) : null}
                {r.explanation ? (
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground sm:line-clamp-2">
                    {r.explanation}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {typeof r.percentage === "number" && r.percentage > 0 ? (
                  <span className="rounded-full border border-border/50 bg-background/75 px-2 py-0.5 font-mono text-[10px] text-foreground">
                    {r.percentage}%
                  </span>
                ) : null}
                {r.href ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-7 min-h-0 min-w-0 gap-1 rounded-full px-2 text-[11px]"
                    render={
                      <Link
                        href={r.href}
                        target={r.external ? "_blank" : undefined}
                        rel={r.external ? "noreferrer" : undefined}
                      />
                    }
                  >
                    {r.scope === "knowledge" ? (
                      <>
                        <span className="sm:hidden">{ui.openRelated}</span>
                        <span className="hidden sm:inline">{ui.openInKnowledge}</span>
                      </>
                    ) : (
                      ui.openRelated
                    )}
                    {r.external ? <ExternalLink className="h-3 w-3" aria-hidden /> : null}
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
