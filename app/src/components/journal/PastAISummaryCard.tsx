"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import type { JournalUiCopy } from "@/lib/i18n/journal-ui";
import type { AIOutput } from "@/lib/journal/schema";

interface PastAISummaryCardProps {
  /** When null, render the empty state. */
  aiOutput: AIOutput | null;
  copy: JournalUiCopy;
  generating?: boolean;
}

export function PastAISummaryCard({
  aiOutput,
  copy,
  generating,
}: PastAISummaryCardProps) {
  // Open by default once a summary exists.
  const [open, setOpen] = useState(true);

  if (!aiOutput && !generating) {
    return (
      <p className="text-sm text-muted-foreground">{copy.pastSummaryEmpty}</p>
    );
  }

  if (generating && !aiOutput) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="size-4 animate-pulse text-primary" aria-hidden />
        {copy.savingSummaryButton}
      </div>
    );
  }

  if (!aiOutput) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
          />
        }
      >
        <span>{open ? "Hide details" : "Show details"}</span>
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-5 pt-3">
          <Section title={copy.pastSummaryJournalEntry}>
            <Markdown text={aiOutput.journalEntry} />
          </Section>

          <Section title={copy.pastSummaryEmotionalRead}>
            <ul className="ml-5 list-disc space-y-1.5 text-sm">
              {aiOutput.emotionalRead.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </Section>

          <Section title={copy.pastSummarySuggestions}>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {copy.pastSummaryCoping}
                </p>
                <p>{aiOutput.suggestions.coping}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {copy.pastSummaryPractical}
                </p>
                <p>{aiOutput.suggestions.practical}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {copy.pastSummaryReframe}
                </p>
                <p>{aiOutput.suggestions.reframeQuestion}</p>
              </div>
            </div>
          </Section>

          <Section title={copy.pastSummaryAppreciation}>
            <Markdown text={aiOutput.earnedAppreciation} />
          </Section>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
