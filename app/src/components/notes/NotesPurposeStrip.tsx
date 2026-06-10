"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, Lightbulb, NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OSControl, OSFrostedPanel, OSPrimaryAction } from "@/components/ui/os-primitives";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";

export function NotesPurposeStrip({
  copy,
  onFocusCapture,
}: {
  copy: NotesUiCopy;
  onFocusCapture: () => void;
}) {
  const ideasHref = useLocalizedPath("/ideas");
  const knowledgeHref = useLocalizedPath("/knowledge-base");

  const lanes = [
    {
      key: "ideas" as const,
      icon: Lightbulb,
      href: ideasHref,
      label: copy.purposeStrip.ideaCapture.title,
      description: copy.purposeStrip.ideaCapture.description,
      action: copy.purposeStrip.ideaCapture.action,
    },
    {
      key: "notes" as const,
      icon: NotebookPen,
      href: null,
      label: copy.purposeStrip.notes.title,
      description: copy.purposeStrip.notes.description,
      action: copy.purposeStrip.notes.action,
    },
    {
      key: "knowledge" as const,
      icon: BookOpenCheck,
      href: knowledgeHref,
      label: copy.purposeStrip.knowledge.title,
      description: copy.purposeStrip.knowledge.description,
      action: copy.purposeStrip.knowledge.action,
    },
  ];

  return (
    <OSFrostedPanel className="overflow-hidden p-0" data-notes-reveal>
      <div className="flex flex-col gap-2 border-b border-black/5 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {copy.purposeStrip.title}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {copy.purposeStrip.subtitle}
          </p>
        </div>
        <Badge variant="outline" className="w-fit bg-background/55">
          {copy.purposeStrip.pipeline}
        </Badge>
      </div>
      <div className="grid gap-0 md:grid-cols-3">
        {lanes.map((lane) => {
          const Icon = lane.icon;
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-black/8 bg-background/55 dark:border-white/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {lane.label}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {lane.description}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                {lane.key === "notes" ? (
                  <OSPrimaryAction type="button" osSize="compact" onClick={onFocusCapture}>
                    <NotebookPen className="h-4 w-4" />
                    {lane.action}
                  </OSPrimaryAction>
                ) : (
                  <OSControl
                    osSize="compact"
                    render={<Link href={lane.href ?? "#"} />}
                  >
                    {lane.action}
                    <ArrowRight className="h-4 w-4" />
                  </OSControl>
                )}
              </div>
            </>
          );

          return (
            <section
              key={lane.key}
              className="border-b border-black/5 p-4 last:border-b-0 dark:border-white/10 md:border-b-0 md:border-r md:last:border-r-0"
            >
              {body}
            </section>
          );
        })}
      </div>
    </OSFrostedPanel>
  );
}
