"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileTypeIcon } from "@/components/career-vault/FileTypeIcon";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/career-vault/utils";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type {
  CareerVaultCategory,
  CareerVaultFile,
} from "@/types/career-vault";

interface BundleFileSelectorProps {
  copy: CareerVaultCopy;
  allFiles: CareerVaultFile[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  suggestedCategories?: CareerVaultCategory[];
}

export function BundleFileSelector({
  copy,
  allFiles,
  selectedIds,
  onChange,
  suggestedCategories,
}: BundleFileSelectorProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [search, setSearch] = useState("");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const fileById = useMemo(() => {
    const map = new Map<string, CareerVaultFile>();
    for (const f of allFiles) map.set(f.id, f);
    return map;
  }, [allFiles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allFiles.filter((f) => {
      if (categoryFilter !== "__all__" && f.category !== categoryFilter) {
        return false;
      }
      if (q && !f.filename.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allFiles, categoryFilter, search]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = selectedIds.indexOf(String(active.id));
    const to = selectedIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onChange(arrayMove(selectedIds, from, to));
  };

  const orderedSelected = selectedIds
    .map((id) => fileById.get(id))
    .filter((f): f is CareerVaultFile => !!f);

  const categoryOptions = Object.keys(copy.categories) as CareerVaultCategory[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">
          <Label>{copy.bundles.wizard.filterByCategory}</Label>
          <Select
            value={categoryFilter}
            onValueChange={(v) => v && setCategoryFilter(v)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                {copy.bundles.wizard.allCategories}
              </SelectItem>
              {suggestedCategories && suggestedCategories.length > 0 ? (
                <>
                  {suggestedCategories.map((c) => (
                    <SelectItem key={`sg-${c}`} value={c}>
                      ⭐ {copy.categories[c]}
                    </SelectItem>
                  ))}
                </>
              ) : null}
              {categoryOptions
                .filter((c) => !(suggestedCategories ?? []).includes(c))
                .map((c) => (
                  <SelectItem key={c} value={c}>
                    {copy.categories[c]}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px] flex-1">
          <Label>{copy.searchPlaceholder}</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1"
            placeholder={copy.searchPlaceholder}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {copy.bundles.wizard.selectFilesHint} ·{" "}
        {copy.bundles.wizard.selectedCount(selectedIds.length)}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Candidate list */}
        <div className="max-h-[420px] overflow-auto rounded-lg border">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">
              {copy.empty.noResultsTitle}
            </p>
          ) : (
            <ul className="divide-y">
              {filtered.map((f) => {
                const selected = selectedSet.has(f.id);
                return (
                  <li
                    key={f.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <Checkbox
                      id={`bundle-file-${f.id}`}
                      checked={selected}
                      onCheckedChange={() => toggle(f.id)}
                    />
                    <FileTypeIcon mime={f.mime_type} className="h-4 w-4 shrink-0" />
                    <Label
                      htmlFor={`bundle-file-${f.id}`}
                      className="flex-1 cursor-pointer truncate font-normal"
                      title={f.filename}
                    >
                      {f.filename}
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      {copy.categories[f.category]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatFileSize(f.file_size)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Selected + reorder */}
        <div className="rounded-lg border">
          <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
            <span>{copy.bundles.wizard.reorderHint}</span>
            <span>{copy.bundles.wizard.selectedCount(orderedSelected.length)}</span>
          </div>
          {orderedSelected.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">
              {copy.empty.noResultsTitle}
            </p>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext
                items={orderedSelected.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="max-h-[420px] divide-y overflow-auto">
                  {orderedSelected.map((f, i) => (
                    <SortableRow
                      key={f.id}
                      file={f}
                      index={i + 1}
                      copyCategoryLabel={copy.categories[f.category]}
                      onRemove={() => toggle(f.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}

interface SortableRowProps {
  file: CareerVaultFile;
  index: number;
  copyCategoryLabel: string;
  onRemove: () => void;
}

function SortableRow({
  file,
  index,
  copyCategoryLabel,
  onRemove,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 bg-card px-3 py-2 text-sm",
        isDragging && "shadow-md",
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 text-right text-xs text-muted-foreground">
        {index}
      </span>
      <FileTypeIcon mime={file.mime_type} className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate" title={file.filename}>
        {file.filename}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {copyCategoryLabel}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}
