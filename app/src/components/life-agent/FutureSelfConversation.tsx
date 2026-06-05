"use client";

import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { FutureSelfResponse } from "@/lib/life-agent/intelligence-types";
import { AgentMemoryUsedPanel } from "@/components/life-agent/AgentMemoryUsedPanel";
import { cn } from "@/lib/utils";

type FutureSelfConversationProps = {
  ui: LifeAgentUiCopy;
  data: FutureSelfResponse;
  className?: string;
};

export function FutureSelfConversation({ ui, data, className }: FutureSelfConversationProps) {
  return (
    <article className={cn("space-y-4", className)}>
      <p className="text-sm font-medium leading-relaxed">{data.framing}</p>
      <p className="text-xs italic text-muted-foreground">{ui.futureSelfDisclaimer}</p>
      {data.themesFromLifeOs.length > 0 && (
        <section>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {ui.futureSelfThemesLabel}
          </h4>
          <ul className="flex flex-wrap gap-1.5">
            {data.themesFromLifeOs.map((t) => (
              <li
                key={t}
                className="rounded-full border border-border/50 bg-muted/30 px-2.5 py-0.5 text-xs"
              >
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {ui.futureSelfQuestionsLabel}
        </h4>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/90">
          {data.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </section>
      <p className="rounded-xl bg-muted/30 p-3 text-sm italic text-muted-foreground">
        {data.reflectiveNote}
      </p>
      <AgentMemoryUsedPanel ui={ui} items={data.memoryUsed} />
    </article>
  );
}
