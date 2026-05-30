"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BrainCircuit, Link2Off } from "lucide-react";

import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import { Badge } from "@/components/ui/badge";
import type { BrainHealth } from "@/lib/analytics/types";

function NeuronBrainIllustration({ health }: { health: BrainHealth }) {
  const reduceMotion = useReducedMotion();
  const orphanGlow = Math.max(0.12, Math.min(0.44, health.orphanRate));
  const connectionStrength = Math.max(0.35, Math.min(0.9, health.averageDegree / 5));
  const neuronPaths = [
    "M74 82 C104 50 142 64 164 96",
    "M86 134 C116 110 146 122 176 100",
    "M96 188 C126 154 166 164 206 136",
    "M192 78 C232 46 284 62 306 102",
    "M198 132 C238 108 276 122 308 154",
    "M218 190 C248 158 288 172 316 202",
    "M150 92 C176 114 184 140 182 170",
    "M210 90 C194 120 198 152 220 182",
  ];
  const neurons = [
    [74, 82],
    [116, 64],
    [164, 96],
    [86, 134],
    [146, 122],
    [96, 188],
    [206, 136],
    [192, 78],
    [256, 58],
    [306, 102],
    [238, 108],
    [308, 154],
    [218, 190],
    [278, 176],
    [316, 202],
    [182, 170],
    [220, 182],
  ];

  return (
    <svg
      viewBox="0 0 390 270"
      className="h-52 w-full rounded-xl border border-border/50 bg-[radial-gradient(circle_at_46%_42%,hsl(var(--primary)/0.18),transparent_38%),linear-gradient(180deg,hsl(var(--background)/0.32),hsl(var(--muted)/0.18))]"
      role="img"
      aria-label="Neural Brain health preview"
    >
      <defs>
        <filter id="brain-neuron-glow" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.34 0 0 0 0 0.78 0 0 0 0 0.93 0 0 0 0.75 0"
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="brain-shell" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary) / 0.34)" />
          <stop offset="55%" stopColor="hsl(265 72% 62% / 0.22)" />
          <stop offset="100%" stopColor="hsl(335 70% 58% / 0.18)" />
        </linearGradient>
      </defs>

      <motion.path
        d="M192 42 C148 16 91 30 72 75 C32 84 28 147 64 167 C55 205 91 238 130 222 C151 252 202 242 212 205 C244 242 300 236 318 198 C356 190 367 132 335 106 C340 62 290 29 250 50 C235 31 210 30 192 42 Z"
        fill="url(#brain-shell)"
        stroke="hsl(var(--primary) / 0.42)"
        strokeWidth="2"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
        animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}
        style={{ transformOrigin: "195px 135px" }}
      />
      <path
        d="M196 48 C182 80 184 110 198 135 C184 164 188 192 210 216"
        fill="none"
        stroke="hsl(var(--border) / 0.48)"
        strokeWidth="1.5"
      />
      <path
        d="M92 86 C120 78 138 92 148 116 M78 151 C112 142 132 154 144 179 M248 84 C276 82 296 98 304 126 M238 154 C270 146 294 162 306 190"
        fill="none"
        stroke="hsl(var(--foreground) / 0.10)"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {neuronPaths.map((path, index) => (
        <motion.path
          key={path}
          d={path}
          fill="none"
          stroke={
            index % 3 === 0
              ? "hsl(155 70% 54% / 0.78)"
              : index % 3 === 1
                ? "hsl(205 84% 62% / 0.74)"
                : "hsl(265 72% 68% / 0.7)"
          }
          strokeWidth={1.6 + connectionStrength}
          strokeLinecap="round"
          filter="url(#brain-neuron-glow)"
          strokeDasharray="12 18"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0.35 }}
          animate={
            reduceMotion
              ? undefined
              : {
                  pathLength: 1,
                  opacity: [0.35, 0.9, 0.52],
                  strokeDashoffset: [0, -26],
                }
          }
          transition={{
            duration: 1.4 + index * 0.08,
            delay: index * 0.05,
            repeat: reduceMotion ? 0 : Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
      ))}
      {neurons.map(([cx, cy], index) => {
        const dim = index % 5 === 0 && health.orphanRate > 0.25;
        return (
          <motion.circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={dim ? 3.2 : 4.4}
            fill={
              dim
                ? `hsl(var(--muted-foreground) / ${orphanGlow})`
                : "hsl(var(--primary) / 0.92)"
            }
            filter={dim ? undefined : "url(#brain-neuron-glow)"}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
            animate={
              reduceMotion
                ? undefined
                : {
                    opacity: dim ? orphanGlow : [0.58, 1, 0.7],
                    scale: dim ? 1 : [0.9, 1.15, 0.95],
                  }
            }
            transition={{
              duration: 1.2,
              delay: index * 0.04,
              repeat: reduceMotion || dim ? 0 : Infinity,
              repeatType: "mirror",
            }}
          />
        );
      })}
    </svg>
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
          <NeuronBrainIllustration health={health} />
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
