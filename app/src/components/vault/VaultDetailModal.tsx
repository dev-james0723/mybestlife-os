"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Pencil, Trash2, ExternalLink, Star, Sparkles } from "lucide-react";
import type { SoftwareVaultEntry } from "@/types/database";
import { formatDate, formatRelative } from "@/lib/utils/date";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import { useToggleDefaultStack } from "@/hooks/use-software-vault";

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
  const toggleDefault = useToggleDefaultStack();

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
            <DialogHeader>
              <div className="flex items-start justify-between gap-4 pr-10 sm:pr-12">
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
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" size="sm" onClick={onEdit} aria-label={copy.detail.edit}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onDelete} aria-label={copy.detail.delete}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{entry.status}</Badge>
              <Badge variant="outline">{entry.priority}</Badge>
              <Badge variant="outline">{costLabel(entry)}</Badge>
              <Button
                type="button"
                size="sm"
                variant={entry.is_default_stack ? "default" : "outline"}
                onClick={() =>
                  toggleDefault.mutate({ id: entry.id, isDefault: !entry.is_default_stack })
                }
                disabled={toggleDefault.isPending}
                className="ml-auto"
              >
                <Star className={`mr-1.5 h-3.5 w-3.5 ${entry.is_default_stack ? "fill-current" : ""}`} />
                {entry.is_default_stack ? copy.detail.removeFromDefaultStack : copy.detail.addToDefaultStack}
              </Button>
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
