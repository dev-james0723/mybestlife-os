"use client";

import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { TransitionProgressWidget } from "@/components/career-dashboard/TransitionProgress";
import { CareerIdentityMap } from "@/components/career-mirror/profile/CareerIdentityMap";
import { useCareerProfile } from "@/hooks/use-career-profile";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";

export function CareerCompassView() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).dashboard;
  const profileQ = useCareerProfile();

  if (profileQ.isLoading) {
    return <LoadingPage />;
  }

  const profile = profileQ.data;

  return (
    <PageShell title={copy.submenu.compass} description={copy.pageDescription}>
      <div className="space-y-4">
        <TransitionProgressWidget />
        {profile ? <CareerIdentityMap profile={profile} /> : null}
      </div>
    </PageShell>
  );
}
