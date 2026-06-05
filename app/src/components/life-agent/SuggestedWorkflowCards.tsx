"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import type { LifeAgentUiCopy, LifeAgentWorkflowId } from "@/lib/i18n/life-agent-ui";
import { cn } from "@/lib/utils";

const WORKFLOW_ORDER: LifeAgentWorkflowId[] = [
  "talkThroughThis",
  "prepareMeeting",
  "draftFollowUp",
  "reflectDirection",
];

type SuggestedWorkflowCardsProps = {
  ui: LifeAgentUiCopy;
  onPrefill: (text: string) => void;
  className?: string;
};

export function SuggestedWorkflowCards({ ui, onPrefill, className }: SuggestedWorkflowCardsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className={cn("space-y-3", className)} aria-labelledby="life-agent-workflows-heading">
      <div>
        <h2 id="life-agent-workflows-heading" className="text-sm font-semibold">
          {ui.workflowsTitle}
        </h2>
        <p className="text-xs text-muted-foreground">{ui.workflowsSubtitle}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {WORKFLOW_ORDER.map((id, index) => {
          const card = ui.workflows[id];
          return (
            <motion.button
              key={id}
              type="button"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? REDUCED_MOTION_FADE
                  : { delay: 0.08 + index * 0.04, duration: 0.32, ease: EASE_OUT_EXPO }
              }
              whileHover={reduceMotion ? undefined : { scale: 1.01 }}
              whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              onClick={() => onPrefill(card.prefill)}
              className={cn(
                "group flex items-start gap-2 rounded-2xl border border-border/60 bg-background/50 p-3 text-left",
                "transition-colors hover:border-primary/30 hover:bg-primary/5",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{card.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
              </div>
              <ArrowRight
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
