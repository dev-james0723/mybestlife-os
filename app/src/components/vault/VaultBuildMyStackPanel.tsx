"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SoftwareVaultEntry } from "@/types/database";
import type { VaultUiCopy } from "@/lib/i18n/vault-ui";
import type { VaultBuildStackRequest } from "@/lib/vault/software-library-schema";
import type { VaultBuildStackResponse } from "@/lib/vault/software-library-schema";
import type { VaultLibraryTool } from "@/lib/vault/software-library-schema";
import { VAULT_STACK_INDUSTRY_SLUGS } from "@/lib/vault/software-library-schema";
import {
  VAULT_BUDGET_SENSITIVITY,
  VAULT_ECOSYSTEM_PREFERENCE,
  VAULT_PRIVACY_SENSITIVITY,
  VAULT_TECHNICAL_COMFORT,
  vaultBuildStackRequestSchema,
} from "@/lib/vault/software-library-schema";
import { depositLibraryToolsToVault } from "@/lib/vault/deposit-library-tools";
import { findVaultDuplicateForLibraryTool } from "@/lib/vault/recommended-tool-mapping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2 } from "lucide-react";
import { VaultLibraryToolThumb } from "@/components/vault/VaultLibraryToolThumb";

const DEFAULT_FORM: VaultBuildStackRequest = {
  industry: "finance_accounting",
  role: "",
  goals: "",
  pain_points: "",
  budget_sensitivity: "medium",
  team_size: "1–10",
  privacy_sensitivity: "standard",
  ecosystem_preference: "no_preference",
  technical_comfort: "medium",
};

type Props = {
  copy: VaultUiCopy;
  entries: SoftwareVaultEntry[];
};

type ToolPickKey = `c:${string}` | `o:${string}`;

function pickKey(kind: "c" | "o", tool: VaultLibraryTool): ToolPickKey {
  return `${kind}:${tool.id}` as ToolPickKey;
}

