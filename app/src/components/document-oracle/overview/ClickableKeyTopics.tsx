"use client";

import { Hash, MessageCircle, BookOpen, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { findGlossaryForTopic, findSectionForTopic } from "@/components/document-oracle/overview/overviewHelpers";
import type { DocOracleGlossaryRow, DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";

const topicTone = "border-border bg-background/50 text-foreground hover:border-primary/35 hover:bg-primary/8";

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

  const kindIcon = (topic: string) => {
    const k = topicKind(topic);
    if (k === "section") return <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />;
    if (k === "glossary") return <Tags className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />;
    return <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />;
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
        {topics.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTopicClick(t)}
            className={cn(
              "inline-flex max-w-full min-h-[40px] touch-manipulation items-center gap-2 rounded-full border px-3 py-2 text-left text-[12px] font-medium leading-snug transition active:scale-[0.99]",
              topicTone,
            )}
          >
            {kindIcon(t)}
            <span className="min-w-0 truncate">{t}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
