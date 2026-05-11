"use client";

import { useMemo, useState } from "react";
import { FileText, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDocuments } from "@/hooks/use-documents";
import { formatDateShort } from "@/lib/utils/date";
import { useAppStore } from "@/stores/app-store";
import { getResourcesUiCopy } from "@/lib/i18n/resources-ui";
import { cn } from "@/lib/utils";

export type DocumentPickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently linked document id, if any — highlighted in the list. */
  selectedId: string | null;
  /** Called with the chosen document id, or null when clearing the link. */
  onSelect: (id: string | null) => void;
};

/**
 * Modal for linking an asset to an existing Document.
 *
 * - Reuses the existing documents query (useDocuments) so we don't re-fetch.
 * - Local search by name + document_type + notes.
 * - Clicking a row selects and closes.
 * - "Clear selection" footer button unlinks and closes.
 */
export function DocumentPickerModal({
  open,
  onOpenChange,
  selectedId,
  onSelect,
}: DocumentPickerModalProps) {
  const language = useAppStore((s) => s.language);
  const copy = getResourcesUiCopy(language);
  const { data: documents } = useDocuments();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!documents) return [];
    if (!search.trim()) return documents;
    const q = search.toLowerCase();
    return documents.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.document_type?.toLowerCase().includes(q) ||
        d.notes?.toLowerCase().includes(q),
    );
  }, [documents, search]);

  const handleClose = () => {
    setSearch("");
    onOpenChange(false);
  };

  const handlePick = (id: string) => {
    onSelect(id);
    handleClose();
  };

  const handleClear = () => {
    onSelect(null);
    handleClose();
  };

  const hasAnyDocuments = (documents?.length ?? 0) > 0;
  const hasResults = filtered.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent
        size="xl"
        className="flex max-h-[85vh] flex-col overflow-hidden"
      >
        <DialogHeader>
          <DialogTitle>{copy.documentPicker.title}</DialogTitle>
        </DialogHeader>

        {hasAnyDocuments && (
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.documentPicker.searchPlaceholder}
              className="pl-9"
            />
          </div>
        )}

        <div className="-mx-6 mt-3 flex-1 overflow-y-auto px-6">
          {!hasAnyDocuments || !hasResults ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {copy.documentPicker.emptyTitle}
              </p>
              {!hasAnyDocuments && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.documentPicker.emptyDescription}
                </p>
              )}
            </div>
          ) : (
            <ul className="space-y-1.5 py-1">
              {filtered.map((d) => {
                const isSelected = d.id === selectedId;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(d.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                        "hover:border-[var(--accent-pink)]/40 hover:bg-muted/60",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
                        isSelected
                          ? "border-[var(--accent-pink)]/60 bg-[var(--accent-pink)]/8"
                          : "border-border",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-md",
                          isSelected
                            ? "bg-[var(--accent-pink)]/20 text-[var(--accent-pink)]"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {d.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {d.document_type ?? "—"}
                          {" · "}
                          {d.expiration_date
                            ? formatDateShort(d.expiration_date)
                            : copy.documentPicker.noExpiration}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="mt-3">
          {selectedId && (
            <Button variant="outline" onClick={handleClear}>
              <X className="size-4" />
              {copy.documentPicker.clearSelection}
            </Button>
          )}
          <Button variant="ghost" onClick={handleClose}>
            {copy.assetForm.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