export function VaultBuildMyStackPanel({ copy, entries }: Props) {
  const b = copy.buildStack;
  const ind = copy.recommended.industries;
  const queryClient = useQueryClient();
  const submitHintId = useId();

  const [form, setForm] = useState<VaultBuildStackRequest>({ ...DEFAULT_FORM });
  const [result, setResult] = useState<VaultBuildStackResponse | null>(null);
  const [selected, setSelected] = useState<Set<ToolPickKey>>(new Set());
  const [loading, setLoading] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formValid = useMemo(() => vaultBuildStackRequestSchema.safeParse(form).success, [form]);

  const allToolKeys = useMemo(() => {
    if (!result) return [] as ToolPickKey[];
    const keys: ToolPickKey[] = [];
    (result.core_tools ?? []).forEach((t) => keys.push(pickKey("c", t)));
    (result.optional_tools ?? []).forEach((t) => keys.push(pickKey("o", t)));
    return keys;
  }, [result]);

  const syncSelectionToResult = useCallback((stack: VaultBuildStackResponse) => {
    const next = new Set<ToolPickKey>();
    (stack.core_tools ?? []).forEach((t) => next.add(pickKey("c", t)));
    (stack.optional_tools ?? []).forEach((t) => next.add(pickKey("o", t)));
    setSelected(next);
  }, []);

  const onSubmit = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/vault/stack-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        stack?: VaultBuildStackResponse;
        reset?: string;
      };

      if (!res.ok) {
        if (res.status === 429) {
          setError(b.errRateLimited);
          return;
        }
        if (res.status === 401) {
          setError(b.errUnauthorized);
          return;
        }
        if (res.status === 503) {
          setError(b.errMissingKey);
          return;
        }
        if (res.status === 400) {
          setError(b.errBadRequest);
          return;
        }
        if (res.status === 422) {
          setError(data.code === "no_core_tools" ? b.errEmpty : b.errModel);
          return;
        }
        setError(b.errModel);
        return;
      }

      if (!data.stack) {
        setError(b.errEmpty);
        return;
      }

      setResult(data.stack);
      syncSelectionToResult(data.stack);
    } catch {
      setError(b.errGeneric);
    } finally {
      setLoading(false);
    }
  }, [form, b, syncSelectionToResult]);

  const togglePick = useCallback((key: ToolPickKey, on: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(key);
      else n.delete(key);
      return n;
    });
  }, []);

  const selectAllTools = useCallback(() => {
    setSelected(new Set(allToolKeys));
  }, [allToolKeys]);

  const clearToolSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const toolsToDeposit = useMemo((): VaultLibraryTool[] => {
    if (!result) return [];
    const out: VaultLibraryTool[] = [];
    const want = selected;
    (result.core_tools ?? []).forEach((t) => {
      if (want.has(pickKey("c", t))) out.push(t);
    });
    (result.optional_tools ?? []).forEach((t) => {
      if (want.has(pickKey("o", t))) out.push(t);
    });
    return out;
  }, [result, selected]);

  const deposit = useCallback(
    async (tools: VaultLibraryTool[]) => {
      if (!result || tools.length === 0) return;
      setDepositing(true);
      const industryLabel = ind[form.industry];
      const ctx = {
        stackName: result.stack_name?.trim() || b.resultHeading,
        industryLabel,
      };
      try {
        const { added, merged } = await depositLibraryToolsToVault(entries, tools, ctx);
        await queryClient.invalidateQueries({ queryKey: ["software-vault"] });
        toast.success(copy.recommended.depositDone(added, merged, 0));
      } catch (e) {
        toast.error(copy.recommended.depositFailed, {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setDepositing(false);
      }
    },
    [result, form.industry, ind, entries, queryClient, copy.recommended, b.resultHeading],
  );

  const fieldClass = "space-y-1.5";

  return (
    <div className="space-y-8">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">{b.title}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">{b.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            aria-label={b.formAria}
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className={fieldClass}>
                <Label htmlFor="vbs-industry">{b.industry}</Label>
                <Select
                  value={form.industry}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, industry: v as VaultBuildStackRequest["industry"] }))
                  }
                >
                  <SelectTrigger id="vbs-industry" className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAULT_STACK_INDUSTRY_SLUGS.map((slug) => (
                      <SelectItem key={slug} value={slug}>
                        {ind[slug]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={fieldClass}>
                <Label htmlFor="vbs-role">{b.role}</Label>
                <Input
                  id="vbs-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder={b.phRole}
                  maxLength={120}
                  required
                />
              </div>

              <div className={cn(fieldClass, "md:col-span-2")}>
                <Label htmlFor="vbs-goals">{b.goals}</Label>
                <Textarea
                  id="vbs-goals"
                  value={form.goals}
                  onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))}
                  placeholder={b.phGoals}
                  rows={3}
                  required
                  className="min-h-[88px] resize-y"
                />
              </div>

              <div className={cn(fieldClass, "md:col-span-2")}>
                <Label htmlFor="vbs-pain">{b.painPoints}</Label>
                <Textarea
                  id="vbs-pain"
                  value={form.pain_points}
                  onChange={(e) => setForm((f) => ({ ...f, pain_points: e.target.value }))}
                  placeholder={b.phPain}
                  rows={3}
                  required
                  className="min-h-[88px] resize-y"
                />
              </div>

              <div className={fieldClass}>
                <Label>{b.budget}</Label>
                <Select
                  value={form.budget_sensitivity}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      budget_sensitivity: v as VaultBuildStackRequest["budget_sensitivity"],
                    }))
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAULT_BUDGET_SENSITIVITY.map((k) => (
                      <SelectItem key={k} value={k}>
                        {b.budgetLabels[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={fieldClass}>
                <Label htmlFor="vbs-team">{b.teamSize}</Label>
                <Input
                  id="vbs-team"
                  value={form.team_size}
                  onChange={(e) => setForm((f) => ({ ...f, team_size: e.target.value }))}
                  placeholder={b.phTeam}
                  maxLength={80}
                  required
                />
              </div>

              <div className={fieldClass}>
                <Label>{b.privacy}</Label>
                <Select
                  value={form.privacy_sensitivity}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      privacy_sensitivity: v as VaultBuildStackRequest["privacy_sensitivity"],
                    }))
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAULT_PRIVACY_SENSITIVITY.map((k) => (
                      <SelectItem key={k} value={k}>
                        {b.privacyLabels[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={fieldClass}>
                <Label>{b.ecosystem}</Label>
                <Select
                  value={form.ecosystem_preference}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      ecosystem_preference: v as VaultBuildStackRequest["ecosystem_preference"],
                    }))
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAULT_ECOSYSTEM_PREFERENCE.map((k) => (
                      <SelectItem key={k} value={k}>
                        {b.ecosystemLabels[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={cn(fieldClass, "md:col-span-2")}>
                <Label>{b.technical}</Label>
                <Select
                  value={form.technical_comfort}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      technical_comfort: v as VaultBuildStackRequest["technical_comfort"],
                    }))
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAULT_TECHNICAL_COMFORT.map((k) => (
                      <SelectItem key={k} value={k}>
                        {b.technicalLabels[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            {!formValid ? (
              <p id={submitHintId} className="text-xs text-muted-foreground">
                {b.submitRequiresFields}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={loading || !formValid}
                aria-describedby={!formValid ? submitHintId : undefined}
              >
                {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {loading ? b.generating : b.generate}
              </Button>
              {error ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void onSubmit()}
                  disabled={loading || !formValid}
                  aria-describedby={!formValid ? submitHintId : undefined}
                >
                  {b.retry}
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {result.stack_name?.trim() || b.resultHeading}
              </CardTitle>
              <CardDescription>{b.estMonthly(result.estimated_monthly_cost_usd ?? null)}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-normal">
                {ind[form.industry]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {result.rationale ? (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {b.rationale}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/90">{result.rationale}</p>
              </section>
            ) : null}

            {result.overlap_warnings && result.overlap_warnings.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {b.warnings}
                </h3>
                <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  {result.overlap_warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {result.setup_order && result.setup_order.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {b.setupOrder}
                </h3>
                <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                  {result.setup_order.map((step, i) => (
                    <li key={`${i}-${step.slice(0, 32)}`}>{step}</li>
                  ))}
                </ol>
              </section>
            ) : null}

            {result.notes && result.notes.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {b.notes}
                </h3>
                <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  {result.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={selectAllTools}>
                {b.selectAll}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearToolSelection}>
                {b.selectNone}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
              >
                {b.clearResult}
              </Button>
            </div>

            <ToolBlock
              title={b.coreTools}
              kind="c"
              tools={result.core_tools ?? []}
              entries={entries}
              selected={selected}
              onToggle={togglePick}
              visitLabel={b.visit}
              inVaultLabel={copy.recommended.inVaultBadge}
            />

            {(result.optional_tools?.length ?? 0) > 0 ? (
              <ToolBlock
                title={b.optionalTools}
                kind="o"
                tools={result.optional_tools ?? []}
                entries={entries}
                selected={selected}
                onToggle={togglePick}
                visitLabel={b.visit}
                inVaultLabel={copy.recommended.inVaultBadge}
              />
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={depositing || allToolKeys.length === 0}
                onClick={() =>
                  void deposit([
                    ...(result.core_tools ?? []),
                    ...(result.optional_tools ?? []),
                  ])
                }
              >
                {depositing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {b.addEntire}
              </Button>
              <Button
                type="button"
                disabled={depositing || toolsToDeposit.length === 0}
                onClick={() => void deposit(toolsToDeposit)}
              >
                {depositing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {b.addSelected(toolsToDeposit.length)}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ToolBlock({
  title,
  kind,
  tools,
  entries,
  selected,
  onToggle,
  visitLabel,
  inVaultLabel,
}: {
  title: string;
  kind: "c" | "o";
  tools: VaultLibraryTool[];
  entries: SoftwareVaultEntry[];
  selected: Set<ToolPickKey>;
  onToggle: (key: ToolPickKey, on: boolean) => void;
  visitLabel: string;
  inVaultLabel: string;
}) {
  if (tools.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <ul className="space-y-3">
        {tools.map((tool) => {
          const key = pickKey(kind, tool);
          const inVault = !!findVaultDuplicateForLibraryTool(entries, tool);
          return (
            <li
              key={key}
              className="flex gap-3 rounded-lg border border-border/50 bg-muted/15 p-3"
            >
              <Checkbox
                checked={selected.has(key)}
                onCheckedChange={(v) => onToggle(key, v === true)}
                className="mt-0.5 shrink-0"
                aria-label={tool.name}
              />
              <VaultLibraryToolThumb tool={tool} size={40} className="mt-0.5" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium leading-tight">{tool.name}</span>
                  {inVault ? (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {inVaultLabel}
                    </Badge>
                  ) : null}
                </div>
                {tool.category ? (
                  <p className="text-xs text-muted-foreground">{tool.category}</p>
                ) : null}
                {tool.role_in_stack ? (
                  <p className="text-sm text-foreground/85">{tool.role_in_stack}</p>
                ) : null}
                {tool.website_url ? (
                  <a
                    href={tool.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {visitLabel}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
