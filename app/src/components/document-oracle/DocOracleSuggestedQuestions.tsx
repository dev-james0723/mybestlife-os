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
  lime: "border-lime-300/20 bg-lime-300/[0.06] text-lime-50/95",
  amber: "border-amber-300/20 bg-amber-300/[0.06] text-amber-50/95",
  blue: "border-sky-300/20 bg-sky-300/[0.06] text-sky-50/95",
  violet: "border-violet-300/20 bg-violet-300/[0.06] text-violet-50/95",
  teal: "border-teal-300/20 bg-teal-300/[0.06] text-teal-50/95",
  rose: "border-rose-300/20 bg-rose-300/[0.06] text-rose-50/95",
  neutral: "border-white/10 bg-white/[0.04] text-white/85",
};

const CHIP_SHELL: Record<SuggestedQuestionTone, string> = {
  lime: "border-lime-300/25 bg-lime-400/[0.05] text-lime-100/95 hover:bg-lime-400/[0.1] hover:border-lime-300/35",
  amber: "border-amber-300/25 bg-amber-400/[0.05] text-amber-100/95 hover:bg-amber-400/[0.1] hover:border-amber-300/35",
  blue: "border-sky-300/25 bg-sky-400/[0.05] text-sky-100/95 hover:bg-sky-400/[0.1] hover:border-sky-300/35",
  violet: "border-violet-300/25 bg-violet-400/[0.05] text-violet-100/95 hover:bg-violet-400/[0.1] hover:border-violet-300/35",
  teal: "border-teal-300/25 bg-teal-400/[0.05] text-teal-100/95 hover:bg-teal-400/[0.1] hover:border-teal-300/35",
  rose: "border-rose-300/25 bg-rose-400/[0.05] text-rose-100/95 hover:bg-rose-400/[0.1] hover:border-rose-300/35",
  neutral: "border-white/12 bg-white/[0.03] text-white/88 hover:bg-white/[0.06] hover:border-white/18",
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
        className="w-full rounded-lg text-left font-medium tracking-tight text-inherit outline-none ring-offset-background transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#C8E53A]/40 focus-visible:ring-offset-1"
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
              className="inline-flex rounded-full border border-white/15 bg-black/25 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-[#C8E53A]/35 hover:text-[#d4f06a]"
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
