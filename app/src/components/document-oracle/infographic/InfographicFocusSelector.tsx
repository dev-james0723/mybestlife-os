"use client";

import { cn } from "@/lib/utils";

export type InfographicFocusOptionCard = {
  id: string;
  label: string;
  description: string;
  recommended_styles?: string[];
  source_pages?: number[];
  source_sections?: string[];
};

export function InfographicFocusSelector(props: {
  options: InfographicFocusOptionCard[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  if (props.options.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Focus</p>
      <div className="flex max-h-[min(52vh,520px)] flex-col gap-2 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
        {props.options.map((o) => {
          const on = props.selectedIds.has(o.id);
          const badges = (o.recommended_styles ?? []).filter((s): s is string => typeof s === "string" && s.length > 0);
          return (
            <button
              key={o.id}
              type="button"
              disabled={props.disabled}
              onClick={() => props.onToggle(o.id)}
              className={cn(
                "touch-manipulation rounded-2xl border p-3 text-left transition",
                on
                  ? "border-[#C8E53A]/70 bg-[#C8E53A]/10"
                  : "border-border bg-muted/35 hover:border-white/15",
                props.disabled && "pointer-events-none opacity-50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold text-foreground">{o.label}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    on ? "bg-[#C8E53A]/25 text-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {on ? "Selected" : "Tap"}
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{o.description}</p>
              {o.source_pages?.length ? (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Pages: {o.source_pages.slice(0, 12).map((p) => `p.${p}`).join(", ")}
                </p>
              ) : null}
              {badges.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {badges.slice(0, 4).map((b) => (
                    <span key={b} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {b.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
