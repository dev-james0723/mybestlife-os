"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Loader2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import type { AppCandidate } from "@/types/vault-smart-autofill";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: AppCandidate[];
  loading?: boolean;
  onSelect: (candidate: AppCandidate) => void;
  onManual: () => void;
  onRefine: () => void;
};

export function AppCandidatePickerModal({
  open,
  onOpenChange,
  candidates,
  loading,
  onSelect,
  onManual,
  onRefine,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language).identify;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh] pr-3">
            <div className="grid gap-2">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={cn(
                    "flex gap-3 rounded-lg border border-border p-3 text-left transition hover:bg-muted/60",
                  )}
                  onClick={() => onSelect(c)}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                    {c.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.icon_url} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="text-lg font-semibold text-muted-foreground">
                        {c.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      {c.company ? (
                        <span className="text-xs text-muted-foreground">{c.company}</span>
                      ) : null}
                      <Badge variant="outline" className="text-[10px]">
                        {copy.softwareTypes[c.software_type] ?? c.software_type}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {copy.confidence[c.confidence] ?? c.confidence}
                      </Badge>
                    </div>
                    {c.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {c.description}
                      </p>
                    ) : null}
                    {c.popularity_signal ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">{c.popularity_signal}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      {c.official_url ? (
                        <span className="inline-flex items-center gap-0.5 text-primary">
                          <ExternalLink className="h-3 w-3" />
                          {copy.officialSite}
                        </span>
                      ) : null}
                      {c.github_url ? (
                        <span className="text-muted-foreground">{copy.github}</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={onRefine}>
            {copy.refineSearch}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onManual}>
              {copy.manualEntry}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
