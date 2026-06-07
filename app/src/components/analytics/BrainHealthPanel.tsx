"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { BrainCircuit, Link2Off } from "lucide-react";

import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import { Badge } from "@/components/ui/badge";
import type { BrainHealth } from "@/lib/analytics/types";

const SIGNAL_PATHS = [
  {
    d: "M90 145 C132 108 190 108 236 143",
    stroke: "hsl(190 92% 62% / 0.78)",
  },
  {
    d: "M133 93 C179 80 230 100 277 145",
    stroke: "hsl(210 94% 64% / 0.72)",
  },
  {
    d: "M121 176 C172 145 231 151 292 184",
    stroke: "hsl(155 78% 58% / 0.68)",
  },
];

const SIGNAL_NODES = [
  [90, 145],
  [133, 93],
  [190, 108],
  [236, 143],
  [277, 145],
  [121, 176],
  [231, 151],
  [292, 184],
];

function HumanBrainIllustration({ health }: { health: BrainHealth }) {
  const reduceMotion = useReducedMotion();
  const orphanGlow = Math.max(0.12, Math.min(0.44, health.orphanRate));
  const connectionStrength = Math.max(0.35, Math.min(0.9, health.averageDegree / 5));

  return (
    <div
      className="relative h-52 w-full overflow-hidden rounded-xl border border-border/50 bg-[radial-gradient(circle_at_50%_45%,hsl(var(--primary)/0.20),transparent_42%),linear-gradient(180deg,hsl(var(--background)/0.32),hsl(var(--muted)/0.18))]"
      role="img"
      aria-label="Human brain health preview"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_46%,hsl(190_85%_58%/0.12),transparent_36%)]" />
      <motion.div
        className="absolute inset-x-2 bottom-2 top-3"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 6 }}
        animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <Image
          src="/analytics/human-brain.png"
          alt=""
          fill
          sizes="(min-width: 1024px) 240px, 100vw"
          className="object-contain drop-shadow-[0_22px_42px_hsl(var(--primary)/0.24)]"
        />
      </motion.div>

      <svg
        aria-hidden
        viewBox="0 0 390 270"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {SIGNAL_PATHS.map(({ d, stroke }, index) => (
          <motion.path
            key={d}
            d={d}
            fill="none"
            stroke={stroke}
            strokeWidth={1.4 + connectionStrength}
            strokeLinecap="round"
            strokeDasharray="10 18"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0.15 }}
            animate={
              reduceMotion
                ? undefined
                : {
                    pathLength: 1,
                    opacity: [0.12, 0.72, 0.22],
                    strokeDashoffset: [0, -24],
                  }
            }
            transition={{
              duration: 1.6 + index * 0.12,
              delay: index * 0.08,
              repeat: reduceMotion ? 0 : Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
          />
        ))}

        {SIGNAL_NODES.map(([cx, cy], index) => {
          const dim = index % 4 === 0 && health.orphanRate > 0.25;
          return (
            <motion.circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r={dim ? 2.5 : 3.4}
              fill={
                dim
                  ? `hsl(var(--muted-foreground) / ${orphanGlow})`
                  : "hsl(190 96% 66% / 0.86)"
              }
              initial={reduceMotion ? false : { opacity: 0, scale: 0.72 }}
              animate={
                reduceMotion
                  ? undefined
                  : {
                      opacity: dim ? orphanGlow : [0.25, 0.9, 0.36],
                      scale: dim ? 1 : [0.86, 1.25, 0.95],
                    }
              }
              transition={{
                duration: 1.25,
                delay: index * 0.05,
                repeat: reduceMotion || dim ? 0 : Infinity,
                repeatType: "mirror",
              }}
            />
          );
        })}
      </svg>

      <motion.div
        aria-hidden
        className="absolute top-9 h-28 w-12 -skew-x-12 rounded-full blur-xl"
        style={{
          background:
            "linear-gradient(90deg, transparent, hsl(190 100% 70% / 0.16), transparent)",
        }}
        initial={reduceMotion ? false : { x: "-24%", opacity: 0 }}
        animate={
          reduceMotion
            ? undefined
            : {
                x: ["-24%", "116%"],
                opacity: [0, 0.9, 0],
              }
        }
        transition={{
          duration: 2.6,
          repeat: reduceMotion ? 0 : Infinity,
          repeatDelay: 1.2,
          ease: "easeInOut",
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/24 to-transparent" />
    </div>
  );
}

export function BrainHealthPanel({ health }: { health: BrainHealth }) {
  return (
    <GlassTintPanel tint="violet" className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-4 text-primary" />
            <h2 className="text-base font-semibold tracking-normal">Brain Health</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{health.interpretation}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <HumanBrainIllustration health={health} />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-background/35 p-3">
              <p className="text-2xl font-semibold tabular-nums">{health.totalNodes}</p>
              <p className="text-xs text-muted-foreground">nodes</p>
            </div>
            <div className="rounded-xl bg-background/35 p-3">
              <p className="text-2xl font-semibold tabular-nums">{health.totalEdges}</p>
              <p className="text-xs text-muted-foreground">edges</p>
            </div>
            <div className="rounded-xl bg-background/35 p-3">
              <p className="text-2xl font-semibold tabular-nums">
                {Math.round(health.orphanRate * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">orphan rate</p>
            </div>
            <div className="rounded-xl bg-background/35 p-3">
              <p className="text-2xl font-semibold tabular-nums">
                {health.averageDegree}
              </p>
              <p className="text-xs text-muted-foreground">avg degree</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Top connected domains
            </p>
            <div className="flex flex-wrap gap-2">
              {health.topConnectedDomains.length > 0 ? (
                health.topConnectedDomains.map((domain) => (
                  <Badge key={domain.domain} variant="outline">
                    {domain.domain} · {domain.degree}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No connected domains yet.
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Isolated domains
            </p>
            <div className="flex flex-wrap gap-2">
              {health.isolatedDomains.length > 0 ? (
                health.isolatedDomains.map((domain) => (
                  <Badge key={domain} variant="secondary">
                    <Link2Off className="size-3" />
                    {domain}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No fully isolated domains detected.
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/30 p-4">
            <p className="mb-2 text-sm font-medium">Suggested missing connections</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              {health.suggestedMissingConnections.length > 0 ? (
                health.suggestedMissingConnections.map((suggestion) => (
                  <p key={suggestion}>{suggestion}</p>
                ))
              ) : (
                <p>The graph has enough basic links for this lens. Keep linking new captures as they arrive.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </GlassTintPanel>
  );
}
