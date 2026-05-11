"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getAICoachCopy } from "@/lib/i18n/ai-coach-ui";
import {
  useCareerProfile,
  useUpsertCareerProfile,
} from "@/hooks/use-career-profile";

function splitCsv(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 15);
}

export function CareerProfileEditor() {
  const language = useAppStore((s) => s.language);
  const copy = getAICoachCopy(language);
  const localeSlug = useLocaleSlug();

  const q = useCareerProfile();
  const upsert = useUpsertCareerProfile();

  const [currentRole, setCurrentRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [years, setYears] = useState<string>("");
  const [skillsInput, setSkillsInput] = useState("");
  const [rolesInput, setRolesInput] = useState("");
  const [goals, setGoals] = useState("");
  const [pains, setPains] = useState("");

  // "Reset on data change" pattern: track the identity of the loaded profile
  // (updated_at is the server's source of truth). When it changes, seed the
  // form fields during render instead of in an effect.
  const dataKey = q.data?.updated_at ?? null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (q.data && dataKey !== seededKey) {
    setSeededKey(dataKey);
    setCurrentRole(q.data.current_role ?? "");
    setIndustry(q.data.industry ?? "");
    setYears(q.data.years_experience?.toString() ?? "");
    setSkillsInput(q.data.top_skills.join(", "));
    setRolesInput(q.data.target_roles.join(", "));
    setGoals(q.data.career_goals ?? "");
    setPains(q.data.pain_points ?? "");
  }

  if (q.isLoading) return <LoadingPage />;

  const coachHref = withLocalePrefix(localeSlug, "/career/coach");

  const handleSave = async () => {
    const parsedYears = years.trim() ? Number(years) : null;
    await upsert.mutateAsync({
      current_role: currentRole.trim() || null,
      industry: industry.trim() || null,
      years_experience:
        parsedYears != null && Number.isFinite(parsedYears) && parsedYears >= 0
          ? parsedYears
          : null,
      top_skills: splitCsv(skillsInput),
      target_roles: splitCsv(rolesInput),
      career_goals: goals.trim() || null,
      pain_points: pains.trim() || null,
    });
  };

  return (
    <PageShell
      title={copy.profile.title}
      description={copy.profile.description}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" render={<Link href={coachHref} />}>
            {copy.profile.cancel}
          </Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? copy.profile.saving : copy.profile.save}
          </Button>
        </div>
      }
    >
      <nav className="text-xs text-muted-foreground">
        <Link href={coachHref} className="hover:underline">
          {copy.breadcrumb.coach}
        </Link>{" "}
        / <span className="text-foreground">{copy.profile.title}</span>
      </nav>

      <div className="grid gap-5 rounded-2xl border bg-card p-6 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="cp-role">{copy.profile.fields.currentRole}</Label>
          <Input
            id="cp-role"
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            placeholder={copy.profile.placeholders.currentRole}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cp-ind">{copy.profile.fields.industry}</Label>
          <Input
            id="cp-ind"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder={copy.profile.placeholders.industry}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="cp-years">
            {copy.profile.fields.yearsExperience}
          </Label>
          <Input
            id="cp-years"
            type="number"
            inputMode="numeric"
            min={0}
            max={80}
            value={years}
            onChange={(e) => setYears(e.target.value)}
            placeholder={copy.profile.placeholders.yearsExperience}
          />
        </div>

        <div className="grid gap-1.5 sm:col-span-1">
          <Label htmlFor="cp-targets">{copy.profile.fields.targetRoles}</Label>
          <Input
            id="cp-targets"
            value={rolesInput}
            onChange={(e) => setRolesInput(e.target.value)}
            placeholder={copy.profile.placeholders.targetRoles}
          />
          <p className="text-[11px] text-muted-foreground">
            {copy.profile.hints.rolesHint}
          </p>
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="cp-skills">{copy.profile.fields.topSkills}</Label>
          <Input
            id="cp-skills"
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
            placeholder={copy.profile.placeholders.topSkills}
          />
          <p className="text-[11px] text-muted-foreground">
            {copy.profile.hints.skillsHint}
          </p>
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="cp-goals">{copy.profile.fields.careerGoals}</Label>
          <Textarea
            id="cp-goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder={copy.profile.placeholders.careerGoals}
            rows={3}
          />
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="cp-pains">{copy.profile.fields.painPoints}</Label>
          <Textarea
            id="cp-pains"
            value={pains}
            onChange={(e) => setPains(e.target.value)}
            placeholder={copy.profile.placeholders.painPoints}
            rows={3}
          />
        </div>
      </div>
    </PageShell>
  );
}
