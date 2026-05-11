"use client";

import { cn } from "@/lib/utils";
import type { AICoachCopy } from "@/lib/i18n/ai-coach-ui";
import { AI_TOOLS } from "@/lib/ai/tool-registry";
import type { AITool, CompiledPromptMeta } from "@/types/ai-coach";

interface Props {
  copy: AICoachCopy;
  value: AITool;
  onChange: (t: AITool) => void;
  defaultAI: AITool;
  customConfigured: boolean;
  meta: CompiledPromptMeta;
}

export function AIToolStep({
  copy,
  value,
  onChange,
  defaultAI,
  customConfigured,
  meta,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{copy.flow.aiTool.title}</h2>
        <p className="text-sm text-muted-foreground">
          {copy.flow.aiTool.description}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {AI_TOOLS.map((t) => {
          const label = copy.tools[t.id] ?? t.name;
          const disabled = t.id === "custom" && !customConfigured;
          const active = value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => !disabled && onChange(t.id)}
              disabled={disabled}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                active
                  ? "border-foreground/50 bg-foreground/5"
                  : "border-border hover:border-foreground/30 hover:bg-muted/40",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <div
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: t.brand }}
                aria-hidden
              >
                {label.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{label}</p>
                {t.id === defaultAI ? (
                  <p className="text-[11px] text-muted-foreground">
                    {copy.flow.aiTool.useDefault(label)}
                  </p>
                ) : null}
                {t.id === "custom" && !customConfigured ? (
                  <p className="text-[11px] text-destructive">
                    {copy.flow.aiTool.customMissing}
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
        <p>
          {copy.flow.aiTool.charCount(meta.chars)} ·{" "}
          {copy.flow.aiTool.estimatedTokens(meta.approxTokens)}
        </p>
        <p className="mt-1">
          {value !== "custom" && meta.urlSupportsPrefill
            ? copy.flow.aiTool.prefillNote
            : copy.flow.aiTool.noPrefillNote}
        </p>
      </div>
    </div>
  );
}
