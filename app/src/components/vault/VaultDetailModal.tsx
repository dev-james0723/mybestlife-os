"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Activity, Pencil, Trash2, ExternalLink, Star, Sparkles, Search } from "lucide-react";
import type { SoftwareVaultEntry } from "@/types/database";
import { formatDate, formatRelative } from "@/lib/utils/date";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import { useToggleDefaultStack } from "@/hooks/use-software-vault";
import { SoftwareProductResearchDialog } from "@/components/vault/SoftwareProductResearchDialog";
import { getVaultUsageCopy } from "@/lib/i18n/vault-usage-ui";

type RecordUseResponse = {
  launchCount: number;
  lastOpenedAt: string;
};

async function readRecordUseResponse(response: Response): Promise<RecordUseResponse> {
  const payload = await response.json().catch(() => null) as
    | (Partial<RecordUseResponse> & { error?: string; message?: string })
    | null;

  if (!response.ok || typeof payload?.launchCount !== "number" || !payload.lastOpenedAt) {
    throw new Error(payload?.message ?? payload?.error ?? "record_failed");
  }

  return {
    launchCount: payload.launchCount,
    lastOpenedAt: payload.lastOpenedAt,
  };
}

function costLabel(entry: SoftwareVaultEntry): string {
  if (entry.cost_type === "Free") return "Free";
  if (entry.cost_amount == null || Number.isNaN(Number(entry.cost_amount))) {
    return entry.cost_type;
  }
  const n = Number(entry.cost_amount);
  const period = entry.cost_period ? ` / ${entry.cost_period}` : "";
  return `$${n.toFixed(2)}${period}`;
}

