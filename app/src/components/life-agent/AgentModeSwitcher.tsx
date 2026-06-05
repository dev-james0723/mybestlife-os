"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentMode } from "@/lib/life-agent/types";

const MODES: LifeAgentMode[] = ["companion", "orchestrator", "operator", "mirror"];

type AgentModeSwitcherProps = {
  ui: LifeAgentUiCopy;
  mode: LifeAgentMode;
  onModeChange: (mode: LifeAgentMode) => void;
};

export function AgentModeSwitcher({ ui, mode, onModeChange }: AgentModeSwitcherProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="space-y-3" aria-labelledby="life-agent-mode-heading">
      <h2 id="life-agent-mode-heading" className="text-sm font-semibold tracking-tight">
        {ui.modeSectionTitle}
      </h2>
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={ui.modeSectionTitle}
      >
        {MODES.map((m) => {
          const active = m === mode;
          const meta = ui.modes[m];
          return (
            <motion.button
              key={m}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onModeChange(m)}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={REDUCED_MOTION_FADE}
              className={cn(
                "min-w-[7.5rem] flex-1 rounded-2xl border px-3 py-2.5 text-left sm:max-w-[12rem]",
                active
                  ? "border-primary/50 bg-primary/10 shadow-sm"
                  : "border-border/60 bg-background/50 hover:bg-muted/40",
              )}
            >
              <span className="block text-sm font-medium">{meta.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                {meta.description}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
