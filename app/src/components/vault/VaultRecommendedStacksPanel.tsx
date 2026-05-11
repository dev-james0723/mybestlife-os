"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SoftwareVaultEntry } from "@/types/database";
import type { VaultUiCopy } from "@/lib/i18n/vault-ui";
import type {
  VaultCuratedStackTemplate,
  VaultLibraryTool,
  VaultStackIndustrySlug,
} from "@/lib/vault/software-library-schema";
import { VAULT_STACK_INDUSTRY_SLUGS } from "@/lib/vault/software-library-schema";
import { VAULT_CURATED_STACK_TEMPLATES } from "@/lib/vault/stack-templates";
import { depositLibraryToolsToVault } from "@/lib/vault/deposit-library-tools";
import { findVaultDuplicateForLibraryTool } from "@/lib/vault/recommended-tool-mapping";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2 } from "lucide-react";
import { VaultLibraryToolThumb } from "@/components/vault/VaultLibraryToolThumb";

type IndustryFilter = "all" | VaultStackIndustrySlug;

type Props = {
  copy: VaultUiCopy["recommended"];
  entries: SoftwareVaultEntry[];
};

export function VaultRecommendedStacksPanel({ copy, entries }: Props) {
  const queryClient = useQueryClient();
  const [industry, setIndustry] = useState<IndustryFilter>("all");
  const [openStackId, setOpenStackId] = useState<string | null>(null);
  const openStack = useMemo(
    () => VAULT_CURATED_STACK_TEMPLATES.find((s) => s.id === openStackId) ?? null,
    [openStackId],
  );

  const filtered = useMemo(() => {
    if (industry === "all") return VAULT_CURATED_STACK_TEMPLATES;
    return VAULT_CURATED_STACK_TEMPLATES.filter((s) => s.industry === industry);
  }, [industry]);

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={copy.filterAria}
      >
        <FilterChip active={industry === "all"} onClick={() => setIndustry("all")}>
          {copy.filterAll}
        </FilterChip>
        {VAULT_STACK_INDUSTRY_SLUGS.map((slug) => (
          <FilterChip
            key={slug}
            active={industry === slug}
            onClick={() => setIndustry(slug)}
          >
            {copy.industries[slug]}
          </FilterChip>
        ))}
      </div>

      <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((stack) => (
          <li key={stack.id}>
            <StackSummaryCard
              stack={stack}
              copy={copy}
              onOpen={() => setOpenStackId(stack.id)}
            />
          </li>
        ))}
      </ul>

      <VaultStackDetailSheet
        stack={openStack}
        open={!!openStack}
        onOpenChange={(o) => {
          if (!o) setOpenStackId(null);
        }}
        copy={copy}
        entries={entries}
        onDeposited={async () => {
          await queryClient.invalidateQueries({ queryKey: ["software-vault"] });
        }}
      />
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
        active
          ? "border-primary/40 bg-primary/15 text-foreground"
          : "border-border/60 bg-background/40 text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function StackSummaryCard({
  stack,
  copy,
  onOpen,
}: {
  stack: VaultCuratedStackTemplate;
  copy: VaultUiCopy["recommended"];
  onOpen: () => void;
}) {
  return (
    <Card className="h-full border-border/50 bg-card/60 shadow-sm backdrop-blur-sm transition-colors hover:border-primary/25">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {copy.industries[stack.industry]}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {copy.difficulty[stack.setup_difficulty]}
          </Badge>
        </div>
        <CardTitle className="text-base leading-snug">{stack.name}</CardTitle>
        {stack.role ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{copy.roleLabel}</span>{" "}
            {stack.role}
          </p>
        ) : null}
        <CardDescription className="line-clamp-3 text-sm leading-relaxed">
          {stack.summary}
        </CardDescription>
        {stack.tools.length > 0 ? (
          <div className="flex -space-x-2 pt-1 rtl:space-x-reverse" aria-hidden>
            {stack.tools.slice(0, 5).map((t) => (
              <VaultLibraryToolThumb key={t.id} tool={t} size={28} className="ring-2 ring-card" />
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{copy.estMonthly(stack.estimated_monthly_cost_usd)}</span>
          <span>{copy.toolCount(stack.tools.length)}</span>
        </div>
        <Button variant="secondary" size="sm" className="w-full" onClick={onOpen}>
          {copy.viewDetails}
        </Button>
      </CardContent>
    </Card>
  );
}

function VaultStackDetailSheet({
  stack,
  open,
  onOpenChange,
  copy,
  entries,
  onDeposited,
}: {
  stack: VaultCuratedStackTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: VaultUiCopy["recommended"];
  entries: SoftwareVaultEntry[];
  onDeposited: () => Promise<void>;
}) {
  const industryLabel = stack ? copy.industries[stack.industry] : "";

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!stack) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(stack.tools.map((t) => t.id)));
  }, [stack]);

  const toggleId = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!stack) return;
    setSelectedIds(new Set(stack.tools.map((t) => t.id)));
  }, [stack]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const depositTools = useCallback(
    async (tools: VaultLibraryTool[]) => {
      if (!stack || tools.length === 0) return;
      setBusy(true);
      let added = 0;
      let merged = 0;
      const ctx = { stackName: stack.name, industryLabel };
      let working = [...entries];

      try {
        const { added: a, merged: m, working: w } = await depositLibraryToolsToVault(working, tools, ctx);
        added = a;
        merged = m;
        working = w;
        await onDeposited();
        toast.success(copy.depositDone(added, merged, 0));
        onOpenChange(false);
      } catch (e) {
        toast.error(copy.depositFailed, {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setBusy(false);
      }
    },
    [stack, entries, industryLabel, onDeposited, onOpenChange, copy],
  );

  const selectedTools = useMemo(() => {
    if (!stack) return [];
    return stack.tools.filter((t) => selectedIds.has(t.id));
  }, [stack, selectedIds]);

  if (!stack) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton
      >
        <SheetHeader className="border-b border-border/60 p-4 text-left">
          <div className="flex flex-wrap gap-2 pr-8">
            <Badge variant="secondary" className="font-normal">
              {copy.industries[stack.industry]}
            </Badge>
            <Badge variant="outline" className="font-normal">
              {copy.difficulty[stack.setup_difficulty]}
            </Badge>
            <Badge variant="outline" className="font-normal">
              {copy.estMonthly(stack.estimated_monthly_cost_usd)}
            </Badge>
          </div>
          <SheetTitle className="text-lg leading-snug">{stack.name}</SheetTitle>
          <SheetDescription className="line-clamp-3 text-left">
            {stack.summary}
          </SheetDescription>
          {stack.role ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground/90">{copy.roleLabel}</span>{" "}
              {stack.role}
            </p>
          ) : null}
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 p-4">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.sectionRationale}
              </h3>
              <p className="text-sm leading-relaxed text-foreground/90">{stack.rationale}</p>
            </section>

            {stack.tradeoffs && stack.tradeoffs.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {copy.sectionTradeoffs}
                </h3>
                <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  {stack.tradeoffs.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.sectionSetup}
              </h3>
              <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                {stack.setup_order.map((step, i) => (
                  <li key={`${i}-${step.slice(0, 24)}`}>{step}</li>
                ))}
              </ol>
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {copy.sectionTools}
                </h3>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={selectAll}>
                    {copy.selectAll}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={selectNone}>
                    {copy.selectNone}
                  </Button>
                </div>
              </div>

              <ul className="space-y-3">
                {stack.tools.map((tool) => {
                  const dup = findVaultDuplicateForLibraryTool(entries, tool);
                  const checked = selectedIds.has(tool.id);
                  return (
                    <li
                      key={tool.id}
                      className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 p-3"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleId(tool.id, v === true)}
                        className="mt-0.5 shrink-0"
                        aria-label={tool.name}
                      />
                      <VaultLibraryToolThumb tool={tool} size={40} className="mt-0.5" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium leading-tight">{tool.name}</span>
                          {dup ? (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {copy.inVaultBadge}
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
                            {copy.visitTool}
                            <ExternalLink className="size-3" aria-hidden />
                          </a>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </ScrollArea>

        <SheetFooter className="border-t border-border/60 bg-background/80 p-4 backdrop-blur-sm">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={busy || stack.tools.length === 0}
              aria-busy={busy}
              aria-label={busy ? copy.depositing : copy.addEntireStack}
              onClick={() => depositTools(stack.tools)}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {copy.addEntireStack}
            </Button>
            <Button
              type="button"
              disabled={busy || selectedTools.length === 0}
              aria-busy={busy}
              aria-label={busy ? copy.depositing : copy.addSelected(selectedTools.length)}
              onClick={() => depositTools(selectedTools)}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {copy.addSelected(selectedTools.length)}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
