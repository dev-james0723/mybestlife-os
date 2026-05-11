"use client";

import { useMemo, useState } from "react";
import { Check, X, FileSearch } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCareerVaultFiles } from "@/hooks/use-career-vault";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import type { CareerVaultCategory, CareerVaultFile } from "@/types/database";

interface Props {
  label: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Optional vault category filter so the picker surfaces sensible results. */
  categoryHint?: CareerVaultCategory;
}

export function MasterDocumentSelector({
  label,
  selectedId,
  onSelect,
  categoryHint,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).profile.linked;

  const filesQ = useCareerVaultFiles();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [restrict, setRestrict] = useState(!!categoryHint);

  const files = useMemo(() => filesQ.data ?? [], [filesQ.data]);
  const selected = files.find((f) => f.id === selectedId) ?? null;

  const filtered = useMemo<CareerVaultFile[]>(() => {
    const q = search.trim().toLowerCase();
    return files.filter((f) => {
      if (restrict && categoryHint && f.category !== categoryHint) return false;
      if (!q) return true;
      return (
        f.filename.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [files, search, restrict, categoryHint]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(true)}
            aria-label={copy.selectFromVault}
          >
            <FileSearch className="mr-1 h-4 w-4" />
            {copy.selectFromVault}
          </Button>
          {selected ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect(null)}
              aria-label={copy.clear}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="rounded-lg border bg-background/50 p-2 text-sm">
        {selected ? (
          <div className="truncate">{selected.filename}</div>
        ) : (
          <span className="text-muted-foreground">{copy.notSet}</span>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
            />
            {categoryHint ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={restrict}
                  onChange={(e) => setRestrict(e.target.checked)}
                />
                {copy.filter(categoryHint)}
              </label>
            ) : null}
            <ul className="max-h-[50vh] overflow-y-auto rounded-lg border">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {copy.notSet}
                </li>
              ) : (
                filtered.map((f) => {
                  const isSelected = selectedId === f.id;
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(f.id);
                          setOpen(false);
                        }}
                        className="flex w-full items-center gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-accent/40"
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center">
                          {isSelected ? <Check className="h-4 w-4" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {f.filename}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {f.category}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
