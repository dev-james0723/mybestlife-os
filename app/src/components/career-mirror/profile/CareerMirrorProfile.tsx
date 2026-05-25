"use client";

import * as React from "react";
import {
  ChevronDown,
  Compass,
  Loader2,
  Map as MapIcon,
  Sparkles,
  Stethoscope,
  UserCog,
} from "lucide-react";

import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ProfileForm } from "@/components/career-profile/ProfileForm";
import { CareerMirrorWizard } from "@/components/career-mirror/wizard";
import { AssetGapAuditPanel } from "./AssetGapAuditPanel";
import { BannerStylePicker } from "./BannerStylePicker";
import { CareerIdentityMap } from "./CareerIdentityMap";
import { PromptPackPanel } from "./PromptPackPanel";
import { RealityCheckButton } from "./RealityCheckButton";
import { ScenarioSimulator } from "./ScenarioSimulator";
import { WeeklyReviewPanel } from "./WeeklyReviewPanel";
import { CareerMirrorHero } from "./CareerMirrorHero";
import { CompletionWidget } from "./CompletionWidget";
import { AiSuggestionControl } from "./AiSuggestionControl";

import { useCareerMirror } from "@/hooks/use-career-mirror";
import { useUpsertCareerProfile } from "@/hooks/use-career-profile";
import { useAppStore } from "@/stores/app-store";
import { getCareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import {
  CAREER_BANNER_STYLES,
  CAREER_BANNER_STYLE_DEFAULT_LABELS,
  normalizeCareerBannerStyle,
  type CareerBannerStyle,
} from "@/lib/career-mirror/banner/career-banner-style-config";
import { cn } from "@/lib/utils";
import type { CareerAiDiagnosis } from "@/types/database";

const bannerLabels: Record<
  CareerBannerStyle,
  { name: string; description?: string }
> = CAREER_BANNER_STYLES.reduce(
  (acc, style) => {
    acc[style] = { name: CAREER_BANNER_STYLE_DEFAULT_LABELS[style] };
    return acc;
  },
  {} as Record<CareerBannerStyle, { name: string; description?: string }>,
);

type SectionProps = {
  icon: React.ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

/** A collapsible Liquid-Glass section panel with a consistent header. */
function Section({ icon, title, defaultOpen = false, children }: SectionProps) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <GlassPanel className="overflow-hidden">
        <CollapsibleTrigger className="group/sec flex w-full items-center gap-3 p-5 text-left">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
          >
            {icon}
          </span>
          <h2 className="flex-1 font-heading text-base font-semibold">
            {title}
          </h2>
          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-aria-expanded/sec:rotate-180 motion-reduce:transition-none" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5">{children}</div>
        </CollapsibleContent>
      </GlassPanel>
    </Collapsible>
  );
}

const DIAGNOSIS_KEYS = [
  "clarity",
  "momentum",
  "positioning",
  "network",
  "skill_fit",
  "risk",
] as const;

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{pct}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * CareerMirrorProfile — the Liquid Glass command center that replaces the bare
 * profile form. Composes hero + completion + AI diagnosis + work style +
 * recommended actions + visual + identity map + advanced panels, and keeps the
 * full manual ProfileForm available in a collapsible section.
 */
