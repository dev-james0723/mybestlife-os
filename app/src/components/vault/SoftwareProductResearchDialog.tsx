"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Search,
  Save,
  Sparkles,
  GitBranch,
  Image as ImageIcon,
  CheckCircle2,
  Copy,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ProductResearchCategory,
  ProductResearchRequest,
  ProductResearchResponse,
  ShouldAddFieldsToSave,
} from "@/lib/vault/intelligence-schemas";

const CATEGORY_OPTIONS: Array<{ value: ProductResearchCategory; label: string }> = [
  { value: "app", label: "App" },
  { value: "web_app", label: "Web App" },
  { value: "software", label: "Software" },
  { value: "saas", label: "SaaS" },
  { value: "github_project", label: "GitHub Project" },
  { value: "open_source_tool", label: "Open-source Tool" },
  { value: "browser_extension", label: "Browser Extension" },
  { value: "other", label: "Other" },
];

type Settings = NonNullable<ProductResearchRequest["settings"]>;

const DEFAULT_SETTINGS: Required<Omit<Settings, "includeTechnicalGithubAnalysis">> & {
  includeTechnicalGithubAnalysis: true | false | "only_if_github_repo_available";
} = {
  generateAnalysisReport: true,
  generateManualIllustration: false,
  fetchIconLogo: true,
  includeSimilarProducts: true,
  includeTechnicalGithubAnalysis: "only_if_github_repo_available",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProductName?: string;
  initialTargetUrl?: string | null;
  existingVaultEntryId?: string | null;
  onApplied?: () => void;
};

function fieldsFromResearch(report: ProductResearchResponse): ShouldAddFieldsToSave {
  const features = report.analysisReport?.coreFeatures ?? [];
  const firstFeature = features[0];
  const firstWeakness = report.analysisReport?.weaknessesOrLimitations?.[0];
  return {
    app_name: report.productName,
    website_url: report.officialLinks.officialWebsite ?? report.officialLinks.githubRepo ?? undefined,
    icon_url: report.iconLogo?.imageUrl,
    summary: report.oneSentenceSummary ?? report.analysisReport?.productOverview?.slice(0, 280),
    category: "Software",
    platforms: report.officialLinks.githubRepo ? "GitHub, Web" : "Web",
    use_cases: report.analysisReport?.mainUseCases?.join(", "),
    status: "Testing",
    priority: "Nice-to-have",
    cost_type: "Freemium",
    cost_period: "unknown",
    why_i_use_it: report.analysisReport?.finalVerdict,
    best_feature: firstFeature
      ? `${firstFeature.title}: ${firstFeature.description}`.slice(0, 400)
      : report.analysisReport?.strengths?.[0],
    biggest_downside: firstWeakness ?? report.warnings[0],
    best_alternative: report.similarProducts?.[0]?.name,
    replaces: report.analysisReport?.userWorkflow?.[0],
    default_tool_for: report.analysisReport?.mainUseCases?.[0],
    tags: [
      report.officialLinks.githubRepo ? "github" : null,
      report.activeSettings.includeSimilarProducts ? "researched" : null,
      "software-vault",
    ]
      .filter(Boolean)
      .join(", "),
  };
}

