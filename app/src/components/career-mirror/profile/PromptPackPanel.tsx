"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, RefreshCw, Wand2, Copy, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { useAppStore } from "@/stores/app-store";
import { getCareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import type { CareerProfile, CareerPromptPack } from "@/types/database";
import {
  useCareerPromptPacks,
  useCareerMirrorAdvanced,
} from "@/hooks/use-career-mirror-advanced";

type PromptEntry = {
  title?: string;
  body?: string;
  when_to_use?: string;
};

function asPromptEntries(prompts: unknown[]): PromptEntry[] {
  return prompts
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p) => ({
      title: typeof p.title === "string" ? p.title : undefined,
      body: typeof p.body === "string" ? p.body : undefined,
      when_to_use: typeof p.when_to_use === "string" ? p.when_to_use : undefined,
    }));
}

function PromptCard({ entry }: { entry: PromptEntry }) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onCopy = async () => {
    const text = [
      entry.title,
      entry.body,
      entry.when_to_use ? `When to use: ${entry.when_to_use}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be blocked (insecure context / permissions) — fail quietly.
    }
  };

  return (
    <div className="rounded-lg border border-[var(--border-glass)] bg-black/[0.02] p-3 dark:bg-white/[0.03]">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {entry.title ? (
            <p className="text-sm font-semibold leading-snug">{entry.title}</p>
          ) : null}
          {entry.when_to_use ? (
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              {entry.when_to_use}
            </p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Copy prompt"
          onClick={onCopy}
        >
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
      {entry.body ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-snug text-muted-foreground">
          {entry.body}
        </p>
      ) : null}
    </div>
  );
}

export type PromptPackPanelProps = {
  profile: CareerProfile | null;
  className?: string;
};

export function PromptPackPanel({ profile, className }: PromptPackPanelProps) {
  const prefersReduced = useReducedMotion();
  const language = useAppStore((s) => s.language);
  const copy = getCareerMirrorUiCopy(language);

  const packsQuery = useCareerPromptPacks();
  const { generatePromptPack } = useCareerMirrorAdvanced();

  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    const result = await generatePromptPack();
    if (!result.ok) setError(copy.states.error);
    setGenerating(false);
  };

  const packs = packsQuery.data ?? [];

  return (
    <GlassPanel className={cn("p-5", className)}>
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-400/10 text-sky-600 dark:text-sky-300"
        >
          <Wand2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-semibold leading-tight">
            {copy.panels.promptPack}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ready-to-paste prompts tuned to your situation.
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="gradient-pink" disabled={generating} onClick={onGenerate}>
          {generating ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
          {generating ? copy.states.loading : "Generate my prompt pack"}
        </Button>
        {!profile ? (
          <span className="text-xs text-muted-foreground">
            Tip: complete your mirror for sharper prompts.
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5 space-y-5">
        {packsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{copy.states.loading}</p>
        ) : packsQuery.isError ? (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{copy.states.error}</p>
            <Button variant="ghost" size="sm" onClick={() => packsQuery.refetch()}>
              <RefreshCw className="size-3.5" />
              {copy.states.retry}
            </Button>
          </div>
        ) : packs.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            No prompt packs yet — generate one above.
          </p>
        ) : (
          packs.map((pack: CareerPromptPack, packIdx: number) => {
            const entries = asPromptEntries(pack.prompts ?? []);
            return (
              <motion.section
                key={pack.id}
                initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReduced
                    ? REDUCED_MOTION_FADE
                    : { duration: 0.35, ease: EASE_OUT_EXPO, delay: Math.min(packIdx * 0.04, 0.2) }
                }
              >
                <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {pack.title ?? "Prompt pack"}
                </h3>
                {entries.length === 0 ? (
                  <p className="mt-2 text-sm italic text-muted-foreground">
                    {copy.states.emptyTitle}
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {entries.map((entry, i) => (
                      <PromptCard key={i} entry={entry} />
                    ))}
                  </div>
                )}
              </motion.section>
            );
          })
        )}
      </div>
    </GlassPanel>
  );
}

export default PromptPackPanel;
