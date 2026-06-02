"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogFooter } from "@/components/ui/dialog";
import { FieldConfidenceBadge } from "@/components/vault/FieldConfidenceBadge";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import type { VaultFormState } from "@/components/vault/VaultEntryForm";
import type { ConfidenceLevel, FieldSource } from "@/types/vault-smart-autofill";
import { Loader2 } from "lucide-react";
import type { ShouldAddResponse } from "@/lib/vault/intelligence-schemas";

type Props = {
  form: VaultFormState;
  fieldConfidence: Record<string, ConfidenceLevel>;
  fieldSources: FieldSource[];
  needsConfirmation: string[];
  shouldAddResult?: ShouldAddResponse | null;
  onEdit: () => void;
  onDeposit: () => void;
  onBack: () => void;
  depositing?: boolean;
};

const REVIEW_FIELDS: { key: keyof VaultFormState; section: "basic" | "usage" | "opinion" | "cost" }[] =
  [
    { key: "app_name", section: "basic" },
    { key: "website_url", section: "basic" },
    { key: "summary", section: "basic" },
    { key: "category", section: "basic" },
    { key: "platforms", section: "basic" },
    { key: "use_cases", section: "usage" },
    { key: "status", section: "usage" },
    { key: "priority", section: "usage" },
    { key: "cost_type", section: "cost" },
    { key: "cost_amount", section: "cost" },
    { key: "cost_period", section: "cost" },
    { key: "why_i_use_it", section: "opinion" },
    { key: "best_feature", section: "opinion" },
    { key: "biggest_downside", section: "opinion" },
    { key: "best_alternative", section: "opinion" },
    { key: "replaces", section: "opinion" },
    { key: "default_tool_for", section: "opinion" },
    { key: "tags", section: "opinion" },
  ];

function sourceForField(sources: FieldSource[], field: string): FieldSource | undefined {
  return sources.find((s) => s.field === field);
}

export function VaultReviewStep({
  form,
  fieldConfidence,
  fieldSources,
  needsConfirmation,
  shouldAddResult,
  onEdit,
  onDeposit,
  onBack,
  depositing,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);
  const review = copy.review;
  const fields = copy.fields;
  const formCopy = copy.form;

  const labelFor = (key: keyof VaultFormState): string => {
    const map: Partial<Record<keyof VaultFormState, string>> = {
      app_name: formCopy.appName,
      website_url: formCopy.websiteUrl,
      summary: formCopy.summary,
      category: fields.category,
      platforms: fields.platforms,
      use_cases: fields.useCases,
      status: fields.status,
      priority: fields.priority,
      cost_type: formCopy.costType,
      cost_amount: formCopy.costAmount,
      cost_period: formCopy.costPeriod,
      why_i_use_it: fields.whyUseIt,
      best_feature: fields.bestFeature,
      biggest_downside: fields.biggestDownside,
      best_alternative: fields.bestAlternative,
      replaces: fields.replaces,
      default_tool_for: fields.defaultToolFor,
      tags: fields.tags,
    };
    return map[key] ?? key;
  };

  const sections: Array<{ id: string; title: string; keys: (keyof VaultFormState)[] }> = [
    { id: "basic", title: formCopy.sectionBasic, keys: [] },
    { id: "usage", title: formCopy.sectionUsage, keys: [] },
    { id: "cost", title: review.costSection, keys: [] },
    { id: "opinion", title: formCopy.sectionOpinion, keys: [] },
  ];

  for (const f of REVIEW_FIELDS) {
    const sec = sections.find((s) => s.id === f.section);
    if (sec) sec.keys.push(f.key);
  }

  const blocked = needsConfirmation.length > 0;

  return (
    <>
      {shouldAddResult ? (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Should-I-Add review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4 pt-0 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/30 bg-background px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-primary">
                {shouldAddResult.recommendation.replace(/_/g, " ")}
              </span>
              {shouldAddResult.suggested_trial_period ? (
                <span className="text-xs text-muted-foreground">
                  Trial: {shouldAddResult.suggested_trial_period}
                </span>
              ) : null}
            </div>
            <p className="leading-relaxed">{shouldAddResult.reason}</p>
            {shouldAddResult.overlap_with_existing_tools.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Overlap warnings</p>
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {shouldAddResult.overlap_with_existing_tools.slice(0, 4).map((item) => (
                    <li key={`${item.app_name}-${item.reason}`}>
                      <span className="font-medium text-foreground/80">{item.app_name}:</span>{" "}
                      {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {shouldAddResult.project_relevance.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Project relevance</p>
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {shouldAddResult.project_relevance.slice(0, 4).map((item) => (
                    <li key={`${item.target_type}-${item.label}`}>
                      <span className="font-medium text-foreground/80">{item.label}:</span>{" "}
                      {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {shouldAddResult.cost_warning ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-900 dark:text-amber-100">
                {shouldAddResult.cost_warning}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {blocked ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {review.needsConfirmation(needsConfirmation.length)}
        </div>
      ) : null}

      <div className="max-h-[50vh] space-y-4 overflow-y-auto py-2">
        {sections.map((section) =>
          section.keys.length === 0 ? null : (
            <Card key={section.id}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-4 pt-0">
                {section.keys.map((key) => {
                  const value = String(form[key] ?? "").trim() || review.emptyValue;
                  const needs = needsConfirmation.includes(key);
                  return (
                    <div
                      key={key}
                      className={needs ? "rounded-md border border-destructive/40 bg-destructive/5 p-2" : ""}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {labelFor(key)}
                        </span>
                        <FieldConfidenceBadge
                          field={key}
                          confidence={fieldConfidence[key]}
                          source={sourceForField(fieldSources, key)}
                        />
                      </div>
                      <p className="text-sm leading-snug">{value}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ),
        )}
      </div>

      <DialogFooter className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          ← {review.back}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onEdit}>
            {review.editFields}
          </Button>
          <Button type="button" onClick={onDeposit} disabled={blocked || depositing}>
            {depositing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {review.confirmDeposit}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
