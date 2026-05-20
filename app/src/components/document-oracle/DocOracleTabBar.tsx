"use client";

import {
  BookOpen,
  FileText,
  Headphones,
  ImageIcon,
  Layers,
  ListTree,
  MessageCircle,
  Network,
  Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TAB_DEFS = [
  { id: "overview", label: "Overview", Icon: BookOpen },
  { id: "mindMap", label: "Mind Map", Icon: Network },
  { id: "chat", label: "Chat", Icon: MessageCircle },
  { id: "pages", label: "Pages", Icon: Layers },
  { id: "sections", label: "Sections", Icon: ListTree },
  { id: "glossary", label: "Glossary", Icon: BookOpen },
  { id: "visuals", label: "Visuals", Icon: ImageIcon },
  { id: "infographic", label: "Infographic", Icon: Presentation },
  { id: "audio_summary", label: "Audio Summary", Icon: Headphones },
  { id: "source", label: "Source", Icon: FileText },
] as const;

export type DocOracleTabId = (typeof TAB_DEFS)[number]["id"];

export function DocOracleTabBar({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="w-full min-w-0 shrink-0 overflow-visible pb-[env(safe-area-inset-bottom)]">
      <div
        role="tablist"
        aria-label="Doc Oracle"
        className={cn(
          "w-full rounded-[28px] border p-2",
          "border-black/10 bg-black/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_18px_50px_rgba(0,0,0,0.08)]",
          "backdrop-blur-[24px] [-webkit-backdrop-filter:blur(24px)]",
          "supports-[backdrop-filter]:bg-black/[0.028]",
          "dark:border-white/12 dark:bg-white/[0.055] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_18px_50px_rgba(0,0,0,0.22)]",
          "supports-[backdrop-filter]:dark:bg-white/[0.05]",
        )}
      >
        <div
          className={cn(
            "grid w-full min-w-0 grid-cols-2 gap-2",
            "md:grid-cols-5",
            "xl:grid-cols-10",
          )}
        >
          {TAB_DEFS.map((t) => {
            const active = value === t.id;
            const { id, label, Icon } = t;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-label={label}
                aria-selected={active}
                aria-controls={`doc-oracle-panel-${id}`}
                id={`doc-oracle-tab-${id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => onValueChange(id)}
                className={cn(
                  "group relative isolate min-h-[56px] w-full overflow-hidden rounded-2xl",
                  "md:min-h-[58px]",
                  "xl:min-h-[48px] xl:py-2.5",
                  "inline-flex items-center justify-center gap-2 px-3 py-3",
                  "touch-manipulation select-none text-[13px] font-semibold leading-tight tracking-tight",
                  "border backdrop-blur-[18px] [-webkit-backdrop-filter:blur(18px)]",
                  "transition-all duration-200 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8E53A]/70",
                  "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:opacity-100",
                  "before:bg-gradient-to-br before:from-white/12 before:via-transparent before:to-transparent",
                  "after:pointer-events-none after:absolute after:inset-x-2 after:top-0 after:h-px after:rounded-full",
                  "after:bg-gradient-to-r after:from-transparent after:via-white/25 after:to-transparent after:opacity-60",
                  active
                    ? [
                        "z-[1] border-[#C8E53A]/60 bg-[#C8E53A] text-black",
                        "shadow-[0_14px_34px_rgba(200,229,58,0.28),0_0_0_1px_rgba(200,229,58,0.12),inset_0_1px_0_rgba(255,255,255,0.45)]",
                        "before:from-white/30 before:opacity-90",
                        "after:via-white/40",
                      ]
                    : [
                        "z-0 border-black/10 bg-black/[0.035] text-black/[0.65]",
                        "shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
                        "hover:border-black/15 hover:bg-black/[0.055] hover:text-black",
                        "dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70",
                        "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                        "dark:hover:border-white/18 dark:hover:bg-white/[0.075] dark:hover:text-white",
                        "before:opacity-50 dark:before:from-white/10",
                        "after:opacity-40 dark:after:via-white/15",
                      ],
                )}
              >
                <Icon
                  className={cn(
                    "relative z-[1] size-[18px] shrink-0",
                    active ? "text-black" : "text-black/55 dark:text-white/70",
                  )}
                  aria-hidden
                />
                <span className="relative z-[1] text-center leading-tight whitespace-normal">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
