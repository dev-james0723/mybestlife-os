"use client";

import { format, parseISO } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { QUADRANT_META } from "@/lib/journal/constants";
import { aiOutputSchema } from "@/lib/journal/schema";
import type { JournalUiCopy } from "@/lib/i18n/journal-ui";
import type { JournalEntry } from "@/types/database";

interface EntryDetailModalProps {
  entry: JournalEntry | null;
  copy: JournalUiCopy;
  onClose: () => void;
}

export function EntryDetailModal({
  entry,
  copy,
  onClose,
}: EntryDetailModalProps) {
  return (
    <Dialog open={!!entry} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copy.detailTitle}</DialogTitle>
        </DialogHeader>

        {entry && <EntryDetailBody entry={entry} copy={copy} />}
      </DialogContent>
    </Dialog>
  );
}

function EntryDetailBody({
  entry,
  copy,
}: {
  entry: JournalEntry;
  copy: JournalUiCopy;
}) {
  const meta = QUADRANT_META[entry.quadrant];
  const bullets = entry.bullets?.items ?? [];
  const needs = entry.needs?.items ?? [];
  const aiOutput = (() => {
    if (!entry.aiOutput) return null;
    const parsed = aiOutputSchema.safeParse(entry.aiOutput);
    return parsed.success ? parsed.data : null;
  })();

  return (
    <div className="space-y-5 pt-2">
      {/* Date header */}
      <p className="text-sm text-muted-foreground">
        {(() => {
          try {
            return format(parseISO(entry.entryDate), "MMM dd, yyyy");
          } catch {
            return entry.entryDate;
          }
        })()}
      </p>

      <Section title={copy.detailSectionTopic}>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{copy.topicName[entry.topic as keyof typeof copy.topicName] ?? entry.topic}</Badge>
        </div>
      </Section>

      <Section title={copy.detailSectionEmotions}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn("border", meta.bgSelectedClass, meta.borderClass, meta.textClass)}
            variant="outline"
          >
            {copy.quadrantName[entry.quadrant]} · {copy.quadrantSubtitle[entry.quadrant]}
          </Badge>
          <Badge variant="secondary">
            {entry.primaryEmotion} · {copy.intensityBadge(entry.intensity)}
          </Badge>
          {entry.secondaryEmotion && (
            <Badge variant="outline">+ {entry.secondaryEmotion}</Badge>
          )}
          {entry.target && (
            <Badge variant="outline">→ {entry.target}</Badge>
          )}
        </div>
      </Section>

      {bullets.length > 0 && (
        <Section title={copy.detailSectionWhatHappened}>
          <ul className="ml-5 list-disc space-y-1 text-sm">
            {bullets.map((b, idx) => (
              <li key={idx}>{b}</li>
            ))}
          </ul>
        </Section>
      )}

      {entry.selfStory && (
        <Section title={copy.detailSectionSelfStory}>
          <p className="whitespace-pre-wrap text-sm">{entry.selfStory}</p>
        </Section>
      )}

      {needs.length > 0 && (
        <Section title={copy.detailSectionNeeds}>
          <div className="flex flex-wrap gap-1.5">
            {needs.map((n) => (
              <Badge key={n} variant="secondary">
                {n}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {entry.nextTinyStep && (
        <Section title={copy.detailSectionNextTinyStep}>
          <p className="text-sm">{entry.nextTinyStep}</p>
        </Section>
      )}

      {aiOutput && (
        <>
          <Separator />
          <Section title={copy.detailSectionAISummary}>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {aiOutput.journalEntry}
              </ReactMarkdown>
            </div>
          </Section>
        </>
      )}
    </div>
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
