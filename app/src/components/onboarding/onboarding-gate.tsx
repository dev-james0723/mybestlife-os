"use client";

import { useProfile } from "@/hooks/use-settings";
import { shouldBypassOnboarding } from "@/lib/onboarding/legacy-onboarding-bypass";
import { OnboardingWizard } from "./onboarding-wizard";

export function OnboardingGate() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading || !profile) return null;
  if (profile.onboarding_completed) return null;
  if (shouldBypassOnboarding(profile.email)) return null;

  return <OnboardingWizard />;
}
