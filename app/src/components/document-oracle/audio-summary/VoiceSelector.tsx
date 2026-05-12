"use client";

import { cn } from "@/lib/utils";

export function VoiceSelector(props: {
  value: "male" | "female";
  onChange: (v: "male" | "female") => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Voice</p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "male" as const, label: "Male voice" },
            { id: "female" as const, label: "Female voice" },
          ] as const
        ).map((o) => {
          const active = props.value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              disabled={props.disabled}
              onClick={() => props.onChange(o.id)}
              className={cn(
                "min-h-[44px] flex-1 rounded-xl border px-3 py-2 text-[12px] font-medium transition sm:flex-none sm:px-6",
                active
                  ? "border-[#C8E53A]/70 bg-[#C8E53A]/12 text-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-white/18",
                props.disabled && "pointer-events-none opacity-50",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
