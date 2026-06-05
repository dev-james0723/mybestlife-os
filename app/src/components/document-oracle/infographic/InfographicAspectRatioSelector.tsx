"use client";

import { cn } from "@/lib/utils";

const OPTIONS: { id: "16:9" | "9:16" | "4:3" | "1:1"; label: string; hint: string }[] = [
  { id: "16:9", label: "16:9", hint: "Presentation" },
  { id: "9:16", label: "9:16", hint: "Story / Reel" },
  { id: "4:3", label: "4:3", hint: "Slide" },
  { id: "1:1", label: "1:1", hint: "Social Post" },
];

export function InfographicAspectRatioSelector(props: {
  value: (typeof OPTIONS)[number]["id"];
  onChange: (v: (typeof OPTIONS)[number]["id"]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Aspect ratio</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => {
          const active = props.value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              disabled={props.disabled}
              onClick={() => props.onChange(o.id)}
              className={cn(
                "touch-manipulation rounded-xl border px-3 py-2 text-left text-[12px] transition",
                active
                  ? "border-primary/45 bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/25",
                props.disabled && "pointer-events-none opacity-50",
              )}
            >
              <span className="block font-semibold text-foreground">{o.label}</span>
              <span className="block text-[11px] text-muted-foreground">{o.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
