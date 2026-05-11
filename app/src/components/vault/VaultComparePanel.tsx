"use client";

import { useId, useMemo, useState } from "react";
import type { SoftwareVaultEntry } from "@/types/database";
import type { VaultCompareCopy } from "@/lib/i18n/vault-phase4-ui";
import type { VaultInsightsCopy } from "@/lib/i18n/vault-phase4-ui";
import {
  buildVaultCompareMatrix,
  VAULT_COMPARE_DIMENSION_KEYS,
  type VaultCompareDimensionKey,
} from "@/lib/vault/entry-compare-dimensions";
import { useVaultData } from "@/stores/vault-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VaultOverlapInsightsCard } from "@/components/vault/VaultOverlapInsightsCard";
import { cn } from "@/lib/utils";

type Props = {
  entries: SoftwareVaultEntry[];
  compare: VaultCompareCopy;
  insights: VaultInsightsCopy;
};

function dimLabel(key: VaultCompareDimensionKey, c: VaultCompareCopy): string {
  switch (key) {
    case "summary":
      return c.dimSummary;
    case "bestFor":
      return c.dimBestFor;
    case "downsides":
      return c.dimDownsides;
    case "cost":
      return c.dimCost;
    case "easeOfUse":
      return c.dimEase;
    case "integration":
      return c.dimIntegration;
    case "privacyEnterprise":
      return c.dimPrivacy;
    case "workflowFit":
      return c.dimWorkflow;
    default:
      return key;
  }
}

export function VaultComparePanel({ entries, compare: c, insights }: Props) {
  const compareIds = useVaultData((s) => s.compareVaultEntryIds);
  const toggleCompareVaultEntryId = useVaultData((s) => s.toggleCompareVaultEntryId);
  const setCompareIds = useVaultData((s) => s.setCompareVaultEntryIds);
  const selectEntry = useVaultData((s) => s.selectEntry);
  const maxReachedDescId = useId();

  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((e) => {
      const blob = [e.app_name, e.category, e.tags, e.use_cases].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(needle);
    });
  }, [entries, q]);

  const selectedOrdered = useMemo(() => {
    const map = new Map(entries.map((e) => [e.id, e]));
    return compareIds.map((id) => map.get(id)).filter(Boolean) as SoftwareVaultEntry[];
  }, [entries, compareIds]);

  const matrix = useMemo(() => buildVaultCompareMatrix(selectedOrdered), [selectedOrdered]);

  return (
    <div className="space-y-8">
      <VaultOverlapInsightsCard entries={entries} copy={insights} />

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">{c.title}</CardTitle>
          <CardDescription>{c.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vault-compare-search">{c.pickerTitle}</Label>
            <p className="text-xs text-muted-foreground">{c.pickerHint}</p>
            <Input
              id="vault-compare-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={c.searchPlaceholder}
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">{c.maxToolsNote}</p>
            <p id={maxReachedDescId} className="sr-only">
              {c.maxReachedHint}
            </p>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {c.selectionStatus(compareIds.length)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setCompareIds([])}>
              {c.clearSelection}
            </Button>
          </div>

          <ScrollArea className="h-[min(360px,50vh)] rounded-lg border border-border/50">
            <ul className="divide-y divide-border/50 p-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">{c.pickerEmpty}</li>
              ) : null}
              {filtered.map((entry) => {
                const checked = compareIds.includes(entry.id);
                const atCap = compareIds.length >= 4 && !checked;
                return (
                  <li
                    key={entry.id}
                    className="flex items-start gap-3 px-2 py-2.5 hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={atCap}
                      onCheckedChange={() => toggleCompareVaultEntryId(entry.id)}
                      className="mt-1"
                      aria-label={entry.app_name}
                      aria-describedby={atCap ? maxReachedDescId : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium leading-tight">{entry.app_name}</span>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto shrink-0 p-0 text-xs"
                          onClick={() => selectEntry(entry.id)}
                        >
                          {c.openEntry}
                        </Button>
                      </div>
                      {entry.category ? (
                        <p className="text-xs text-muted-foreground">{entry.category}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedOrdered.length < 2 ? (
        <p className="text-sm text-muted-foreground" role="status">
          {c.needTwo}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="hidden overflow-x-auto rounded-xl border border-border/50 shadow-sm lg:block">
            <table className="w-full min-w-[640px] caption-bottom text-left text-sm">
              <caption className="sr-only">{c.tableCaption}</caption>
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th
                    scope="col"
                    className="sticky left-0 z-[1] w-40 min-w-[9rem] bg-muted/95 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm"
                  >
                    {c.dimensionColumn}
                  </th>
                  {matrix.map(({ entry }) => (
                    <th
                      key={entry.id}
                      scope="col"
                      className="min-w-[11rem] px-3 py-2 text-xs font-semibold text-foreground"
                    >
                      {entry.app_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VAULT_COMPARE_DIMENSION_KEYS.map((key) => (
                  <tr key={key} className="border-b border-border/40 last:border-0">
                    <th
                      scope="row"
                      className="sticky left-0 z-[1] bg-background/95 px-3 py-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm"
                    >
                      {dimLabel(key, c)}
                    </th>
                    {matrix.map(({ entry, cells }) => (
                      <td key={`${entry.id}-${key}`} className="px-3 py-2.5 align-top text-foreground/90">
                        <span className="leading-relaxed">{cells[key]}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {matrix.map(({ entry, cells }) => (
              <Card key={entry.id} className="border-border/50 bg-card/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">{entry.app_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {VAULT_COMPARE_DIMENSION_KEYS.map((key) => (
                    <div key={key}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {dimLabel(key, c)}
                      </p>
                      <p className="text-sm leading-relaxed text-foreground/90">{cells[key]}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
