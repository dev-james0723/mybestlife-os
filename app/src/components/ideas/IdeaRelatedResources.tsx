"use client";

import Link from "next/link";
import {
  Briefcase,
  CheckSquare,
  BookOpen,
  Share2,
  Paperclip,
  MapPin,
} from "lucide-react";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useKnowledgeItemsPickList } from "@/hooks/use-knowledge-items-pick";
import { useCareerNetworkNodes } from "@/hooks/use-career-network";
import type { Idea } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { withAppLocalePrefix } from "@/lib/i18n/locale-path";
import { IDEA_DESTINATION_OPTIONS } from "@/lib/ideas/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Row = {
  key: string;
  icon: typeof Briefcase;
  title: string;
  subtitle?: string;
  href?: string;
};

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
  const { data: knowledgeRows } = useKnowledgeItemsPickList();
  const { data: nodes } = useCareerNetworkNodes();

  const rows: Row[] = [];

  for (const id of idea.linked_project_ids) {
    const name = projects?.find((p) => p.id === id)?.name;
    rows.push({
      key: `p-${id}`,
      icon: Briefcase,
      title: name ?? ui.unknownProject,
      subtitle: name ? undefined : id.slice(0, 8),
    });
  }

  for (const id of idea.linked_task_ids) {
    const t = tasks?.find((x) => x.id === id);
    rows.push({
      key: `t-${id}`,
      icon: CheckSquare,
      title: t?.title ?? ui.unknownTask,
      subtitle: t?.title ? undefined : id.slice(0, 8),
    });
  }

  for (const id of idea.linked_knowledge_item_ids) {
    const k = knowledgeRows?.find((x) => x.id === id);
    rows.push({
      key: `k-${id}`,
      icon: BookOpen,
      title: k?.title?.trim() || ui.unknownKnowledge,
      href: withAppLocalePrefix(language, `/knowledge-base/${id}/oracle`),
    });
  }

  for (const id of idea.linked_node_ids) {
    const n = nodes?.find((x) => x.id === id);
    rows.push({
      key: `n-${id}`,
      icon: Share2,
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
            className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/10 px-3 py-2 text-sm"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium leading-tight">{r.title}</p>
              {r.subtitle ? (
                <p className="truncate font-mono text-[10px] text-muted-foreground">{r.subtitle}</p>
              ) : null}
            </div>
            {r.href ? (
              <Button variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs" render={<Link href={r.href} target="_blank" rel="noreferrer" />}>
                {ui.openInKnowledge}
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
