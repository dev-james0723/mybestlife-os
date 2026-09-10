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
  const [dirty, setDirty] = useState(false);

  // "Reset on data change" pattern: track the identity of the loaded profile
  // (updated_at is the server's source of truth). When it changes, seed the
  // form fields during render instead of in an effect.
  const dataKey = q.data?.updated_at ?? null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (q.data && dataKey !== seededKey && !dirty) {
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
  const chinese = language.startsWith("zh");
  const validYears = !years.trim() || (Number.isFinite(Number(years)) && Number(years) >= 0 && Number(years) <= 80);
  const remoteChanged = dirty && dataKey !== seededKey;

  const handleSave = async () => {
    if (!validYears || remoteChanged || upsert.isPending) return;
    const parsedYears = years.trim() ? Number(years) : null;
    try {
    const saved = await upsert.mutateAsync({
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
    setSeededKey(saved.updated_at);
    setDirty(false);
    } catch { /* Keep the draft; the mutation displays a retryable error. */ }
  };

  return (
    <PageShell
      title={copy.profile.title}
      description={language.startsWith("zh") ? "供 Career Coach 提問選用的背景。每次提問可選擇加入哪些欄位，並在傳送前預覽。" : "Optional context for Career Coach prompts. Choose which fields to include each time and preview before sending."}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" render={<Link href={coachHref} />}>
            {copy.profile.cancel}
          </Button>
          <Button onClick={handleSave} disabled={upsert.isPending || !validYears || remoteChanged || q.isError}>
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

      <p className="text-sm text-muted-foreground">{chinese ? "此頁與 Career Mirror 使用同一份職涯背景，儲存後兩處都會更新。" : "This page and Career Mirror use the same career background. Saving updates both."} <Link className="underline" href={withLocalePrefix(localeSlug, "/career/profile")}>{chinese ? "查看 Career Mirror" : "View Career Mirror"}</Link></p>
      {q.isError && <div role="alert"><p>{chinese ? "未能載入個人資料，請重試。" : "Could not load your profile. Please retry."}</p><Button onClick={() => void q.refetch()}>{chinese ? "重試" : "Retry"}</Button></div>}
      {remoteChanged && <div role="alert" className="space-y-2 rounded-xl border p-4"><p>{chinese ? "另一處更新了個人資料。你的草稿仍保留；請比較最新資料再儲存。" : "Your profile changed elsewhere. Your draft is preserved; compare the latest version before saving."}</p><details><summary>{chinese ? "查看已儲存的內容" : "View the saved version"}</summary><p className="whitespace-pre-wrap">{[q.data?.current_role, q.data?.industry, q.data?.years_experience?.toString(), q.data?.top_skills.join(", "), q.data?.target_roles.join(", "), q.data?.career_goals, q.data?.pain_points].filter(Boolean).join("\n")}</p></details><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setDirty(false)}>{chinese ? "使用已儲存內容" : "Use saved version"}</Button><Button variant="outline" onClick={() => setSeededKey(dataKey)}>{chinese ? "保留我的草稿" : "Keep my draft"}</Button></div></div>}
      <p role="status" className="text-xs text-muted-foreground">{dirty ? (chinese ? "尚未儲存" : "Unsaved changes") : q.data?.updated_at ? `${chinese ? "上次儲存" : "Last saved"}: ${new Date(q.data.updated_at).toLocaleString()}` : ""}</p>
      {!validYears && <p role="alert">{chinese ? "年資須介乎 0 至 80 年。" : "Years of experience must be between 0 and 80."}</p>}
      <div onChange={() => setDirty(true)} className="grid gap-5 rounded-2xl border bg-card p-6 sm:grid-cols-2">
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
