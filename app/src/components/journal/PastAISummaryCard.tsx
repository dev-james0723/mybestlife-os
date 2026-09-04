"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ChevronDown, Sparkles } from "lucide-react";
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
  failed?: boolean;
}

export function PastAISummaryCard({
  aiOutput,
  copy,
  generating,
  failed,
}: PastAISummaryCardProps) {
  // Open by default once a summary exists.
  const [open, setOpen] = useState(true);
  const reduceMotion = useReducedMotion();

  if (failed && !aiOutput) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-start gap-2 text-sm leading-6 text-amber-700 dark:text-amber-300"
      >
        <AlertTriangle className="mt-1 size-4 shrink-0" aria-hidden />
        <span>{copy.pastSummaryFailed}</span>
      </div>
    );
  }

  if (generating && !aiOutput) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Sparkles className="size-4 animate-pulse text-primary" aria-hidden />
        {copy.savingSummaryButton}
      </div>
    );
  }

  if (!aiOutput) {
    return (
      <p className="text-sm text-muted-foreground">{copy.pastSummaryEmpty}</p>
    );
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-lg px-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
    </motion.div>
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
    <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary prose-hr:border-border dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