export function SoftwareProductResearchDialog({
  open,
  onOpenChange,
  initialProductName,
  initialTargetUrl,
  existingVaultEntryId,
  onApplied,
}: Props) {
  const queryClient = useQueryClient();
  const [productName, setProductName] = useState(initialProductName ?? "");
  const [targetUrl, setTargetUrl] = useState(initialTargetUrl ?? "");
  const [category, setCategory] = useState<ProductResearchCategory>("software");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [result, setResult] = useState<ProductResearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);

  const request = useMemo<ProductResearchRequest>(
    () => ({
      productName: productName.trim(),
      targetUrl: targetUrl.trim() || null,
      category,
      settings,
      existingVaultEntryId: existingVaultEntryId ?? null,
    }),
    [productName, targetUrl, category, settings, existingVaultEntryId],
  );

  const runResearch = async () => {
    if (!productName.trim()) return;
    setLoading(true);
    setSavedReportId(null);
    try {
      const res = await fetch("/api/vault/product-research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      if (res.status === 429) {
        toast.error("Vault research limit reached. Try again later.");
        return;
      }
      if (!res.ok) {
        toast.error("Product research failed.");
        return;
      }
      setResult((await res.json()) as ProductResearchResponse);
    } catch {
      toast.error("Product research failed.");
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async (): Promise<string | null> => {
    if (!result) return null;
    setSaving(true);
    try {
      const res = await fetch("/api/vault/product-research/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          report: result,
          request,
          existingVaultEntryId: existingVaultEntryId ?? null,
        }),
      });
      if (!res.ok) {
        toast.error("Could not save research report.");
        return null;
      }
      const data = (await res.json()) as { id: string };
      setSavedReportId(data.id);
      toast.success("Research report saved.");
      return data.id;
    } catch {
      toast.error("Could not save research report.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const applyToVault = async (mode: "create" | "update") => {
    if (!result) return;
    const reportId = savedReportId ?? (await saveReport());
    setSaving(true);
    try {
      const res = await fetch("/api/vault/product-research/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportId,
          existingVaultEntryId: mode === "update" ? existingVaultEntryId : null,
          createNewEntry: mode === "create",
          fields: fieldsFromResearch(result),
          setIconAsPrimary: Boolean(result.iconLogo),
        }),
      });
      if (!res.ok) {
        toast.error("Could not apply confirmed research fields.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["software-vault"] });
      toast.success(mode === "create" ? "Vault entry created from research." : "Vault entry updated from research.");
      onApplied?.();
      onOpenChange(false);
    } catch {
      toast.error("Could not apply confirmed research fields.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="4xl" className="max-h-[calc(100dvh-2rem)] overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle>Product Research Agent</DialogTitle>
        </DialogHeader>
        <div className="grid min-h-0 gap-0 md:grid-cols-[320px_minmax(0,1fr)]">
          <ScrollArea className="max-h-[78vh] border-r border-border/60">
            <div className="space-y-5 p-5">
              <SoftwareProductResearchInputStep
                productName={productName}
                targetUrl={targetUrl}
                category={category}
                onProductName={setProductName}
                onTargetUrl={setTargetUrl}
                onCategory={setCategory}
              />
              <SoftwareProductResearchSettings settings={settings} onChange={setSettings} />
              <Button onClick={() => void runResearch()} disabled={loading || !productName.trim()} className="w-full">
                {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Search className="mr-2 size-4" />}
                {loading ? "Researching..." : result ? "Refresh Product Research" : "Research Product"}
              </Button>
            </div>
          </ScrollArea>
          <ScrollArea className="max-h-[78vh]">
            <div className="space-y-5 p-5">
              {loading ? <SoftwareProductResearchProgress /> : null}
              {!loading && !result ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Enter a product name or URL, choose settings, then run research.
                </div>
              ) : null}
              {result ? (
                <>
                  <SoftwareProductResearchResult result={result} />
                  <SoftwareProductResearchSaveActions
                    result={result}
                    existingVaultEntryId={existingVaultEntryId}
                    saving={saving}
                    onSave={() => void saveReport()}
                    onCreate={() => void applyToVault("create")}
                    onUpdate={() => void applyToVault("update")}
                  />
                </>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SoftwareProductResearchInputStep({
  productName,
  targetUrl,
  category,
  onProductName,
  onTargetUrl,
  onCategory,
}: {
  productName: string;
  targetUrl: string;
  category: ProductResearchCategory;
  onProductName: (value: string) => void;
  onTargetUrl: (value: string) => void;
  onCategory: (value: ProductResearchCategory) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Product name</Label>
        <Input value={productName} onChange={(e) => onProductName(e.target.value)} placeholder="Cursor, Raycast, Tana..." />
      </div>
      <div className="space-y-2">
        <Label>Official website / GitHub / store link</Label>
        <Input value={targetUrl} onChange={(e) => onTargetUrl(e.target.value)} placeholder="https://" />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onCategory(option.value)}
              className={`rounded-md border px-2.5 py-2 text-left text-xs transition ${
                category === option.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SoftwareProductResearchSettings({
  settings,
  onChange,
}: {
  settings: typeof DEFAULT_SETTINGS;
  onChange: (settings: typeof DEFAULT_SETTINGS) => void;
}) {
  const toggle = (key: keyof typeof DEFAULT_SETTINGS, value: boolean) => {
    onChange({ ...settings, [key]: value });
  };
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Research settings</p>
      <SettingRow
        label="Generate Analysis Report"
        checked={settings.generateAnalysisReport}
        onCheckedChange={(v) => toggle("generateAnalysisReport", v)}
      />
      <SettingRow
        label="Generate Manual Illustration / Feature Prompt"
        checked={settings.generateManualIllustration}
        onCheckedChange={(v) => toggle("generateManualIllustration", v)}
      />
      <SettingRow
        label="Fetch Icon / Logo"
        checked={settings.fetchIconLogo}
        onCheckedChange={(v) => toggle("fetchIconLogo", v)}
      />
      <SettingRow
        label="Include Similar Products"
        checked={settings.includeSimilarProducts}
        onCheckedChange={(v) => toggle("includeSimilarProducts", v)}
      />
      <SettingRow
        label="Include Technical GitHub Analysis"
        checked={settings.includeTechnicalGithubAnalysis !== false}
        onCheckedChange={(v) =>
          onChange({
            ...settings,
            includeTechnicalGithubAnalysis: v ? "only_if_github_repo_available" : false,
          })
        }
      />
    </div>
  );
}

function SettingRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-xs">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <span>{label}</span>
    </label>
  );
}

export function SoftwareProductResearchProgress() {
  return (
    <Card className="border-border/60 bg-card/50">
      <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking product identity, official sources, icon candidates, alternatives, and GitHub metadata...
      </CardContent>
    </Card>
  );
}

export function SoftwareProductResearchResult({ result }: { result: ProductResearchResponse }) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">{result.productName}</CardTitle>
            <Badge variant="secondary">Generated {new Date(result.generatedAt).toLocaleString()}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ActiveSettings result={result} />
          {result.oneSentenceSummary ? <p className="text-sm leading-relaxed">{result.oneSentenceSummary}</p> : null}
          <OfficialLinks result={result} />
        </CardContent>
      </Card>

      <SoftwareProductResearchIconPanel result={result} />
      {result.analysisReport ? <AnalysisReport result={result} /> : null}
      {result.technicalGithubAnalysis ? <SoftwareProductResearchGithubPanel result={result} /> : null}
      {result.similarProducts ? <SoftwareProductResearchAlternativesPanel result={result} /> : null}
      {result.manualIllustrationPrompt ? <SoftwareProductResearchIllustrationPanel result={result} /> : null}
      <SoftwareProductResearchSources result={result} />
    </div>
  );
}

function ActiveSettings({ result }: { result: ProductResearchResponse }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <Badge variant={result.activeSettings.generateAnalysisReport ? "default" : "outline"}>Analysis {result.activeSettings.generateAnalysisReport ? "on" : "off"}</Badge>
      <Badge variant={result.activeSettings.fetchIconLogo ? "default" : "outline"}>Logo {result.activeSettings.fetchIconLogo ? "on" : "off"}</Badge>
      <Badge variant={result.activeSettings.includeSimilarProducts ? "default" : "outline"}>Alternatives {result.activeSettings.includeSimilarProducts ? "on" : "off"}</Badge>
      <Badge variant={result.activeSettings.generateManualIllustration ? "default" : "outline"}>Illustration {result.activeSettings.generateManualIllustration ? "on" : "off"}</Badge>
      <Badge variant={result.activeSettings.includeTechnicalGithubAnalysis === true ? "default" : "outline"}>
        GitHub {result.activeSettings.includeTechnicalGithubAnalysis === true ? "on" : "skipped"}
      </Badge>
    </div>
  );
}

function OfficialLinks({ result }: { result: ProductResearchResponse }) {
  const links = Object.entries(result.officialLinks).filter(([, value]) => Boolean(value));
  if (links.length === 0) return null;
  return (
    <div className="grid gap-2 text-xs sm:grid-cols-2">
      {links.map(([key, value]) => (
        <a key={key} href={String(value)} target="_blank" rel="noopener noreferrer" className="truncate rounded-md border border-border/60 px-2.5 py-2 text-primary hover:bg-muted">
          {key}: {String(value)}
        </a>
      ))}
    </div>
  );
}

export function SoftwareProductResearchIconPanel({ result }: { result: ProductResearchResponse }) {
  if (!result.activeSettings.fetchIconLogo) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="size-4" />
          Icon / Logo Source
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result.iconLogo ? (
          <div className="flex items-center gap-3 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote researched logo */}
            <img src={result.iconLogo.imageUrl} alt="" className="size-12 rounded-md border object-contain p-1" />
            <div className="min-w-0">
              <p className="font-medium">{result.iconLogo.sourceType.replace(/_/g, " ")}</p>
              <a href={result.iconLogo.sourceUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-primary">
                {result.iconLogo.sourceUrl}
              </a>
              <p className="text-xs text-muted-foreground">Confidence: {result.iconLogo.confidence}</p>
              {result.iconLogo.notes ? <p className="text-xs text-muted-foreground">{result.iconLogo.notes}</p> : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No official logo/icon candidate found.</p>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisReport({ result }: { result: ProductResearchResponse }) {
  const report = result.analysisReport;
  if (!report) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Full Analysis Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="leading-relaxed">{report.productOverview}</p>
        <ListBlock title="Core Feature Breakdown" items={report.coreFeatures.map((f) => `${f.title}: ${f.description}`)} />
        <ListBlock title="User Workflow" items={report.userWorkflow} />
        <ListBlock title="Main Use Cases" items={report.mainUseCases} />
        <ListBlock title="Strengths" items={report.strengths} />
        <ListBlock title="Weaknesses / Limitations" items={report.weaknessesOrLimitations} />
        {report.uiUxAnalysis ? <p><span className="font-medium">UI / UX:</span> {report.uiUxAnalysis}</p> : null}
        {report.competitivePositioning ? <p><span className="font-medium">Competitive positioning:</span> {report.competitivePositioning}</p> : null}
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 font-medium">{report.finalVerdict}</p>
      </CardContent>
    </Card>
  );
}

function ListBlock({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
        {items.slice(0, 8).map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

export function SoftwareProductResearchGithubPanel({ result }: { result: ProductResearchResponse }) {
  const github = result.technicalGithubAnalysis;
  if (!github) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="size-4" />
          Technical GitHub Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <a href={github.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{github.repoUrl}</a>
        <div className="grid gap-2 text-xs sm:grid-cols-3">
          <Badge variant="outline">Stars: {github.stars ?? "unknown"}</Badge>
          <Badge variant="outline">Forks: {github.forks ?? "unknown"}</Badge>
          <Badge variant="outline">License: {github.license ?? "unknown"}</Badge>
          <Badge variant="outline">Docs: {github.documentationQuality}</Badge>
          <Badge variant="outline">Activity: {github.repoActivity}</Badge>
          <Badge variant="outline">Language: {github.primaryLanguage ?? "unknown"}</Badge>
        </div>
        <p>{github.developerExperience}</p>
        <ListBlock title="Maintainability notes" items={github.maintainabilityNotes} />
        <ListBlock title="Risks" items={github.risks} />
      </CardContent>
    </Card>
  );
}

export function SoftwareProductResearchAlternativesPanel({ result }: { result: ProductResearchResponse }) {
  if (!result.activeSettings.includeSimilarProducts) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Similar Products / Alternatives</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.similarProducts?.length ? result.similarProducts.map((alt) => (
          <div key={alt.name} className="rounded-md border border-border/60 p-3 text-sm">
            <p className="font-medium">{alt.name}</p>
            {alt.website ? <a href={alt.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">{alt.website}</a> : null}
            <p className="mt-1 text-muted-foreground">{alt.howItCompares}</p>
          </div>
        )) : <p className="text-sm text-muted-foreground">No source-backed alternatives generated.</p>}
      </CardContent>
    </Card>
  );
}

export function SoftwareProductResearchIllustrationPanel({ result }: { result: ProductResearchResponse }) {
  if (!result.manualIllustrationPrompt) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4" />
          Manual Illustration Prompt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea readOnly value={result.manualIllustrationPrompt} rows={6} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void navigator.clipboard?.writeText(result.manualIllustrationPrompt ?? "");
            toast.success("Prompt copied.");
          }}
        >
          <Copy className="mr-2 size-4" />
          Copy prompt
        </Button>
      </CardContent>
    </Card>
  );
}

export function SoftwareProductResearchSources({ result }: { result: ProductResearchResponse }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sources, Unknowns, Warnings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {result.sources.length ? (
          <div className="space-y-2">
            {result.sources.map((source) => (
              <a key={`${source.title}-${source.url}`} href={source.url} target="_blank" rel="noopener noreferrer" className="block rounded-md border border-border/60 px-3 py-2 hover:bg-muted">
                <span className="font-medium">{source.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">{source.sourceType}</span>
                <span className="block truncate text-xs text-primary">{source.url}</span>
              </a>
            ))}
          </div>
        ) : <p className="text-muted-foreground">No source URLs were available.</p>}
        <Separator />
        <ListBlock title="Unknowns" items={result.unknowns} />
        <ListBlock title="Warnings" items={result.warnings} />
      </CardContent>
    </Card>
  );
}

export function SoftwareProductResearchSaveActions({
  result,
  existingVaultEntryId,
  saving,
  onSave,
  onCreate,
  onUpdate,
}: {
  result: ProductResearchResponse;
  existingVaultEntryId?: string | null;
  saving: boolean;
  onSave: () => void;
  onCreate: () => void;
  onUpdate: () => void;
}) {
  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardContent className="flex flex-wrap items-center gap-2 p-4">
        <Button type="button" variant="secondary" disabled={saving} onClick={onSave}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          Save research report
        </Button>
        <Button type="button" disabled={saving || !result.productName} onClick={onCreate}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
          Create vault entry from confirmed facts
        </Button>
        {existingVaultEntryId ? (
          <Button type="button" variant="outline" disabled={saving} onClick={onUpdate}>
            <RefreshCw className="mr-2 size-4" />
            Update existing entry
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
