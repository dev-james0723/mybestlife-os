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
        className="w-full rounded-2xl border border-white/10 bg-white/[0.06] p-1.5 shadow-inner backdrop-blur-xl [-webkit-backdrop-filter:blur(24px)]"
      >
        <div className="relative">
          <div
            className={cn(
              "grid w-full min-w-0 grid-cols-2 gap-1.5",
              "sm:flex sm:flex-nowrap sm:gap-1.5 sm:overflow-x-auto sm:overflow-y-visible sm:overscroll-x-contain sm:pb-0.5",
              "sm:[-webkit-overflow-scrolling:touch] sm:[scrollbar-width:thin] sm:[scrollbar-color:rgba(255,255,255,0.22)_transparent]",
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
                    "touch-manipulation select-none",
                    "inline-flex flex-row items-center justify-center gap-2",
                    "rounded-xl px-3 py-2 text-[12px] font-medium leading-none",
                    "transition-colors duration-150",
                    "min-h-[48px]",
                    "max-sm:w-full max-sm:justify-center",
                    id === "audio_summary" && "max-sm:col-span-2",
                    "sm:flex-none sm:shrink-0 sm:w-auto sm:min-w-max",
                    active
                      ? "bg-[#C8E53A] text-black shadow-sm"
                      : "text-white/60 hover:bg-white/[0.08] hover:text-white",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap text-center leading-none">{label}</span>
                </button>
              );
            })}
          </div>

          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-[1] hidden w-7 bg-gradient-to-r from-black/35 to-transparent sm:block"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-[1] hidden w-7 bg-gradient-to-l from-black/35 to-transparent sm:block"
            aria-hidden
          />
        </div>

        <p
          className="hidden px-1 pt-1.5 text-center text-[10px] leading-snug text-white/45 sm:block lg:hidden"
          aria-hidden
        >
          Swipe tabs →
        </p>
      </div>
    </div>
  );
}
