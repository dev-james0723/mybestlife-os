"use client";

import { useMemo, useState } from "react";
import { Check, FileText, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useCareerVaultFiles } from "@/hooks/use-career-vault";
import { cn } from "@/lib/utils";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";

interface VaultFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: CareerVaultCopy;
  currentIds: string[];
  onSave: (ids: string[]) => void;
}

export function VaultFilePicker({
  open,
  onOpenChange,
  copy,
  currentIds,
  onSave,
}: VaultFilePickerProps) {
  const filesQuery = useCareerVaultFiles();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Set<string>>(() => new Set(currentIds));

  const files = useMemo(
    () => filesQuery.data ?? [],
    [filesQuery.data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return files;
    return files.filter(
      (f) =>
        f.filename.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q),
    );
  }, [files, search]);

  const toggle = (id: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    onSave(Array.from(draft));
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setDraft(new Set(currentIds));
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{copy.pipeline.detail.addFromVault}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.searchPlaceholder}
            />
          </div>

          <ul className="max-h-[360px] divide-y overflow-auto rounded-md border">
            {filtered.length === 0 ? (
              <li className="p-6 text-center text-xs text-muted-foreground">
                {copy.bundles.detail.noFiles}
              </li>
            ) : (
              filtered.map((f) => {
                const checked = draft.has(f.id);
                return (
                  <li
                    key={f.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40",
                      checked && "bg-primary/5",
                    )}
                    onClick={() => toggle(f.id)}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(f.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {f.filename}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {copy.categories[f.category]}
                      </p>
                    </div>
                    {checked ? (
                      <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {copy.bundles.wizard.selectedCount(draft.size)}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {copy.bundles.wizard.cancel}
            </Button>
            <Button onClick={handleSave}>{copy.bundles.wizard.finish}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