type Props = {
  entry: SoftwareVaultEntry | null;
  entries: SoftwareVaultEntry[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSelectRelated: (id: string) => void;
};

export function VaultDetailModal({
  entry,
  entries,
  onClose,
  onEdit,
  onDelete,
  onSelectRelated,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);
  const usageCopy = getVaultUsageCopy(language);
  const toggleDefault = useToggleDefaultStack();
  const queryClient = useQueryClient();
  const [researchOpen, setResearchOpen] = useState(false);
  const [recordingUse, setRecordingUse] = useState(false);

  const relatedApps = useMemo(() => {
    if (!entry) return [];
    return entries
      .filter(
        (e) =>
          e.id !== entry.id &&
          ((entry.category && e.category === entry.category) ||
            (entry.default_tool_for && e.default_tool_for === entry.default_tool_for)),
      )
      .slice(0, 5);
  }, [entry, entries]);

  const aiFields = useMemo(() => new Set(entry?.ai_generated_fields ?? []), [entry]);

  const recordUse = async () => {
    if (!entry) return;
    setRecordingUse(true);
    try {
      const res = await fetch("/api/vault/usage/record", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entryId: entry.id,
          eventType: "used",
          contextType: "vault",
        }),
      });
      const recorded = await readRecordUseResponse(res);
      queryClient.setQueryData<SoftwareVaultEntry[]>(["software-vault"], (current) =>
        current?.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                launch_count: recorded.launchCount,
                last_opened_at: recorded.lastOpenedAt,
                updated_at: recorded.lastOpenedAt,
              }
            : item,
        ),
      );
      queryClient.setQueryData<SoftwareVaultEntry>(["software-vault", entry.id], (current) =>
        current
          ? {
              ...current,
              launch_count: recorded.launchCount,
              last_opened_at: recorded.lastOpenedAt,
              updated_at: recorded.lastOpenedAt,
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: ["software-vault"] });
      toast.success(`${usageCopy.recordSuccess}: ${recorded.launchCount}`);
    } catch (error) {
      toast.error(usageCopy.recordFailure, {
        description: error instanceof Error && error.message !== "record_failed"
          ? error.message
          : undefined,
      });
    } finally {
      setRecordingUse(false);
    }
  };

  const fieldBlock = (label: string, key: string, value: string | null | undefined) =>
    value ? (
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          {label}
          {aiFields.has(key) && (
            <Sparkles className="h-3 w-3 text-primary" aria-label={copy.add.aiGenerated} />
          )}
        </p>
        <p className="whitespace-pre-wrap text-sm">{value}</p>
      </div>
    ) : null;

  return (
    <Dialog open={!!entry} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent size="2xl" className="max-h-[85vh] overflow-y-auto">
        {entry && (
          <div className="space-y-6">
            <DialogHeader className="pr-14">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  {entry.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote app icon URL
                    <img
                      src={entry.icon_url}
                      alt={`${entry.app_name} icon`}
                      width={44}
                      height={44}
                      className="shrink-0 rounded-lg object-contain ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold text-muted-foreground">
                      {entry.app_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      {entry.app_name}
                      {entry.is_default_stack && (
                        <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-label={copy.detail.inDefaultStack} />
                      )}
                    </DialogTitle>
                    {entry.website_url && (
                      <a
                        href={entry.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 truncate text-xs text-primary hover:underline"
                      >
                        {entry.website_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div
                  className="flex w-fit shrink-0 items-center gap-1 rounded-xl border border-border/60 bg-muted/25 p-1"
                  aria-label={usageCopy.toolbar}
                  role="group"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setResearchOpen(true)}
                    aria-label={usageCopy.research}
                    title={usageCopy.research}
                    className="rounded-lg"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onEdit}
                    aria-label={copy.detail.edit}
                    title={copy.detail.edit}
                    className="rounded-lg"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    aria-label={copy.detail.delete}
                    title={copy.detail.delete}
                    className="rounded-lg"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{entry.status}</Badge>
                <Badge variant="outline">{entry.priority}</Badge>
                <Badge variant="outline">{costLabel(entry)}</Badge>
              </div>
              <div className="flex w-full flex-col items-start gap-2 min-[430px]:flex-row min-[430px]:flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant={entry.is_default_stack ? "default" : "outline"}
                  onClick={() =>
                    toggleDefault.mutate({ id: entry.id, isDefault: !entry.is_default_stack })
                  }
                  disabled={toggleDefault.isPending}
                  className="max-w-full justify-start"
                  data-testid="vault-default-stack-action"
                >
                  <Star className={`mr-1.5 h-3.5 w-3.5 ${entry.is_default_stack ? "fill-current" : ""}`} />
                  {entry.is_default_stack ? copy.detail.removeFromDefaultStack : copy.detail.addToDefaultStack}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void recordUse()}
                  disabled={recordingUse}
                  className="max-w-full justify-start"
                  data-testid="vault-record-use"
                  aria-label={`${usageCopy.recordUse}. ${usageCopy.useCount}: ${entry.launch_count ?? 0}`}
                >
                  <Activity className={`mr-1.5 h-3.5 w-3.5 ${recordingUse ? "animate-pulse" : ""}`} />
                  {recordingUse ? usageCopy.recordingUse : usageCopy.recordUse}
                  <span
                    className="ml-1 rounded-full bg-foreground/8 px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                    aria-live="polite"
                    data-testid="vault-use-count"
                  >
                    {entry.launch_count ?? 0}
                  </span>
                </Button>
              </div>
            </div>

            {entry.summary && (
              <p className="text-sm text-muted-foreground">{entry.summary}</p>
            )}

            <Separator />

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {fieldBlock(copy.fields.category, "category", entry.category)}
              {fieldBlock(copy.fields.platforms, "platforms", entry.platforms)}
              {fieldBlock(copy.fields.useCases, "use_cases", entry.use_cases)}
              {fieldBlock(copy.fields.defaultToolFor, "default_tool_for", entry.default_tool_for)}
            </div>

            {(entry.why_i_use_it || entry.best_feature || entry.biggest_downside) && (
              <>
                <Separator />
                <div className="space-y-4">
                  {fieldBlock(copy.fields.whyUseIt, "why_i_use_it", entry.why_i_use_it)}
                  {fieldBlock(copy.fields.bestFeature, "best_feature", entry.best_feature)}
                  {fieldBlock(copy.fields.biggestDownside, "biggest_downside", entry.biggest_downside)}
                </div>
              </>
            )}

            {(entry.best_alternative || entry.replaces || entry.tags) && (
              <>
                <Separator />
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  {fieldBlock(copy.fields.bestAlternative, "best_alternative", entry.best_alternative)}
                  {fieldBlock(copy.fields.replaces, "replaces", entry.replaces)}
                  {fieldBlock(copy.fields.tags, "tags", entry.tags)}
                </div>
              </>
            )}

            {relatedApps.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    {copy.detail.relatedApps}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {relatedApps.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onSelectRelated(r.id)}
                        className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs transition hover:bg-accent"
                      >
                        {r.icon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- remote app icon URL
                          <img src={r.icon_url} alt="" width={16} height={16} className="rounded-sm object-contain" />
                        ) : (
                          <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-muted text-[9px] font-semibold">
                            {r.app_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="truncate max-w-[120px]">{r.app_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {copy.detail.updatedAgo(formatRelative(entry.updated_at).replace(/^about\s+/, "").replace(/\s+ago$/, ""))}
              </span>
              <span className="opacity-70">{formatDate(entry.created_at)}</span>
            </div>

            <SoftwareProductResearchDialog
              open={researchOpen}
              onOpenChange={setResearchOpen}
              initialProductName={entry.app_name}
              initialTargetUrl={entry.website_url}
              existingVaultEntryId={entry.id}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export const ToolIntelligenceModal = VaultDetailModal;
