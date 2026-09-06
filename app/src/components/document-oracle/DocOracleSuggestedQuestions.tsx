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
  lime: "border-lime-400/30 bg-lime-400/10",
  amber: "border-amber-400/30 bg-amber-400/10",
  blue: "border-sky-400/30 bg-sky-400/10",
  violet: "border-violet-400/30 bg-violet-400/10",
  teal: "border-teal-400/30 bg-teal-400/10",
  rose: "border-rose-400/30 bg-rose-400/10",
  neutral: "border-border bg-card/65 text-foreground",
};

const CHIP_SHELL: Record<SuggestedQuestionTone, string> = {
  lime: "border-lime-400/25 bg-lime-400/10 text-lime-950 hover:border-lime-400/45 hover:bg-lime-400/15 dark:text-lime-50",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-950 hover:border-amber-400/45 hover:bg-amber-400/15 dark:text-amber-50",
  blue: "border-sky-400/25 bg-sky-400/10 text-sky-950 hover:border-sky-400/45 hover:bg-sky-400/15 dark:text-sky-50",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-950 hover:border-violet-400/45 hover:bg-violet-400/15 dark:text-violet-50",
  teal: "border-teal-400/25 bg-teal-400/10 text-teal-950 hover:border-teal-400/45 hover:bg-teal-400/15 dark:text-teal-50",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-950 hover:border-rose-400/45 hover:bg-rose-400/15 dark:text-rose-50",
  neutral: "border-border bg-background/45 text-foreground/90 hover:border-primary/35 hover:bg-primary/8",
};

const ICON_SHELL: Record<SuggestedQuestionTone, string> = {
  lime: "border-lime-400/25 bg-lime-400/15 text-lime-700 dark:text-lime-200",
  amber: "border-amber-400/25 bg-amber-400/15 text-amber-700 dark:text-amber-200",
  blue: "border-sky-400/25 bg-sky-400/15 text-sky-700 dark:text-sky-200",
  violet: "border-violet-400/25 bg-violet-400/15 text-violet-700 dark:text-violet-200",
  teal: "border-teal-400/25 bg-teal-400/15 text-teal-700 dark:text-teal-200",
  rose: "border-rose-400/25 bg-rose-400/15 text-rose-700 dark:text-rose-200",
  neutral: "border-border bg-muted/45 text-muted-foreground",
};

const PAGE_PILL: Record<SuggestedQuestionTone, string> = {
  lime: "border-lime-400/25 bg-lime-400/10 text-lime-700 hover:border-lime-400/45 dark:text-lime-200",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-700 hover:border-amber-400/45 dark:text-amber-200",
  blue: "border-sky-400/25 bg-sky-400/10 text-sky-700 hover:border-sky-400/45 dark:text-sky-200",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-700 hover:border-violet-400/45 dark:text-violet-200",
  teal: "border-teal-400/25 bg-teal-400/10 text-teal-700 hover:border-teal-400/45 dark:text-teal-200",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-700 hover:border-rose-400/45 dark:text-rose-200",
  neutral: "border-border bg-background/45 text-muted-foreground hover:border-primary/35 hover:text-primary",
};

const FALLBACK_TONES: SuggestedQuestionTone[] = ["lime", "amber", "blue", "violet", "teal", "rose"];

function resolveTone(tone: SuggestedQuestionTone, index: number): SuggestedQuestionTone {
  if (tone !== "neutral") return tone;
  return FALLBACK_TONES[index % FALLBACK_TONES.length];
}

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
            <button data-control-variant="outline"
              key={p}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSourcePage(p);
              }}
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium transition",
                PAGE_PILL[tone],
              )}
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
        {categories.map((cat, index) => {
          const tone = resolveTone(cat.tone, index);
          return (
            <section
              key={cat.id}
              className={cn(
                "flex min-w-0 flex-col gap-2.5 rounded-2xl border p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm [-webkit-backdrop-filter:blur(10px)] sm:p-4",
                CATEGORY_SHELL[tone],
              )}
            >
              <div className="flex items-start gap-2">
                <span className={cn("mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border", ICON_SHELL[tone])}>
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
                  <QuestionChip key={q.id} q={q} tone={tone} onAsk={onAskQuestion} onOpenSourcePage={onOpenSourcePage} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
