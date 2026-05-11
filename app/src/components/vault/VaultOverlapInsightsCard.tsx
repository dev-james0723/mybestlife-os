"use client";

import { useMemo } from "react";
import type { SoftwareVaultEntry } from "@/types/database";
import type { VaultInsightsCopy } from "@/lib/i18n/vault-phase4-ui";
import type { VaultOverlapInsightItem } from "@/lib/vault/software-library-schema";
import { analyzeVaultStackInsights } from "@/lib/vault/vault-stack-insights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  entries: SoftwareVaultEntry[];
  copy: VaultInsightsCopy;
  /** When set, reduces vertical padding for dense layouts. */
  compact?: boolean;
};

function localizeInsight(
  item: VaultOverlapInsightItem,
  copy: VaultInsightsCopy,
): { title: string; detail: string } {
  if (item.kind && copy.byKind[item.kind]) {
    const b = copy.byKind[item.kind];
    return { title: b.title, detail: b.detail(item.meta) };
  }
  return { title: item.title, detail: item.detail ?? "" };
}

function severityClass(sev: VaultOverlapInsightItem["severity"]): string {
  switch (sev) {
    case "warning":
      return "border-amber-500/35 bg-amber-500/5";
    case "notice":
      return "border-sky-500/30 bg-sky-500/5";
    default:
      return "border-border/60 bg-muted/20";
  }
}

export function VaultOverlapInsightsCard({ entries, copy, compact }: Props) {
  const result = useMemo(() => analyzeVaultStackInsights(entries), [entries]);

  if (result.items.length === 0) {
    return (
      <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
        <CardHeader className={cn(compact && "py-3")}>
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-base">{copy.title}</CardTitle>
          </div>
          <CardDescription>{copy.empty}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
      <CardHeader className={cn(compact && "py-3")}>
        <div className="flex items-center gap-2">
          <Lightbulb className="size-4 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">{copy.title}</CardTitle>
        </div>
        <CardDescription>{copy.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className={cn("space-y-2", compact && "pt-0")}>
        <ul className="space-y-2" aria-label={copy.title}>
          {result.items.map((item) => {
            const { title, detail } = localizeInsight(item, copy);
            return (
              <li
                key={item.id}
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  severityClass(item.severity),
                )}
              >
                <p className="font-medium leading-snug text-foreground">{title}</p>
                {detail ? (
                  <p className="mt-1 text-muted-foreground leading-relaxed">{detail}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
