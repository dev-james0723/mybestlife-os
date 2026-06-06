"use client";

import Link from "next/link";
import {
  BarChart3,
  Briefcase,
  Compass,
  FolderOpen,
  History,
  Network,
  NotebookPen,
  Sparkles,
  User,
} from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { TransitionProgressWidget } from "@/components/career-dashboard/TransitionProgress";
import { NextActionWidget } from "@/components/career-dashboard/NextAction";
import { StatsOverviewWidget } from "@/components/career-dashboard/StatsOverview";
import { UpcomingWeekWidget } from "@/components/career-dashboard/UpcomingWeek";
import { HotPipelineWidget } from "@/components/career-dashboard/HotPipeline";
import { ColdRelationshipsWidget } from "@/components/career-dashboard/ColdRelationships";
import { SkillsGapWidget } from "@/components/career-dashboard/SkillsGap";
import { AISuggestionsWidget } from "@/components/career-dashboard/AISuggestions";
import { OmnisearchTrigger } from "@/components/career/Omnisearch";
import { OSFrostedPanel, OSMotionPanel } from "@/components/ui/os-primitives";

/**
 * Career Command Center — replaces the former link-grid landing. Widgets
 * are stacked mobile-first (single column) and expand into a responsive
 * grid on larger viewports.
 */
export default function CareerCommandCenterPage() {
  const language = useAppStore((s) => s.language);
  const localeSlug = useLocaleSlug();
  const copy = getCareerPhase5Copy(language).dashboard;
  const routeCards = [
    {
      title: copy.submenu.compass,
      description: "Clarify direction, blockers, and the next strategic move.",
      href: "/career/compass",
      icon: Compass,
    },
    {
      title: copy.submenu.profile,
      description: "Keep the source profile that powers coaching and prompts.",
      href: "/career/profile",
      icon: User,
    },
    {
      title: copy.submenu.vault,
      description: "Store resumes, portfolios, references, and reusable assets.",
      href: "/career/vault",
      icon: FolderOpen,
    },
    {
      title: copy.submenu.coach,
      description: "Run prompt workflows for resumes, interviews, and growth.",
      href: "/career/coach",
      icon: Sparkles,
    },
    {
      title: copy.submenu.pipeline,
      description: "Move opportunities from research to offer with follow-ups.",
      href: "/career/pipeline",
      icon: Briefcase,
    },
    {
      title: copy.submenu.timeline,
      description: "Review the dated thread of milestones, files, and roles.",
      href: "/career/timeline",
      icon: History,
    },
    {
      title: copy.submenu.network,
      description: "Map people, organizations, projects, and relationship warmth.",
      href: "/career/network",
      icon: Network,
    },
    {
      title: copy.submenu.journal,
      description: "Capture big career calls and review your judgment later.",
      href: "/career/journal",
      icon: NotebookPen,
    },
    {
      title: copy.submenu.analytics,
      description: "Explain pipeline, resume, vault, and quarterly signals.",
      href: "/career/analytics",
      icon: BarChart3,
    },
  ];

  return (
    <PageShell
      title={copy.pageTitle}
      description={copy.pageDescription}
      actions={<OmnisearchTrigger />}
    >
      <div className="space-y-6">
        <OSMotionPanel className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <TransitionProgressWidget />
            <div className="grid gap-4 sm:grid-cols-2">
              <NextActionWidget />
              <UpcomingWeekWidget />
            </div>
            <StatsOverviewWidget />
          </div>

          <div className="space-y-4">
            <AISuggestionsWidget />
            <OSFrostedPanel as="section" className="p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.sections.intelligence}
              </h2>
              <div className="mt-3 space-y-2">
                <HotPipelineWidget />
                <ColdRelationshipsWidget />
                <SkillsGapWidget />
              </div>
            </OSFrostedPanel>
          </div>
        </OSMotionPanel>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Career OS map</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
              Each workspace has a job: clarify direction, store evidence, move
              opportunities, maintain relationships, and learn from decisions.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {routeCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={withLocalePrefix(localeSlug, card.href)}
                  className="group rounded-xl border border-white/55 bg-white/64 p-4 shadow-sm shadow-slate-900/5 transition hover:border-lime-300/70 hover:bg-white/78 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/50 bg-white/70 text-lime-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-lime-200">
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
