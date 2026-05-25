"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Trash2, Sparkles, AlertTriangle, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Textarea } from "@/components/ui/textarea";
import { CardSelect, type CardSelectOption } from "@/components/career-mirror/inputs/CardSelect";
import { useAppStore } from "@/stores/app-store";
import { getCareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import type { CareerProfile, CareerScenario } from "@/types/database";
import {
  useCareerScenarios,
  useCareerMirrorAdvanced,
  type ScenarioResultData,
} from "@/hooks/use-career-mirror-advanced";

const ROUTE_OPTIONS: Array<{ id: string; label: string; description: string }> = [
  { id: "stay-in-lane", label: "Stay in my lane", description: "Deepen the role I'm already in." },
  { id: "build-product", label: "Build a product", description: "Ship something people pay for." },
  { id: "apply-degree", label: "Apply for a degree", description: "Go back to formal study." },
  { id: "build-brand", label: "Build a personal brand", description: "Become known for a niche." },
  { id: "launch-education", label: "Launch an education offer", description: "Teach, course, cohort." },
  { id: "go-entrepreneur", label: "Go full entrepreneur", description: "Bet on my own venture." },
  { id: "academic", label: "Pursue an academic path", description: "Research, teaching, tenure." },
  { id: "build-audience", label: "Build an audience", description: "Grow reach before monetising." },
];

function ResultList({ title, items, tone }: { title: string; items?: string[]; tone?: "pro" | "con" }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-snug text-foreground">
            <span
              aria-hidden
              className={cn(
                "mt-1.5 inline-block size-1.5 shrink-0 rounded-full",
                tone === "pro"
                  ? "bg-emerald-400"
                  : tone === "con"
                    ? "bg-amber-400"
                    : "bg-[var(--accent-pink)]",
              )}
            />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScenarioResultCard({ result }: { result: ScenarioResultData }) {
  const probabilityPct =
    typeof result.probability === "number"
      ? Math.round(Math.max(0, Math.min(1, result.probability)) * 100)
      : null;

  return (
    <div className="space-y-4">
      {result.outcome_summary ? (
        <p className="text-sm leading-relaxed text-foreground">{result.outcome_summary}</p>
      ) : null}

      {probabilityPct != null ? (
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Probability it goes your way
            </span>
            <span className="text-lg font-bold tabular-nums">{probabilityPct}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent-pink-from)] to-[var(--accent-pink-to)] transition-all"
              style={{ width: `${probabilityPct}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <ResultList title="Pros" items={result.pros} tone="pro" />
        <ResultList title="Cons" items={result.cons} tone="con" />
      </div>

      <ResultList title="Assets you'll need" items={result.required_assets} />

      <div className="grid gap-3 sm:grid-cols-2">
        {result.hidden_cost ? (
          <div className="rounded-lg border border-[var(--border-glass)] bg-black/[0.03] p-3 dark:bg-white/[0.04]">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Hidden cost
            </p>
            <p className="mt-1 text-sm leading-snug">{result.hidden_cost}</p>
          </div>
        ) : null}
        {result.likely_failure_point ? (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
            <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-300">
              <AlertTriangle className="size-3" /> Likely failure point
            </p>
            <p className="mt-1 text-sm leading-snug">{result.likely_failure_point}</p>
          </div>
        ) : null}
      </div>

      {result.first_30_day_move ? (
        <div className="rounded-lg border border-[var(--accent-pink)]/30 bg-[var(--accent-pink)]/5 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--accent-pink)]">
            First 30-day move
          </p>
          <p className="mt-1 text-sm leading-snug">{result.first_30_day_move}</p>
        </div>
      ) : null}

      <ResultList title="Recommended next steps" items={result.recommended_next_steps} />
    </div>
  );
}

export type ScenarioSimulatorProps = {
  profile: CareerProfile | null;
  className?: string;
};

export function ScenarioSimulator({ profile, className }: ScenarioSimulatorProps) {
  const prefersReduced = useReducedMotion();
  const language = useAppStore((s) => s.language);
  const copy = getCareerMirrorUiCopy(language);

  const scenariosQuery = useCareerScenarios();
  const { createScenario, deleteScenario } = useCareerMirrorAdvanced();

  const [route, setRoute] = React.useState<string>("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [latest, setLatest] = React.useState<ScenarioResultData | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const options: CardSelectOption[] = ROUTE_OPTIONS.map((o) => ({
    id: o.id,
    label: o.label,
    description: o.description,
  }));

  const selectedLabel = ROUTE_OPTIONS.find((o) => o.id === route)?.label ?? "";

  const onSimulate = async () => {
    if (!route || submitting) return;
    setSubmitting(true);
    setError(null);
    const title = note.trim()
      ? `${selectedLabel}: ${note.trim().slice(0, 80)}`
      : selectedLabel;
    const result = await createScenario({
      title,
      inputs: { route, note: note.trim() || undefined },
    });
    if (result.ok) {
      const r = (result.scenario.result ?? null) as ScenarioResultData | null;
      setLatest(r);
      setNote("");
    } else {
      setError(copy.states.error);
    }
    setSubmitting(false);
  };

  const onDelete = async (id: string) => {
    setDeletingId(id);
    await deleteScenario(id);
    setDeletingId(null);
  };

  const scenarios = scenariosQuery.data ?? [];

  return (
    <GlassPanel className={cn("p-5", className)}>
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]"
        >
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold leading-tight">
            {copy.panels.scenarioSimulator}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pick a future route and see how it plays out for you.
          </p>
        </div>
      </header>

      <div className="mt-4">
        <CardSelect options={options} value={route} onChange={(v) => setRoute(v as string)} />
      </div>

      <Textarea
        className="mt-3"
        rows={2}
        placeholder="Optional: add a detail that makes this yours…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label="Scenario note"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="gradient-pink" disabled={!route || submitting} onClick={onSimulate}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {submitting ? "Simulating…" : "Simulate this route"}
        </Button>
        {!profile ? (
          <span className="text-xs text-muted-foreground">
            Tip: complete your mirror for sharper results.
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {latest ? (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReduced ? REDUCED_MOTION_FADE : { duration: 0.4, ease: EASE_OUT_EXPO }}
          className="mt-5 rounded-xl border border-[var(--border-glass)] bg-black/[0.02] p-4 dark:bg-white/[0.03]"
        >
          <ScenarioResultCard result={latest} />
        </motion.div>
      ) : null}

      <div className="mt-6">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Saved scenarios
        </h3>
        {scenariosQuery.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">{copy.states.loading}</p>
        ) : scenariosQuery.isError ? (
          <div className="mt-2 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{copy.states.error}</p>
            <Button variant="ghost" size="sm" onClick={() => scenariosQuery.refetch()}>
              <RefreshCw className="size-3.5" />
              {copy.states.retry}
            </Button>
          </div>
        ) : scenarios.length === 0 ? (
          <p className="mt-2 text-sm italic text-muted-foreground">
            No saved scenarios yet — simulate one above.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {scenarios.map((s: CareerScenario) => {
              const r = (s.result ?? null) as ScenarioResultData | null;
              const prob =
                r && typeof r.probability === "number"
                  ? Math.round(Math.max(0, Math.min(1, r.probability)) * 100)
                  : null;
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border-glass)] bg-black/[0.02] p-3 dark:bg-white/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    {prob != null ? (
                      <p className="text-xs text-muted-foreground">{prob}% likely to land</p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete scenario"
                    disabled={deletingId === s.id}
                    onClick={() => onDelete(s.id)}
                  >
                    {deletingId === s.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </GlassPanel>
  );
}

export default ScenarioSimulator;
