"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity,
  ClipboardCheck,
  DollarSign,
  Layers3,
  Loader2,
  Save,
  Search,
  Sparkles,
  Star,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { SoftwareVaultEntry } from "@/types/database";
import {
  buildPageIntelligence,
  estimateMonthlyUsd,
} from "@/lib/vault/tool-stack-intelligence";
import type {
  DefaultToolRecommendation,
  DefaultToolRecommendationResponse,
  OverlapAuditResponse,
  ProjectStackResponse,
  SubscriptionAuditResponse,
  ToolStackInsight,
  WorkflowRecipeResponse,
} from "@/lib/vault/intelligence-schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type Props = {
  entries: SoftwareVaultEntry[];
  onOpenSmartAdd: () => void;
  onSelectEntry: (id: string) => void;
};

type Result =
  | { kind: "overlap"; data: OverlapAuditResponse }
  | { kind: "subscription"; data: SubscriptionAuditResponse }
  | { kind: "project"; data: ProjectStackResponse }
  | { kind: "recipe"; data: WorkflowRecipeResponse }
  | { kind: "defaults"; data: DefaultToolRecommendationResponse }
  | null;

const COMMAND_CHIPS = [
  "Find overlapping tools",
  "Audit my software spending",
  "Build a project stack",
  "Create workflow recipe",
  "Pick my default tools",
  "Should I add a tool?",
];

function usd(value: number | null | undefined): string {
  if (!value) return "$0";
  return `$${value.toFixed(2)}`;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(json.message ?? json.error ?? "Request failed");
  }
  return json as T;
}

function defaultSelection(entries: SoftwareVaultEntry[]): string[] {
  return entries
    .filter((entry) => entry.is_default_stack || entry.status === "Active")
    .slice(0, 8)
    .map((entry) => entry.id);
}

