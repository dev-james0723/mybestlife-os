"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import {
  useCareerProfile,
  useUpsertCareerProfile,
} from "@/hooks/use-career-profile";
import { computeProfileCompleteness } from "@/lib/repositories/career-profile";
import { MasterDocumentSelector } from "./MasterDocumentSelector";
import { CompletenessIndicator } from "./CompletenessIndicator";
import type { CareerHighlight } from "@/types/database";

function splitCsv(v: string, limit = 15): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function ProfileForm() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).profile;

  const q = useCareerProfile();
  const upsert = useUpsertCareerProfile();

  const [currentRole, setCurrentRole] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [years, setYears] = useState<string>("");
  const [skillsInput, setSkillsInput] = useState("");
  const [rolesInput, setRolesInput] = useState("");
  const [industriesInput, setIndustriesInput] = useState("");
  const [locationsInput, setLocationsInput] = useState("");
  const [goals, setGoals] = useState("");
  const [twelveMonth, setTwelveMonth] = useState("");
  const [dream, setDream] = useState("");
  const [pains, setPains] = useState("");
  const [blockers, setBlockers] = useState("");
  const [salaryMin, setSalaryMin] = useState<string>("");
  const [salaryMax, setSalaryMax] = useState<string>("");
  const [currency, setCurrency] = useState("USD");
  const [headshotId, setHeadshotId] = useState<string | null>(null);
  const [bioId, setBioId] = useState<string | null>(null);
  const [masterResumeId, setMasterResumeId] = useState<string | null>(null);
  const [transitionGoal, setTransitionGoal] = useState("");
  const [transitionProgress, setTransitionProgress] = useState<string>("");
  const [highlights, setHighlights] = useState<CareerHighlight[]>([]);

  // Seed once when data arrives; re-seed if the row's updated_at changes.
  const dataKey = q.data?.updated_at ?? null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (q.data && dataKey !== seededKey) {
    setSeededKey(dataKey);
    setCurrentRole(q.data.current_role ?? "");
    setCurrentCompany(q.data.current_company ?? "");
    setIndustry(q.data.industry ?? "");
    setLocation(q.data.location ?? "");
    setYears(q.data.years_experience?.toString() ?? "");
    setSkillsInput(q.data.top_skills.join(", "));
    setRolesInput(q.data.target_roles.join(", "));
    setIndustriesInput(q.data.target_industries.join(", "));
    setLocationsInput(q.data.target_locations.join(", "));
    setGoals(q.data.career_goals ?? "");
    setTwelveMonth(q.data.twelve_month_goals ?? "");
    setDream(q.data.dream_scenario ?? "");
    setPains(q.data.pain_points ?? "");
    setBlockers(q.data.blockers ?? "");
    setSalaryMin(q.data.salary_expectation_min?.toString() ?? "");
    setSalaryMax(q.data.salary_expectation_max?.toString() ?? "");
    setCurrency(q.data.salary_currency ?? "USD");
    setHeadshotId(q.data.primary_headshot_id ?? null);
    setBioId(q.data.primary_bio_id ?? null);
    setMasterResumeId(q.data.master_resume_id ?? null);
    setTransitionGoal(q.data.transition_goal ?? "");
    setTransitionProgress(q.data.transition_progress?.toString() ?? "");
    setHighlights(q.data.career_highlights ?? []);
  }

  if (q.isLoading) return <LoadingPage />;

  const completeness = computeProfileCompleteness(q.data ?? null);

  const parseOptionalInt = (s: string): number | null => {
    const trimmed = s.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  const handleSave = async () => {
    const yearsN = parseOptionalInt(years);
    const progressRaw = parseOptionalInt(transitionProgress);
    await upsert.mutateAsync({
      current_role: currentRole.trim() || null,
      current_company: currentCompany.trim() || null,
      industry: industry.trim() || null,
      location: location.trim() || null,
      years_experience:
        yearsN !== null && yearsN >= 0 && yearsN <= 80 ? yearsN : null,
      top_skills: splitCsv(skillsInput),
      target_roles: splitCsv(rolesInput),
      target_industries: splitCsv(industriesInput),
      target_locations: splitCsv(locationsInput),
      career_goals: goals.trim() || null,
      twelve_month_goals: twelveMonth.trim() || null,
      dream_scenario: dream.trim() || null,
      pain_points: pains.trim() || null,
      blockers: blockers.trim() || null,
      salary_expectation_min: parseOptionalInt(salaryMin),
      salary_expectation_max: parseOptionalInt(salaryMax),
      salary_currency: (currency.trim() || "USD").toUpperCase(),
      primary_headshot_id: headshotId,
      primary_bio_id: bioId,
      master_resume_id: masterResumeId,
      transition_goal: transitionGoal.trim() || null,
      transition_progress:
        progressRaw !== null
          ? Math.max(0, Math.min(100, progressRaw))
          : null,
      career_highlights: highlights.filter((h) => h.title.trim()),
    });
  };

  const addHighlight = () =>
    setHighlights((prev) => [...prev, { title: "", description: "", year: null }]);

  const updateHighlight = (idx: number, patch: Partial<CareerHighlight>) =>
    setHighlights((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)),
    );

  const removeHighlight = (idx: number) =>
    setHighlights((prev) => prev.filter((_, i) => i !== idx));

  return (
    <PageShell
      title={copy.pageTitle}
      description={copy.pageDescription}
      actions={
        <Button onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? copy.saving : copy.save}
        </Button>
      }
    >
      <CompletenessIndicator
        percent={completeness}
        label={copy.completeness(completeness)}
      />

      <section className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">{copy.sections.basics}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cp-role">{copy.fields.currentRole}</Label>
            <Input
              id="cp-role"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-company">{copy.fields.currentCompany}</Label>
            <Input
              id="cp-company"
              value={currentCompany}
              onChange={(e) => setCurrentCompany(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-ind">{copy.fields.industry}</Label>
            <Input
              id="cp-ind"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-loc">{copy.fields.location}</Label>
            <Input
              id="cp-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-years">{copy.fields.yearsExperience}</Label>
            <Input
              id="cp-years"
              type="number"
              inputMode="numeric"
              min={0}
              max={80}
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="cp-skills">{copy.fields.topSkills}</Label>
            <Input
              id="cp-skills"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder={copy.placeholders.csv}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">{copy.sections.narrative}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="cp-goals">{copy.fields.careerGoals}</Label>
            <Textarea
              id="cp-goals"
              rows={3}
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-12m">{copy.fields.twelveMonthGoals}</Label>
            <Textarea
              id="cp-12m"
              rows={3}
              value={twelveMonth}
              onChange={(e) => setTwelveMonth(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-dream">{copy.fields.dreamScenario}</Label>
            <Textarea
              id="cp-dream"
              rows={3}
              value={dream}
              onChange={(e) => setDream(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-pains">{copy.fields.painPoints}</Label>
            <Textarea
              id="cp-pains"
              rows={3}
              value={pains}
              onChange={(e) => setPains(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-block">{copy.fields.blockers}</Label>
            <Textarea
              id="cp-block"
              rows={3}
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {copy.fields.highlights}
            </span>
            <Button variant="outline" size="sm" onClick={addHighlight}>
              <Plus className="mr-1 h-4 w-4" />
              {copy.fields.addHighlight}
            </Button>
          </div>
          {highlights.length === 0 ? null : (
            <ul className="space-y-2">
              {highlights.map((h, idx) => (
                <li
                  key={idx}
                  className="grid gap-2 rounded-lg border bg-background/50 p-3 sm:grid-cols-[1fr_1fr_80px_auto]"
                >
                  <Input
                    value={h.title}
                    onChange={(e) =>
                      updateHighlight(idx, { title: e.target.value })
                    }
                    placeholder={copy.placeholders.highlightTitle}
                  />
                  <Input
                    value={h.description ?? ""}
                    onChange={(e) =>
                      updateHighlight(idx, { description: e.target.value })
                    }
                    placeholder={copy.placeholders.highlightDescription}
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={h.year?.toString() ?? ""}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      updateHighlight(idx, {
                        year: Number.isFinite(n) ? n : null,
                      });
                    }}
                    placeholder={copy.placeholders.highlightYear}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHighlight(idx)}
                    aria-label="Remove highlight"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">{copy.sections.targets}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="cp-targets">{copy.fields.targetRoles}</Label>
            <Input
              id="cp-targets"
              value={rolesInput}
              onChange={(e) => setRolesInput(e.target.value)}
              placeholder={copy.placeholders.csv}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-tindustries">{copy.fields.targetIndustries}</Label>
            <Input
              id="cp-tindustries"
              value={industriesInput}
              onChange={(e) => setIndustriesInput(e.target.value)}
              placeholder={copy.placeholders.csv}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-tlocs">{copy.fields.targetLocations}</Label>
            <Input
              id="cp-tlocs"
              value={locationsInput}
              onChange={(e) => setLocationsInput(e.target.value)}
              placeholder={copy.placeholders.csv}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">{copy.sections.compensation}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cp-smin">{copy.fields.salaryMin}</Label>
            <Input
              id="cp-smin"
              type="number"
              inputMode="numeric"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-smax">{copy.fields.salaryMax}</Label>
            <Input
              id="cp-smax"
              type="number"
              inputMode="numeric"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-cur">{copy.fields.currency}</Label>
            <Input
              id="cp-cur"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              maxLength={3}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">{copy.sections.linkedAssets}</h2>
        <MasterDocumentSelector
          label={copy.fields.headshot}
          selectedId={headshotId}
          onSelect={setHeadshotId}
          categoryHint="photo"
        />
        <MasterDocumentSelector
          label={copy.fields.bio}
          selectedId={bioId}
          onSelect={setBioId}
          categoryHint="bio"
        />
        <MasterDocumentSelector
          label={copy.fields.masterResume}
          selectedId={masterResumeId}
          onSelect={setMasterResumeId}
          categoryHint="resume"
        />
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">{copy.sections.transition}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="cp-tgoal">{copy.fields.transitionGoal}</Label>
            <Input
              id="cp-tgoal"
              value={transitionGoal}
              onChange={(e) => setTransitionGoal(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-tprog">{copy.fields.transitionProgress}</Label>
            <Input
              id="cp-tprog"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={transitionProgress}
              onChange={(e) => setTransitionProgress(e.target.value)}
            />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
