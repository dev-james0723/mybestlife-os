"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  User,
  Target,
  Sparkles,
  Boxes,
  ShieldAlert,
  Eye,
  Wallet,
  Route,
  ListChecks,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import { GlassPanel } from "@/components/ui/glass-panel";
import { useAppStore } from "@/stores/app-store";
import { getCareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import type { CareerProfile, CareerNextAction } from "@/types/database";

type IdentityNode = {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: string[];
  tone: "current" | "desired" | "neutral" | "warning";
};

const TONE_STYLES: Record<IdentityNode["tone"], string> = {
  current: "border-sky-400/40 bg-sky-400/5",
  desired: "border-[var(--accent-pink)]/40 bg-[var(--accent-pink)]/5",
  neutral: "border-[var(--border-glass)] bg-black/[0.02] dark:bg-white/[0.03]",
  warning: "border-amber-400/40 bg-amber-400/5",
};

const ICON_TONE: Record<IdentityNode["tone"], string> = {
  current: "text-sky-600 dark:text-sky-300",
  desired: "text-[var(--accent-pink)]",
  neutral: "text-muted-foreground",
  warning: "text-amber-600 dark:text-amber-300",
};

function clean(value: string | null | undefined): string[] {
  if (!value) return [];
  const t = value.trim();
  return t ? [t] : [];
}

function cleanList(value: string[] | null | undefined): string[] {
  if (!value || value.length === 0) return [];
  return value.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
}

function nextActionTitles(actions: CareerNextAction[] | null | undefined): string[] {
  if (!actions || actions.length === 0) return [];
  return actions
    .map((a) => (a && typeof a.title === "string" ? a.title.trim() : ""))
    .filter(Boolean);
}

export type CareerIdentityMapProps = {
  profile: CareerProfile;
  className?: string;
};

export function CareerIdentityMap({ profile, className }: CareerIdentityMapProps) {
  const prefersReduced = useReducedMotion();
  const language = useAppStore((s) => s.language);
  const copy = getCareerMirrorUiCopy(language);

  const nodes = React.useMemo<IdentityNode[]>(() => {
    const assets = profile.personal_brand_assets ?? {};
    const all: IdentityNode[] = [
      {
        id: "current",
        title: "Current identity",
        icon: <User className="size-4" />,
        tone: "current",
        items: [...clean(profile.career_identity), ...clean(profile.current_role)],
      },
      {
        id: "desired",
        title: "Desired identity",
        icon: <Target className="size-4" />,
        tone: "desired",
        items: [
          ...clean(profile.desired_reputation),
          ...clean(profile.transition_goal),
          ...clean(profile.dream_scenario),
        ],
      },
      {
        id: "skills",
        title: "Skills",
        icon: <Sparkles className="size-4" />,
        tone: "neutral",
        items: cleanList(profile.top_skills),
      },
      {
        id: "assets",
        title: "Assets",
        icon: <Boxes className="size-4" />,
        tone: "neutral",
        items: cleanList(assets.has),
      },
      {
        id: "blockers",
        title: "Blockers",
        icon: <ShieldAlert className="size-4" />,
        tone: "warning",
        items: [...clean(profile.blocker_category), ...clean(profile.blockers)],
      },
      {
        id: "visibility",
        title: "Visibility path",
        icon: <Eye className="size-4" />,
        tone: "neutral",
        items: [
          ...clean(profile.visibility_goal),
          ...clean(profile.content_strategy_direction),
        ],
      },
      {
        id: "income",
        title: "Income path",
        icon: <Wallet className="size-4" />,
        tone: "neutral",
        items: clean(profile.ambition_style),
      },
      {
        id: "transition",
        title: "Transition path",
        icon: <Route className="size-4" />,
        tone: "neutral",
        items: [
          ...clean(profile.transition_type),
          ...clean(profile.transition_timeline),
        ],
      },
      {
        id: "next",
        title: "Next moves",
        icon: <ListChecks className="size-4" />,
        tone: "desired",
        items: nextActionTitles(profile.ai_next_actions),
      },
    ];
    return all;
  }, [profile]);

  const hasAny = nodes.some((n) => n.items.length > 0);

  return (
    <GlassPanel className={cn("p-5", className)}>
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]"
        >
          <Route className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-semibold leading-tight">
            {copy.panels.careerIdentityMap}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            How who you are connects to where you're heading.
          </p>
        </div>
      </header>

      {!hasAny ? (
        <p className="mt-5 text-sm italic text-muted-foreground">
          {copy.states.emptyDescription}
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node, i) => (
            <motion.div
              key={node.id}
              initial={prefersReduced ? false : { opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={
                prefersReduced
                  ? REDUCED_MOTION_FADE
                  : { duration: 0.4, ease: EASE_OUT_EXPO, delay: Math.min(i * 0.05, 0.4) }
              }
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-3",
                TONE_STYLES[node.tone],
              )}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden className={cn("inline-flex", ICON_TONE[node.tone])}>
                  {node.icon}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {node.title}
                </span>
              </div>
              {node.items.length > 0 ? (
                <ul className="space-y-1">
                  {node.items.map((item, idx) => (
                    <li
                      key={idx}
                      className="line-clamp-3 text-sm leading-snug text-foreground"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs italic text-muted-foreground">Not set yet</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}

export default CareerIdentityMap;
