"use client";

import type { LifeAgentUiCopy, LifeAgentUploadIntentId } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentUploadIntent } from "@/lib/life-agent/upload-types";
import { cn } from "@/lib/utils";

const INTENT_ORDER: LifeAgentUploadIntent[] = [
  "extract_tasks",
  "save_as_note",
  "update_relationship",
  "create_asset",
  "summarize",
  "draft_message",
  "create_project",
  "create_document_record",
  "analyze_image_memory",
];

type UploadIntentPickerProps = {
  ui: LifeAgentUiCopy;
  selectedIntent: LifeAgentUploadIntent | null;
  onSelect: (intent: LifeAgentUploadIntent) => void;
  disabled?: boolean;
  className?: string;
};

export function UploadIntentPicker({
  ui,
  selectedIntent,
  onSelect,
  disabled = false,
  className,
}: UploadIntentPickerProps) {
  return (
    <section className={cn("space-y-2", className)} aria-labelledby="upload-intent-heading">
      <h3 id="upload-intent-heading" className="text-sm font-semibold">
        {ui.uploadIntentPrompt}
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {INTENT_ORDER.map((intent) => (
          <button
            key={intent}
            type="button"
            disabled={disabled}
            aria-pressed={selectedIntent === intent}
            onClick={() => onSelect(intent)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
              selectedIntent === intent
                ? "border-primary/40 bg-primary/10"
                : "border-border/60 bg-background/50 hover:border-primary/30 hover:bg-primary/5",
              disabled && "opacity-60",
            )}
          >
            <span className="font-medium">
              {ui.uploadIntentLabels[intent as LifeAgentUploadIntentId]}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {ui.uploadIntentDescriptions[intent as LifeAgentUploadIntentId]}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