export function CareerMirrorProfile() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerMirrorUiCopy(language);

  const mirror = useCareerMirror();
  const profile = mirror.profile;
  const upsert = useUpsertCareerProfile();

  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [bannerStyle, setBannerStyle] = React.useState<CareerBannerStyle>(
    normalizeCareerBannerStyle(profile?.career_banner_style ?? null),
  );
  const [bannerError, setBannerError] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);

  // Seed the picker from the persisted style once it loads / changes (mirrors
  // ProfileForm's seededKey pattern — no refs accessed during render).
  const [seededStyleKey, setSeededStyleKey] = React.useState<string | null>(
    null,
  );
  if (
    profile?.career_banner_style &&
    seededStyleKey !== profile.career_banner_style
  ) {
    setSeededStyleKey(profile.career_banner_style);
    setBannerStyle(normalizeCareerBannerStyle(profile.career_banner_style));
  }

  const openWizard = React.useCallback(() => setWizardOpen(true), []);

  const handleGenerateBanner = React.useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    setBannerError(null);
    const result = await mirror.generateBanner(bannerStyle);
    if (!result.ok) setBannerError(copy.states.error);
    setGenerating(false);
  }, [bannerStyle, copy.states.error, generating, mirror]);

  if (mirror.isLoading) return <LoadingPage />;

  const diagnosis: CareerAiDiagnosis | null = profile?.ai_diagnosis ?? null;
  const workStyle = profile?.work_style_profile ?? null;
  const nextActions = profile?.ai_next_actions ?? [];
  const needsSetup =
    profile == null || profile.setup_status !== "completed";

  const bannerStatus = profile?.career_banner_status ?? "none";

  return (
    <PageShell title={copy.hero.title} description={copy.hero.subtitle}>
      <div className="space-y-5 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))]">
        {/* (a) Hero */}
        <CareerMirrorHero
          profile={profile}
          onContinueSetup={openWizard}
          onGenerateBanner={handleGenerateBanner}
          banner={{ status: bannerStatus, generating }}
        />

        {/* (b) Non-blocking first-run prompt */}
        {needsSetup ? (
          <GlassPanel className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]"
              >
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="font-medium text-foreground">
                  {copy.hero.title}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {copy.hero.subtitle}
                </p>
              </div>
            </div>
            <Button variant="gradient-pink" onClick={openWizard}>
              {profile?.setup_status === "in_progress"
                ? copy.hero.resumeCta
                : copy.hero.startCta}
            </Button>
          </GlassPanel>
        ) : null}

        {/* (c) Completion widget */}
        <CompletionWidget
          profile={profile}
          onContinueSetup={openWizard}
          onGenerateWithAi={openWizard}
        />

        {/* (d) AI Diagnosis */}
        <Section
          icon={<Stethoscope className="size-5" />}
          title={copy.profileSections.aiDiagnosis}
          defaultOpen={!!diagnosis}
        >
          {diagnosis ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {DIAGNOSIS_KEYS.map((key) => (
                  <ScoreBar
                    key={key}
                    label={key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                    value={diagnosis.scores?.[key] ?? 0}
                  />
                ))}
              </div>
              {diagnosis.narrative ? (
                <p className="text-sm leading-relaxed text-foreground/90">
                  {diagnosis.narrative}
                </p>
              ) : null}
              {(diagnosis.main_tension || diagnosis.main_risk) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {diagnosis.main_tension ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {copy.profileSections.mainTension}
                      </p>
                      <p className="mt-1 text-sm leading-snug">
                        {diagnosis.main_tension}
                      </p>
                    </div>
                  ) : null}
                  {diagnosis.main_risk ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {copy.profileSections.mainRisk}
                      </p>
                      <p className="mt-1 text-sm leading-snug">
                        {diagnosis.main_risk}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
              {profile?.ai_reframed_problem ? (
                <AiSuggestionControl
                  multiline
                  label={copy.profileSections.reframedProblem}
                  suggestion={profile.ai_reframed_problem}
                  currentValue={profile.pain_points ?? undefined}
                  onAccept={(value) => {
                    void upsert.mutateAsync({ pain_points: value });
                  }}
                />
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {copy.states.emptyDescription}
            </p>
          )}
        </Section>

        {/* (e) Work Style */}
        <Section
          icon={<UserCog className="size-5" />}
          title={copy.profileSections.workStyle}
        >
          {workStyle || profile?.self_reported_personality_type ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              {profile?.self_reported_personality_type ? (
                <WorkStyleItem
                  label={copy.profileSections.personalityType}
                  value={profile.self_reported_personality_type}
                />
              ) : null}
              <WorkStyleItem
                label={copy.profileSections.energyPattern}
                value={workStyle?.energy_pattern ?? profile?.work_energy_pattern}
              />
              <WorkStyleItem
                label={copy.profileSections.decisionStyle}
                value={workStyle?.decision_style ?? profile?.decision_style}
              />
              <WorkStyleItem
                label={copy.profileSections.feedbackPreference}
                value={
                  workStyle?.feedback_preference ?? profile?.feedback_preference
                }
              />
              <WorkStyleItem
                label={copy.profileSections.idealEnvironment}
                value={
                  workStyle?.ideal_environment ?? profile?.ideal_work_environment
                }
              />
              <WorkStyleItem
                label={copy.profileSections.motivationDrivers}
                value={(
                  workStyle?.motivation_drivers ??
                  profile?.motivation_drivers ??
                  []
                ).join(", ")}
              />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              {copy.states.emptyDescription}
            </p>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            {copy.trust.mbtiDisclaimer}
          </p>
        </Section>

        {/* (f) Recommended Next Actions */}
        <Section
          icon={<Compass className="size-5" />}
          title={copy.profileSections.nextActions}
          defaultOpen={nextActions.length > 0}
        >
          {nextActions.length > 0 ? (
            <ul className="space-y-2.5">
              {nextActions.map((action, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border bg-muted/30 p-3"
                >
                  <p className="text-sm font-medium leading-snug text-foreground">
                    {action.title}
                  </p>
                  {action.why ? (
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">
                      {action.why}
                    </p>
                  ) : null}
                  {(action.effort || action.horizon) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {action.effort ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {action.effort}
                        </span>
                      ) : null}
                      {action.horizon ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {action.horizon}
                        </span>
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {copy.states.emptyDescription}
            </p>
          )}
        </Section>

        {/* (g) Career Visual */}
        <Section
          icon={<Sparkles className="size-5" />}
          title={copy.banner.pickerTitle}
        >
          <p className="text-xs text-muted-foreground">
            {copy.banner.pickerSubtitle}
          </p>
          <div className="mt-3">
            <BannerStylePicker
              value={bannerStyle}
              onChange={setBannerStyle}
              labels={bannerLabels}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="gradient-pink"
              disabled={generating}
              onClick={handleGenerateBanner}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {generating
                ? copy.banner.generating
                : profile?.career_banner_url
                  ? copy.banner.regenerate
                  : copy.banner.generate}
            </Button>
          </div>
          {bannerError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {bannerError}
            </p>
          ) : null}
        </Section>

        {/* (h) Career Identity Map */}
        {profile ? (
          <Section
            icon={<MapIcon className="size-5" />}
            title={copy.panels.careerIdentityMap}
          >
            <CareerIdentityMap profile={profile} />
          </Section>
        ) : null}

        {/* (i) Advanced panels — each is its own Liquid-Glass surface */}
        <GlassPanel className="flex flex-wrap items-center gap-3 p-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]"
            >
              <Stethoscope className="size-5" />
            </span>
            <div>
              <h2 className="font-heading text-base font-semibold leading-tight">
                {copy.panels.realityCheck}
              </h2>
            </div>
          </div>
          <div className="ml-auto">
            <RealityCheckButton profile={profile} />
          </div>
        </GlassPanel>
        <ScenarioSimulator profile={profile} />
        <WeeklyReviewPanel profile={profile} />
        <AssetGapAuditPanel profile={profile} />
        <PromptPackPanel profile={profile} />

        {/* (j) Manual details — full existing form */}
        <Section
          icon={<UserCog className="size-5" />}
          title={copy.profileSections.manualDetails}
        >
          <ProfileForm />
        </Section>
      </div>

      <CareerMirrorWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCompleted={() => setWizardOpen(false)}
      />
    </PageShell>
  );
}

function WorkStyleItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value || !value.trim()) return null;
  return (
    <div className={cn("rounded-lg border border-border bg-muted/30 p-3")}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-snug text-foreground">{value}</dd>
    </div>
  );
}
