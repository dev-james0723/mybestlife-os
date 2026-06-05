"use client";

import { cn } from "@/lib/utils";
import { INFOGRAPHIC_STYLE_PRESETS, type InfographicStyle } from "@/lib/document-brain/infographicStyles";

export function InfographicStyleSelector(props: {
  value: InfographicStyle;
  onChange: (v: InfographicStyle) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Style</p>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {INFOGRAPHIC_STYLE_PRESETS.map((p) => {
          const active = props.value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={props.disabled}
              onClick={() => props.onChange(p.id)}
              className={cn(
                "touch-manipulation rounded-2xl border p-3 text-left text-[12px] transition",
                active
                  ? "border-primary/45 bg-primary/10 text-primary"
                  : "border-border bg-muted/35 text-muted-foreground hover:border-primary/25",
                props.disabled && "pointer-events-none opacity-50",
              )}
            >
              <p className="font-semibold text-foreground">{p.label}</p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{p.description}</p>
              <p className="mt-1 text-[10px] text-muted-foreground/90">Best for: {p.bestFor}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