export function VaultIntelligenceCommandCenter({
  entries,
  onOpenSmartAdd,
  onSelectEntry,
}: Props) {
  const queryClient = useQueryClient();
  const page = useMemo(() => buildPageIntelligence(entries), [entries]);
  const [command, setCommand] = useState("");
  const [mode, setMode] = useState<"overview" | "project" | "recipe" | "usage">("overview");
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => defaultSelection(entries));
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [recipeName, setRecipeName] = useState("");
  const [recipeGoal, setRecipeGoal] = useState("");
  const [usageEntryId, setUsageEntryId] = useState(entries[0]?.id ?? "");
  const [usageNote, setUsageNote] = useState("");

  useEffect(() => {
    setSelectedIds((current) => {
      const valid = new Set(entries.map((entry) => entry.id));
      const next = current.filter((id) => valid.has(id));
      return next.length > 0 ? next : defaultSelection(entries);
    });
    if (!entries.some((entry) => entry.id === usageEntryId)) {
      setUsageEntryId(entries[0]?.id ?? "");
    }
  }, [entries, usageEntryId]);

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedIds.includes(entry.id)),
    [entries, selectedIds],
  );

  const runOverlap = async (save = false) => {
    setLoading(save ? "save-overlap" : "overlap");
    try {
      const data = await postJson<OverlapAuditResponse>("/api/vault/overlap-audit", { save });
      setResult({ kind: "overlap", data });
      toast.success(save ? "Overlap audit saved." : "Overlap audit ready.");
    } catch (error) {
      toast.error("Overlap audit failed.", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(null);
    }
  };

  const runSubscription = async (save = false) => {
    setLoading(save ? "save-subscription" : "subscription");
    try {
      const data = await postJson<SubscriptionAuditResponse>("/api/vault/subscription-audit", { save });
      setResult({ kind: "subscription", data });
      toast.success(save ? "Subscription reviews saved." : "Subscription audit ready.");
    } catch (error) {
      toast.error("Subscription audit failed.", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(null);
    }
  };

  const runDefaults = async () => {
    setLoading("defaults");
    try {
      const data = await postJson<DefaultToolRecommendationResponse>("/api/vault/default-tools/recommend", {});
      setResult({ kind: "defaults", data });
      toast.success("Default tool recommendations ready.");
    } catch (error) {
      toast.error("Default recommendation failed.", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(null);
    }
  };

  const applyDefault = async (recommendation: DefaultToolRecommendation) => {
    setLoading(`apply-default-${recommendation.recommendedEntryId}`);
    try {
      await postJson("/api/vault/default-tools/apply", { recommendation });
      await queryClient.invalidateQueries({ queryKey: ["software-vault"] });
      toast.success(`${recommendation.recommendedAppName} saved as a default.`);
    } catch (error) {
      toast.error("Could not save default tool.", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(null);
    }
  };

  const runProjectStack = async (save = false) => {
    if (!projectName.trim()) return;
    setLoading(save ? "save-project" : "project");
    try {
      const data = await postJson<ProjectStackResponse>("/api/vault/project-stack", {
        targetType: "custom",
        targetName: projectName.trim(),
        description: projectDescription.trim() || null,
        selectedEntryIds: selectedIds,
        save,
      });
      setResult({ kind: "project", data });
      toast.success(save ? "Project stack blueprint saved." : "Project stack ready.");
    } catch (error) {
      toast.error("Project stack failed.", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(null);
    }
  };

  const runRecipe = async () => {
    if (!recipeName.trim() || !recipeGoal.trim()) return;
    setLoading("recipe");
    try {
      const data = await postJson<WorkflowRecipeResponse>("/api/vault/workflow-recipes", {
        name: recipeName.trim(),
        goal: recipeGoal.trim(),
        selectedEntryIds: selectedIds,
      });
      setResult({ kind: "recipe", data });
      toast.success("Workflow recipe ready.");
    } catch (error) {
      toast.error("Recipe generation failed.", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(null);
    }
  };

  const saveRecipe = async () => {
    if (result?.kind !== "recipe") return;
    setLoading("save-recipe");
    try {
      await postJson("/api/vault/workflow-recipes/save", { recipe: result.data });
      toast.success("Workflow recipe saved.");
    } catch (error) {
      toast.error("Could not save recipe.", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(null);
    }
  };

  const recordUse = async () => {
    if (!usageEntryId) return;
    setLoading("usage");
    try {
      await postJson("/api/vault/usage/record", {
        entryId: usageEntryId,
        eventType: "used",
        contextType: "manual",
        note: usageNote.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["software-vault"] });
      setUsageNote("");
      toast.success("Usage recorded.");
    } catch (error) {
      toast.error("Could not record usage.", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(null);
    }
  };

  const runCommand = (text: string) => {
    const lower = text.toLowerCase();
    setCommand(text);
    if (/overlap|fragment|duplicate|redundant/.test(lower)) void runOverlap(false);
    else if (/cancel|spend|subscription|cost|downgrade/.test(lower)) void runSubscription(false);
    else if (/default|pick/.test(lower)) void runDefaults();
    else if (/recipe|workflow/.test(lower)) setMode("recipe");
    else if (/stack|project/.test(lower)) setMode("project");
    else if (/add|research|tool/.test(lower)) onOpenSmartAdd();
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) return [...new Set([...current, id])];
      return current.filter((entryId) => entryId !== id);
    });
  };

  return (
    <Card className="border-border/60 bg-card/55 shadow-sm backdrop-blur">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="size-4 text-primary" aria-hidden />
              Tool Stack Intelligence
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={page.healthScore >= 75 ? "secondary" : "outline"}>
                Health {page.healthScore}/100
              </Badge>
              <span>{entries.length} tools</span>
              <span>{page.generatedAt.slice(0, 10)}</span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 lg:max-w-xl">
            <div className="flex gap-2">
              <Input
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && command.trim()) runCommand(command);
                }}
                placeholder="Ask about a tool, paste a pricing page, or describe a workflow..."
              />
              <Button type="button" onClick={() => command.trim() && runCommand(command)} disabled={!command.trim()}>
                <Search className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMAND_CHIPS.map((chip) => (
                <Button key={chip} type="button" variant="outline" size="sm" onClick={() => runCommand(chip)}>
                  {chip}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {page.summaryCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                if (card.id === "spend") void runSubscription(false);
                if (card.id === "overlap" || card.id === "missing") void runOverlap(false);
              }}
              className="rounded-lg border border-border/60 bg-background/60 p-3 text-left transition hover:bg-accent"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{card.value}</p>
              {card.detail ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{card.detail}</p> : null}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <CommandButton icon={Layers3} label="Overlap Doctor" loading={loading === "overlap"} onClick={() => void runOverlap(false)} />
          <CommandButton icon={DollarSign} label="Cost Audit" loading={loading === "subscription"} onClick={() => void runSubscription(false)} />
          <CommandButton icon={Star} label="Default Tools" loading={loading === "defaults"} onClick={() => void runDefaults()} />
          <CommandButton icon={ClipboardCheck} label="Project Stack" active={mode === "project"} onClick={() => setMode(mode === "project" ? "overview" : "project")} />
          <CommandButton icon={Workflow} label="Recipe" active={mode === "recipe"} onClick={() => setMode(mode === "recipe" ? "overview" : "recipe")} />
          <CommandButton icon={Activity} label="Record Use" active={mode === "usage"} onClick={() => setMode(mode === "usage" ? "overview" : "usage")} />
        </div>

        {mode === "project" ? (
          <ProjectStackComposer
            entries={entries}
            selectedIds={selectedIds}
            projectName={projectName}
            projectDescription={projectDescription}
            loading={loading}
            onProjectName={setProjectName}
            onProjectDescription={setProjectDescription}
            onToggleSelected={toggleSelected}
            onBuild={() => void runProjectStack(false)}
          />
        ) : null}

        {mode === "recipe" ? (
          <RecipeComposer
            entries={entries}
            selectedIds={selectedIds}
            recipeName={recipeName}
            recipeGoal={recipeGoal}
            loading={loading}
            onRecipeName={setRecipeName}
            onRecipeGoal={setRecipeGoal}
            onToggleSelected={toggleSelected}
            onGenerate={() => void runRecipe()}
          />
        ) : null}

        {mode === "usage" ? (
          <UsageRecorder
            entries={entries}
            usageEntryId={usageEntryId}
            usageNote={usageNote}
            loading={loading === "usage"}
            onEntry={setUsageEntryId}
            onNote={setUsageNote}
            onRecord={() => void recordUse()}
          />
        ) : null}

        {page.nextActions.length > 0 && !result ? (
          <>
            <Separator />
            <InsightList
              title="Next Review Actions"
              items={page.nextActions}
              entries={entries}
              onSelectEntry={onSelectEntry}
            />
          </>
        ) : null}

        {result ? (
          <>
            <Separator />
            <ResultView
              result={result}
              entries={entries}
              selectedEntries={selectedEntries}
              loading={loading}
              onSelectEntry={onSelectEntry}
              onSaveOverlap={() => void runOverlap(true)}
              onSaveSubscription={() => void runSubscription(true)}
              onSaveProject={() => void runProjectStack(true)}
              onSaveRecipe={() => void saveRecipe()}
              onApplyDefault={(recommendation) => void applyDefault(recommendation)}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CommandButton({
  icon: Icon,
  label,
  loading,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  loading?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant={active ? "default" : "secondary"} size="sm" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Icon className="mr-2 size-4" />}
      {label}
    </Button>
  );
}

function ToolPicker({
  entries,
  selectedIds,
  onToggleSelected,
}: {
  entries: SoftwareVaultEntry[];
  selectedIds: string[];
  onToggleSelected: (id: string, checked: boolean) => void;
}) {
  return (
    <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-border/60 bg-background/50 p-2 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <label key={entry.id} className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
          <Checkbox
            checked={selectedIds.includes(entry.id)}
            onCheckedChange={(checked) => onToggleSelected(entry.id, checked === true)}
          />
          <span className="truncate">{entry.app_name}</span>
          {estimateMonthlyUsd(entry) > 0 ? (
            <span className="ml-auto text-xs text-muted-foreground">{usd(estimateMonthlyUsd(entry))}</span>
          ) : null}
        </label>
      ))}
    </div>
  );
}

function ProjectStackComposer({
  entries,
  selectedIds,
  projectName,
  projectDescription,
  loading,
  onProjectName,
  onProjectDescription,
  onToggleSelected,
  onBuild,
}: {
  entries: SoftwareVaultEntry[];
  selectedIds: string[];
  projectName: string;
  projectDescription: string;
  loading: string | null;
  onProjectName: (value: string) => void;
  onProjectDescription: (value: string) => void;
  onToggleSelected: (id: string, checked: boolean) => void;
  onBuild: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-2">
          <Label htmlFor="vault-project-stack-name">Project or goal</Label>
          <Input id="vault-project-stack-name" value={projectName} onChange={(e) => onProjectName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vault-project-stack-description">Context</Label>
          <Input id="vault-project-stack-description" value={projectDescription} onChange={(e) => onProjectDescription(e.target.value)} />
        </div>
      </div>
      <ToolPicker entries={entries} selectedIds={selectedIds} onToggleSelected={onToggleSelected} />
      <Button type="button" onClick={onBuild} disabled={!projectName.trim() || loading === "project"}>
        {loading === "project" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Layers3 className="mr-2 size-4" />}
        Build stack
      </Button>
    </div>
  );
}

function RecipeComposer({
  entries,
  selectedIds,
  recipeName,
  recipeGoal,
  loading,
  onRecipeName,
  onRecipeGoal,
  onToggleSelected,
  onGenerate,
}: {
  entries: SoftwareVaultEntry[];
  selectedIds: string[];
  recipeName: string;
  recipeGoal: string;
  loading: string | null;
  onRecipeName: (value: string) => void;
  onRecipeGoal: (value: string) => void;
  onToggleSelected: (id: string, checked: boolean) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-2">
          <Label htmlFor="vault-recipe-name">Recipe name</Label>
          <Input id="vault-recipe-name" value={recipeName} onChange={(e) => onRecipeName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vault-recipe-goal">Goal</Label>
          <Input id="vault-recipe-goal" value={recipeGoal} onChange={(e) => onRecipeGoal(e.target.value)} />
        </div>
      </div>
      <ToolPicker entries={entries} selectedIds={selectedIds} onToggleSelected={onToggleSelected} />
      <Button type="button" onClick={onGenerate} disabled={!recipeName.trim() || !recipeGoal.trim() || loading === "recipe"}>
        {loading === "recipe" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Workflow className="mr-2 size-4" />}
        Generate recipe
      </Button>
    </div>
  );
}

function UsageRecorder({
  entries,
  usageEntryId,
  usageNote,
  loading,
  onEntry,
  onNote,
  onRecord,
}: {
  entries: SoftwareVaultEntry[];
  usageEntryId: string;
  usageNote: string;
  loading: boolean;
  onEntry: (value: string) => void;
  onNote: (value: string) => void;
  onRecord: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/15 p-4 lg:grid-cols-[minmax(180px,320px)_minmax(0,1fr)_auto] lg:items-end">
      <div className="space-y-2">
        <Label>Tool</Label>
        <Select value={usageEntryId} onValueChange={(value) => value && onEntry(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entries.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.app_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="vault-usage-note">Note</Label>
        <Input id="vault-usage-note" value={usageNote} onChange={(e) => onNote(e.target.value)} />
      </div>
      <Button type="button" onClick={onRecord} disabled={!usageEntryId || loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Activity className="mr-2 size-4" />}
        Record use
      </Button>
    </div>
  );
}

function InsightList({
  title,
  items,
  entries,
  onSelectEntry,
}: {
  title: string;
  items: ToolStackInsight[];
  entries: SoftwareVaultEntry[];
  onSelectEntry: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.severity === "warning" || item.severity === "critical" ? "destructive" : "outline"}>
                    {item.action.replace(/_/g, " ")}
                  </Badge>
                  <p className="font-medium">{item.title}</p>
                </div>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
                <p className="text-sm">{item.recommendation}</p>
              </div>
              {item.estimatedMonthlyUsd ? (
                <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums">
                  {usd(item.estimatedMonthlyUsd)}/mo
                </span>
              ) : null}
            </div>
            {item.relatedEntryIds.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.relatedEntryIds.map((id) => {
                  const entry = entries.find((candidate) => candidate.id === id);
                  return entry ? (
                    <Button key={id} type="button" variant="ghost" size="sm" onClick={() => onSelectEntry(id)}>
                      {entry.app_name}
                    </Button>
                  ) : null;
                })}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultView({
  result,
  entries,
  selectedEntries,
  loading,
  onSelectEntry,
  onSaveOverlap,
  onSaveSubscription,
  onSaveProject,
  onSaveRecipe,
  onApplyDefault,
}: {
  result: NonNullable<Result>;
  entries: SoftwareVaultEntry[];
  selectedEntries: SoftwareVaultEntry[];
  loading: string | null;
  onSelectEntry: (id: string) => void;
  onSaveOverlap: () => void;
  onSaveSubscription: () => void;
  onSaveProject: () => void;
  onSaveRecipe: () => void;
  onApplyDefault: (recommendation: DefaultToolRecommendation) => void;
}) {
  if (result.kind === "overlap") {
    return (
      <div className="space-y-4">
        <ResultHeader
          title="Stack Doctor"
          detail={`${result.data.summary.overlapGroups} overlap groups, ${result.data.summary.missingCapabilityCount} missing layers`}
          actionLabel={result.data.savedGroupIds ? "Saved" : "Save audit"}
          loading={loading === "save-overlap"}
          onAction={onSaveOverlap}
          disabled={Boolean(result.data.savedGroupIds)}
        />
        <InsightList title="Overlap" items={result.data.groups} entries={entries} onSelectEntry={onSelectEntry} />
        <InsightList title="Missing Capabilities" items={result.data.missingCapabilities} entries={entries} onSelectEntry={onSelectEntry} />
      </div>
    );
  }

  if (result.kind === "subscription") {
    return (
      <div className="space-y-4">
        <ResultHeader
          title="Subscription Health"
          detail={`${usd(result.data.summary.estimatedMonthlyUsd)}/mo across ${result.data.summary.activeRecurringTools} recurring tools`}
          actionLabel={result.data.savedReviewIds ? "Saved" : "Save reviews"}
          loading={loading === "save-subscription"}
          onAction={onSaveSubscription}
          disabled={Boolean(result.data.savedReviewIds)}
        />
        <InsightList title="Review Suggestions" items={result.data.reviews} entries={entries} onSelectEntry={onSelectEntry} />
      </div>
    );
  }

  if (result.kind === "project") {
    return (
      <div className="space-y-4">
        <ResultHeader
          title={result.data.name}
          detail={`${result.data.items.length} tools, ${selectedEntries.length} explicitly selected`}
          actionLabel={result.data.blueprintId ? "Saved" : "Save blueprint"}
          loading={loading === "save-project"}
          onAction={onSaveProject}
          disabled={Boolean(result.data.blueprintId)}
        />
        <p className="text-sm text-muted-foreground">{result.data.rationale}</p>
        <div className="grid gap-2 lg:grid-cols-2">
          {result.data.items.map((item) => (
            <div key={`${item.appName}-${item.role}`} className="rounded-lg border border-border/60 bg-background/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.fit === "core" ? "secondary" : "outline"}>{item.fit}</Badge>
                {item.entryId ? (
                  <button type="button" className="font-medium hover:underline" onClick={() => onSelectEntry(item.entryId!)}>
                    {item.appName}
                  </button>
                ) : (
                  <span className="font-medium">{item.appName}</span>
                )}
                {item.estimatedMonthlyUsd ? <span className="ml-auto text-xs">{usd(item.estimatedMonthlyUsd)}/mo</span> : null}
              </div>
              <p className="mt-2 text-sm">{item.role}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
            </div>
          ))}
        </div>
        {result.data.setupOrder.length > 0 ? (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {result.data.setupOrder.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : null}
      </div>
    );
  }

  if (result.kind === "recipe") {
    return (
      <div className="space-y-4">
        <ResultHeader
          title={result.data.name}
          detail={`${result.data.steps.length} steps, ${result.data.requiredEntryIds.length} linked tools`}
          actionLabel="Save recipe"
          loading={loading === "save-recipe"}
          onAction={onSaveRecipe}
        />
        <p className="text-sm text-muted-foreground">{result.data.overview}</p>
        <div className="space-y-2">
          {result.data.steps.map((step) => (
            <div key={step.stepIndex} className="rounded-lg border border-border/60 bg-background/60 p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{step.stepIndex}</Badge>
                <p className="font-medium">{step.title}</p>
              </div>
              <p className="mt-2 text-sm">{step.instruction}</p>
              <p className="mt-1 text-xs text-muted-foreground">Output: {step.output}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResultHeader
        title="Default Tool Recommendations"
        detail={`${result.data.recommendations.length} recommendations`}
      />
      <div className="space-y-2">
        {result.data.recommendations.map((recommendation) => (
          <div key={`${recommendation.job}-${recommendation.recommendedEntryId}`} className="rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{recommendation.job}</p>
                <p className="text-sm text-muted-foreground">{recommendation.recommendedAppName}</p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => onApplyDefault(recommendation)}
                disabled={loading === `apply-default-${recommendation.recommendedEntryId}`}
              >
                {loading === `apply-default-${recommendation.recommendedEntryId}` ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Star className="mr-2 size-4" />
                )}
                Apply
              </Button>
            </div>
            <p className="mt-2 text-sm">{recommendation.reason}</p>
            {recommendation.alternatives.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Alternatives: {recommendation.alternatives.map((alt) => alt.appName).join(", ")}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultHeader({
  title,
  detail,
  actionLabel,
  loading,
  disabled,
  onAction,
}: {
  title: string;
  detail?: string;
  actionLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
      </div>
      {actionLabel && onAction ? (
        <Button type="button" variant="secondary" size="sm" onClick={onAction} disabled={loading || disabled}>
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
