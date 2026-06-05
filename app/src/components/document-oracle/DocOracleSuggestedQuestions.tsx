"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRightCircle,
  BookOpen,
  CalendarDays,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  ListChecks,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SuggestedQuestion, SuggestedQuestionCategory, SuggestedQuestionTone } from "@/lib/document-brain/suggested-questions";

const CATEGORY_SHELL: Record<SuggestedQuestionTone, string> = {
  lime: "border-border bg-card/65 text-foreground",
  amber: "border-border bg-card/65 text-foreground",
  blue: "border-border bg-card/65 text-foreground",
  violet: "border-border bg-card/65 text-foreground",
  teal: "border-border bg-card/65 text-foreground",
  rose: "border-border bg-card/65 text-foreground",
  neutral: "border-border bg-card/65 text-foreground",
};

const CHIP_SHELL: Record<SuggestedQuestionTone, string> = {
  lime: "border-border bg-background/45 text-foreground/90 hover:border-primary/35 hover:bg-primary/8",
  amber: "border-border bg-background/45 text-foreground/90 hover:border-primary/35 hover:bg-primary/8",
  blue: "border-border bg-background/45 text-foreground/90 hover:border-primary/35 hover:bg-primary/8",
  violet: "border-border bg-background/45 text-foreground/90 hover:border-primary/35 hover:bg-primary/8",
  teal: "border-border bg-background/45 text-foreground/90 hover:border-primary/35 hover:bg-primary/8",
  rose: "border-border bg-background/45 text-foreground/90 hover:border-primary/35 hover:bg-primary/8",
  neutral: "border-border bg-background/45 text-foreground/90 hover:border-primary/35 hover:bg-primary/8",
};

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  layers: Layers,
  "book-open": BookOpen,
  calendar: CalendarDays,
  image: ImageIcon,
  "alert-circle": AlertCircle,
  "arrow-right-circle": ArrowRightCircle,
  "message-circle": MessageCircle,
  "list-check": ListChecks,
};

function CategoryIcon({ name, className }: { name?: string; className?: string }) {
  const Cmp = (name && ICON_MAP[name]) || HelpCircle;
  return <Cmp className={cn("h-3.5 w-3.5 shrink-0 opacity-90", className)} aria-hidden />;
}

function QuestionChip(props: {
  q: SuggestedQuestion;
  tone: SuggestedQuestionTone;
  onAsk: (question: string) => void;
  onOpenSourcePage?: (page: number) => void;
}) {
  const { q, tone, onAsk, onOpenSourcePage } = props;
  const pages = (q.sourcePages ?? []).filter((p) => typeof p === "number" && p > 0).slice(0, 6);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-[12.5px] leading-snug transition duration-150",
        CHIP_SHELL[tone],
      )}
    >
      <button
        type="button"
        onClick={() => onAsk(q.question)}
        className="w-full rounded-lg text-left font-medium tracking-tight text-inherit outline-none ring-offset-background transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
      >
        {q.question}
      </button>
      {q.rationale ? <p className="text-[10.5px] font-normal leading-relaxed opacity-75">{q.rationale}</p> : null}
      {pages.length > 0 && onOpenSourcePage ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSourcePage(p);
              }}
              className="inline-flex rounded-full border border-border bg-background/45 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-primary/35 hover:text-primary"
            >
              p.{p}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DocOracleSuggestedQuestions(props: {
  categories: SuggestedQuestionCategory[];
  onAskQuestion: (question: string) => void;
  onOpenSourcePage?: (page: number) => void;
}) {
  const { categories, onAskQuestion, onOpenSourcePage } = props;
  if (!categories.length) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Suggested questions</p>
        <p className="mt-1 text-[12px] text-muted-foreground/90">
          Start with a document-aware question, or jump into Chat.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((cat) => (
          <section
            key={cat.id}
            className={cn(
              "flex min-w-0 flex-col gap-2.5 rounded-2xl border p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm [-webkit-backdrop-filter:blur(10px)] sm:p-4",
              CATEGORY_SHELL[cat.tone],
            )}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-current">
                <CategoryIcon name={cat.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-semibold tracking-tight text-foreground/95">{cat.label}</h3>
                {cat.description ? (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{cat.description}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {cat.questions.map((q) => (
                <QuestionChip key={q.id} q={q} tone={cat.tone} onAsk={onAskQuestion} onOpenSourcePage={onOpenSourcePage} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
