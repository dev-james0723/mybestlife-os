"use client";

import { Hash, MessageCircle, BookOpen, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { findGlossaryForTopic, findSectionForTopic } from "@/components/document-oracle/overview/overviewHelpers";
import type { DocOracleGlossaryRow, DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";

const TOPIC_TONES = [
  {
    chip: "border-sky-400/35 bg-sky-400/10 text-sky-900 hover:border-sky-400/55 hover:bg-sky-400/15 dark:text-sky-100",
    icon: "text-sky-600 dark:text-sky-300",
  },
  {
    chip: "border-emerald-400/35 bg-emerald-400/10 text-emerald-900 hover:border-emerald-400/55 hover:bg-emerald-400/15 dark:text-emerald-100",
    icon: "text-emerald-600 dark:text-emerald-300",
  },
  {
    chip: "border-violet-400/35 bg-violet-400/10 text-violet-900 hover:border-violet-400/55 hover:bg-violet-400/15 dark:text-violet-100",
    icon: "text-violet-600 dark:text-violet-300",
  },
  {
    chip: "border-amber-400/35 bg-amber-400/10 text-amber-950 hover:border-amber-400/55 hover:bg-amber-400/15 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-300",
  },
  {
    chip: "border-rose-400/35 bg-rose-400/10 text-rose-900 hover:border-rose-400/55 hover:bg-rose-400/15 dark:text-rose-100",
    icon: "text-rose-600 dark:text-rose-300",
  },
  {
    chip: "border-cyan-400/35 bg-cyan-400/10 text-cyan-900 hover:border-cyan-400/55 hover:bg-cyan-400/15 dark:text-cyan-100",
    icon: "text-cyan-600 dark:text-cyan-300",
  },
] as const;

export function ClickableKeyTopics(props: {
  topics: string[];
  sections: DocOracleSectionRow[];
  glossary: DocOracleGlossaryRow[];
  onAskAboutTopic: (topic: string) => void;
  setTab: (tab: string) => void;
  setSectionDetail: (s: DocOracleSectionRow) => void;
  setGlossQ: (q: string) => void;
  anchorId?: string;
}) {
  const { topics, sections, glossary, onAskAboutTopic, setTab, setSectionDetail, setGlossQ, anchorId } =
    props;

  if (!topics.length) return null;

  const handleTopicClick = (topic: string) => {
    const section = findSectionForTopic(sections, topic);
    if (section) {
      setSectionDetail(section);
      setTab("sections");
      return;
    }
    const glossaryTerm = findGlossaryForTopic(glossary, topic);
    if (glossaryTerm) {
      setGlossQ(glossaryTerm.term);
      setTab("glossary");
      return;
    }
    onAskAboutTopic(topic);
  };

  const topicKind = (topic: string) => {
    if (findSectionForTopic(sections, topic)) return "section" as const;
    if (findGlossaryForTopic(glossary, topic)) return "glossary" as const;
    return "chat" as const;
  };

  const topicTone = (topic: string, index: number) => {
    const offset = topicKind(topic) === "section" ? 0 : topicKind(topic) === "glossary" ? 2 : 4;
    return TOPIC_TONES[(index + offset) % TOPIC_TONES.length];
  };

  const kindIcon = (topic: string, className?: string) => {
    const k = topicKind(topic);
    if (k === "section") return <BookOpen className={cn("h-3.5 w-3.5 shrink-0 opacity-90", className)} aria-hidden />;
    if (k === "glossary") return <Tags className={cn("h-3.5 w-3.5 shrink-0 opacity-90", className)} aria-hidden />;
    return <MessageCircle className={cn("h-3.5 w-3.5 shrink-0 opacity-90", className)} aria-hidden />;
  };

  return (
    <section id={anchorId} className="scroll-mt-24">
      <div className="mb-2 flex items-center gap-2">
        <Hash className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">Key topics</h3>
      </div>
      <p className="mb-3 text-[12px] text-muted-foreground">
        Tap a topic to open the matching section or glossary entry, or ask Doc Oracle with citations.
      </p>
      <div className="flex flex-wrap gap-2">
        {topics.map((t, index) => {
          const tone = topicTone(t, index);
          return (
            <button
              key={t}
              type="button"
              onClick={() => handleTopicClick(t)}
              className={cn(
                "inline-flex max-w-full min-h-[40px] touch-manipulation items-center gap-2 rounded-full border px-3 py-2 text-left text-[12px] font-medium leading-snug shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition active:scale-[0.99]",
                tone.chip,
              )}
            >
              {kindIcon(t, tone.icon)}
              <span className="min-w-0 truncate">{t}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
