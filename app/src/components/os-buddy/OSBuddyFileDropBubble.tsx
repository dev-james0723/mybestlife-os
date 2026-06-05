"use client";

import type { ComponentType, CSSProperties } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Layers2,
  Lightbulb,
  Loader2,
  Music,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatOSBuddyFileSize,
  groupOSBuddyDroppedFilesByKind,
  OS_BUDDY_DROP_DESTINATION_LABELS,
  OS_BUDDY_FILE_KIND_LABELS,
  type OSBuddyDropDestination,
  type OSBuddyDroppedFileItem,
  type OSBuddyDroppedFileKind,
  type OSBuddyDroppedFileStatus,
} from "@/lib/os-buddy/os-buddy-file-drop";

type OSBuddyFileDropBubbleProps = {
  items: OSBuddyDroppedFileItem[];
  horizontal?: "left" | "right" | "center";
  vertical?: "above" | "below";
  isRouting: boolean;
  onDestinationChange: (id: string, destination: OSBuddyDropDestination) => void;
  onRemove: (id: string) => void;
  onCancel: () => void;
  onSave: () => void;
  fixedStyle?: CSSProperties;
};

const DESTINATION_OPTIONS: Array<{
  id: OSBuddyDropDestination;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "knowledge", icon: Database },
  { id: "idea", icon: Lightbulb },
  { id: "both", icon: Layers2 },
];

const KIND_ICONS: Record<OSBuddyDroppedFileKind, ComponentType<{ className?: string }>> = {
  document: FileText,
  image: ImageIcon,
  audio: Music,
  video: Video,
  spreadsheet: FileSpreadsheet,
  unknown: FileQuestion,
};

const STATUS_LABELS: Record<OSBuddyDroppedFileStatus, string> = {
  queued: "Queued",
  uploading: "Uploading",
  saving: "Saving",
  done: "Done",
  failed: "Failed",
};

function isProcessing(status: OSBuddyDroppedFileStatus) {
  return status === "uploading" || status === "saving";
}

function StatusPill({ status }: { status: OSBuddyDroppedFileStatus }) {
  const busy = isProcessing(status);
  const failed = status === "failed";
  const done = status === "done";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none",
        done && "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        failed && "border-destructive/35 bg-destructive/12 text-destructive",
        busy && "border-primary/30 bg-primary/10 text-primary",
        status === "queued" && "border-border bg-muted/45 text-muted-foreground",
      )}
    >
      {busy ? (
        <Loader2 className="size-3 animate-spin" aria-hidden />
      ) : done ? (
        <CheckCircle2 className="size-3" aria-hidden />
      ) : failed ? (
        <AlertTriangle className="size-3" aria-hidden />
      ) : null}
      {STATUS_LABELS[status]}
    </span>
  );
}

function FileRow({
  item,
  onDestinationChange,
  onRemove,
}: {
  item: OSBuddyDroppedFileItem;
  onDestinationChange: (id: string, destination: OSBuddyDropDestination) => void;
  onRemove: (id: string) => void;
}) {
  const KindIcon = KIND_ICONS[item.kind];
  const locked = isProcessing(item.status) || item.status === "done";
  const removable = item.status === "queued" || item.status === "failed";

  return (
    <li className="os-buddy-file-drop-row">
      <div className="flex min-w-0 items-start gap-2">
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/70",
            item.status === "failed" && "border-destructive/30 bg-destructive/10",
          )}
          aria-hidden
        >
          <KindIcon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="min-w-0 max-w-full truncate text-[12px] font-bold leading-snug">
              {item.name}
            </p>
            <StatusPill status={item.status} />
          </div>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
            {OS_BUDDY_FILE_KIND_LABELS[item.kind]} · {formatOSBuddyFileSize(item.size)}
          </p>
          {item.error ? (
            <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-destructive">
              {item.error}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="size-6 shrink-0"
          aria-label={`Remove ${item.name}`}
          disabled={!removable}
          onClick={() => onRemove(item.id)}
        >
          <X className="size-3" aria-hidden />
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1">
        {DESTINATION_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = item.destination === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={locked}
              aria-pressed={active}
              onClick={() => onDestinationChange(item.id, option.id)}
              className={cn(
                "inline-flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-extrabold leading-tight",
                "transition-[background-color,border-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-not-allowed disabled:opacity-55",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              <Icon className="size-3 shrink-0" aria-hidden />
              <span className="min-w-0 whitespace-normal text-center leading-[1.05]">
                {OS_BUDDY_DROP_DESTINATION_LABELS[option.id]}
              </span>
            </button>
          );
        })}
      </div>
    </li>
  );
}

export function OSBuddyFileDropBubble({
  items,
  horizontal = "center",
  vertical = "above",
  isRouting,
  onDestinationChange,
  onRemove,
  onCancel,
  onSave,
  fixedStyle,
}: OSBuddyFileDropBubbleProps) {
  const groups = groupOSBuddyDroppedFilesByKind(items);
  const doneCount = items.filter((item) => item.status === "done").length;
  const failedCount = items.filter((item) => item.status === "failed").length;
  const pendingCount = items.filter((item) => item.status !== "done").length;
  const saveDisabled = isRouting || items.length === 0 || pendingCount === 0;
  const saveLabel =
    failedCount > 0 && pendingCount === failedCount
      ? "Retry failed"
      : isRouting
        ? "Saving..."
          : pendingCount === 0
            ? "Saved"
            : `Save ${pendingCount}`;
  const cancelLabel = pendingCount === 0 ? "Close" : "Cancel";

  return (
    <div
      className="os-buddy-pixel-bubble os-buddy-file-drop-bubble"
      data-kind="file-drop"
      data-horizontal={horizontal}
      data-vertical={vertical}
      data-fixed={fixedStyle ? "true" : undefined}
      style={fixedStyle}
      role="dialog"
      aria-label="OSBuddy file routing"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black leading-none tracking-normal">I got it</h2>
          <p className="mt-1 text-[11px] font-medium leading-snug text-muted-foreground">
            Choose where {items.length === 1 ? "this file" : "these files"} should go.
          </p>
        </div>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="size-7 shrink-0"
          aria-label="Close OSBuddy file routing"
          disabled={isRouting}
          onClick={onCancel}
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {groups.map((group, index) => (
          <section key={group.kind} className={cn(index > 0 && "mt-3")}>
            {items.length > 1 ? (
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase leading-none tracking-normal text-muted-foreground">
                  {OS_BUDDY_FILE_KIND_LABELS[group.kind]}
                </p>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {group.files.length}
                </span>
              </div>
            ) : null}
            <ul className="space-y-2">
              {group.files.map((item) => (
                <FileRow
                  key={item.id}
                  item={item}
                  onDestinationChange={onDestinationChange}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2">
        <span className="text-[10px] font-semibold text-muted-foreground">
          {doneCount > 0 ? `${doneCount} done` : `${items.length} queued`}
          {failedCount > 0 ? ` · ${failedCount} failed` : ""}
        </span>
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="ghost" size="xs" disabled={isRouting} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" size="xs" disabled={saveDisabled} onClick={onSave}>
            {isRouting ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
