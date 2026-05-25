"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ImageIcon, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { getCareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import {
  CAREER_BANNER_PLACEHOLDER_GRADIENTS,
  normalizeCareerBannerStyle,
} from "@/lib/career-mirror/banner/career-banner-style-config";
import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import { cn } from "@/lib/utils";
import type { CareerBannerStatus, CareerProfile } from "@/types/database";

export type CareerMirrorHeroProps = {
  profile: CareerProfile | null;
  onContinueSetup: () => void;
  onGenerateBanner: () => void;
  banner: { status: CareerBannerStatus; generating: boolean };
  className?: string;
};

/** Small inline SVG completion ring (no external deps). */
function CompletionRing({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const r = 16;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  return (
    <div className="relative grid size-12 shrink-0 place-items-center">
      <svg viewBox="0 0 40 40" className="size-12 -rotate-90">
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="3.5"
          className="stroke-white/20"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="stroke-white"
        />
      </svg>
      <span className="absolute text-[11px] font-semibold tabular-nums text-white">
        {clamped}
      </span>
    </div>
  );
}

/** Abstract constellation / rising-path placeholder motif (no text). */
function PlaceholderArt({ styleKey }: { styleKey: string }) {
  const { from, to, accent } =
    CAREER_BANNER_PLACEHOLDER_GRADIENTS[normalizeCareerBannerStyle(styleKey)];
  return (
    <svg
      aria-hidden
      className="absolute inset-0 size-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="cmh-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <radialGradient id="cmh-glow" cx="78%" cy="22%" r="60%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#cmh-bg)" />
      <rect width="1600" height="900" fill="url(#cmh-glow)" />
      <path
        d="M120 720 L420 560 L740 600 L1020 380 L1300 300 L1480 180"
        fill="none"
        stroke={accent}
        strokeOpacity="0.5"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [120, 720, 7],
        [420, 560, 7],
        [740, 600, 7],
        [1020, 380, 7],
        [1300, 300, 7],
        [1480, 180, 14],
      ].map(([cx, cy, rr], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={rr}
          fill={accent}
          fillOpacity={rr === 14 ? 0.95 : 0.6}
        />
      ))}
    </svg>
  );
}

/**
 * CareerMirrorHero — a 16:9 banner command center. Shows the generated banner
 * image when available, otherwise an elegant dark Liquid-Glass placeholder with
 * a generate CTA. Overlays identity, summary, completion ring and primary CTAs.
 */
export function CareerMirrorHero({
  profile,
  onContinueSetup,
  onGenerateBanner,
  banner,
  className,
}: CareerMirrorHeroProps) {
  const prefersReduced = useReducedMotion();
  const language = useAppStore((s) => s.language);
  const copy = getCareerMirrorUiCopy(language);

  const hasImage =
    !!profile?.career_banner_url &&
    (banner.status === "completed" || banner.status === "fallback");

  const identity =
    profile?.career_identity?.trim() ||
    profile?.current_role?.trim() ||
    copy.hero.title;
  const stageBits = [profile?.industry, profile?.career_stage]
    .map((s) => s?.trim())
    .filter(Boolean) as string[];
  const summary = profile?.ai_summary?.trim() || copy.hero.subtitle;
  const completion =
    profile?.completion_score ?? (profile ? 0 : 0);
  const primaryAction = profile?.ai_next_actions?.[0] ?? null;

  const generating = banner.generating || banner.status === "generating";
  const generateLabel = hasImage
    ? copy.banner.regenerate
    : copy.banner.generate;

  return (
    <motion.section
      initial={prefersReduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReduced ? REDUCED_MOTION_FADE : { duration: 0.5, ease: EASE_OUT_EXPO }
      }
      className={cn(
        "relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-[var(--shadow-glass)]",
        className,
      )}
    >
      <div className="relative aspect-[16/9] w-full sm:aspect-[2.4/1]">
        {/* Background */}
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile!.career_banner_url!}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <PlaceholderArt styleKey={profile?.career_banner_style ?? ""} />
        )}

        {/* Scrim for legible overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6 md:p-8">
          <div className="flex items-start justify-between gap-3">
            <CompletionRing percent={completion} />
            {!hasImage ? (
              <Button
                size="sm"
                variant="outline"
                className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
                disabled={generating}
                onClick={onGenerateBanner}
              >
                {generating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="size-3.5" />
                )}
                {copy.banner.generate}
              </Button>
            ) : null}
          </div>

          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-white drop-shadow sm:text-2xl md:text-3xl">
              {identity}
            </h1>
            {stageBits.length > 0 ? (
              <p className="text-xs font-medium text-white/80 sm:text-sm">
                {stageBits.join(" · ")}
              </p>
            ) : null}
            <p className="max-w-2xl text-xs leading-relaxed text-white/85 line-clamp-2 sm:text-sm">
              {summary}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {primaryAction ? (
                <Button
                  size="sm"
                  variant="gradient-pink"
                  onClick={onContinueSetup}
                  className="max-w-full"
                >
                  <Sparkles className="size-3.5" />
                  <span className="truncate">{primaryAction.title}</span>
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
                onClick={onContinueSetup}
              >
                {profile?.setup_status === "completed"
                  ? copy.completion.keepGoing
                  : copy.hero.resumeCta}
                <ArrowRight className="size-3.5" />
              </Button>
              {hasImage ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/15 hover:text-white"
                  disabled={generating}
                  onClick={onGenerateBanner}
                >
                  {generating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ImageIcon className="size-3.5" />
                  )}
                  {generateLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
