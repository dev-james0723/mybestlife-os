"use client";

import Link from "next/link";
import { Ban, Compass, MoveRight, Target, UserCheck } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { OSPrimaryAction } from "@/components/ui/os-primitives";
import {
  CareerHelpPanel,
  CareerMetricCard,
  CareerMetricGrid,
  CareerSectionPanel,
} from "@/components/career/career-page-ui";
import { TransitionProgressWidget } from "@/components/career-dashboard/TransitionProgress";
import { CareerIdentityMap } from "@/components/career-mirror/profile/CareerIdentityMap";
import { useCareerProfile } from "@/hooks/use-career-profile";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";

export function CareerCompassView() {
  const localeSlug = useLocaleSlug();
  const profileQ = useCareerProfile();

  if (profileQ.isLoading) {
    return <LoadingPage />;
  }

  const profile = profileQ.data;
  const profileHref = withLocalePrefix(localeSlug, "/career/profile");
  const profileIsThin =
    !profile ||
    (!profile.current_role &&
      !profile.industry &&
      profile.top_skills.length === 0 &&
      !profile.career_goals);
  const topHypothesis =
    profile?.target_roles[0] ??
    profile?.transition_goal ??
    profile?.career_goals ??
    "No career hypothesis yet";
  const blockers =
    profile?.blockers ??
    profile?.pain_points ??
    "No blockers captured yet";
  const nextAction =
    profile?.ai_next_actions[0]?.title ??
    (profileIsThin ? "Complete your Career Profile" : "Choose one next move for this week");
  const direction =
    profile?.current_status_summary ??
    profile?.career_identity ??
    profile?.current_role ??
    "Direction will sharpen as your profile fills in.";
  const completion = profile?.completion_score ?? 0;

  return (
    <PageShell
      title="Career Compass"
      description="Clarify where you are going, why it matters, and what direction is strongest right now."
      actions={
        profileIsThin ? (
          <OSPrimaryAction render={<Link href={profileHref} />} className="gap-2">
            <UserCheck className="size-4" aria-hidden />
            Complete Profile
          </OSPrimaryAction>
        ) : null
      }
    >
      <div className="space-y-5">
        <CareerHelpPanel icon={Compass} title="Direction before activity">
          Use this page to separate motion from direction: the goal, the strongest
          hypothesis, the blockers, and the next action worth taking now.
        </CareerHelpPanel>

        <CareerMetricGrid className="xl:grid-cols-3">
          <CareerMetricCard
            icon={Target}
            label="Top hypothesis"
            value={<span className="text-base leading-6">{topHypothesis}</span>}
            description="The role, direction, or thesis currently guiding the search."
          />
          <CareerMetricCard
            icon={Ban}
            label="Current blockers"
            value={<span className="text-base leading-6">{blockers}</span>}
            description="Constraints to resolve before the next serious move."
          />
          <CareerMetricCard
            icon={MoveRight}
            label="Next action"
            value={<span className="text-base leading-6">{nextAction}</span>}
            description="A profile-derived recommendation or the next honest setup step."
          />
        </CareerMetricGrid>

        <CareerSectionPanel
          title="Current direction signal"
          description="This is drawn from your Career Profile. No synthetic data is added here."
        >
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <p className="text-sm leading-6 text-muted-foreground">{direction}</p>
            <div className="rounded-xl border border-white/50 bg-white/68 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
              <span className="font-semibold tabular-nums">{completion}%</span>{" "}
              profile clarity
            </div>
          </div>
        </CareerSectionPanel>

        <TransitionProgressWidget />
        {profile ? <CareerIdentityMap profile={profile} /> : null}
      </div>
    </PageShell>
  );
}
