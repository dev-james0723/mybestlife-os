"use client";

import { useState } from "react";
import {
  BookOpen,
  FileText,
  Headphones,
  ImageIcon,
  Layers,
  ListTree,
  MessageCircle,
  MoreHorizontal,
  Network,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_TABS = [
  { id: "overview", label: "Overview", Icon: BookOpen },
  { id: "chat", label: "Chat", Icon: MessageCircle },
  { id: "pages", label: "Pages", Icon: Layers },
  { id: "sections", label: "Sections", Icon: ListTree },
  { id: "source", label: "Source", Icon: FileText },
] as const;

const TOOL_TABS = [
  { id: "mindMap", label: "Mind Map", Icon: Network },
  { id: "glossary", label: "Glossary", Icon: BookOpen },
  { id: "visuals", label: "Visuals", Icon: ImageIcon },
  { id: "infographic", label: "Infographic", Icon: Presentation },
  { id: "audio_summary", label: "Audio Summary", Icon: Headphones },
] as const;

export type DocOracleTabId = (typeof PRIMARY_TABS)[number]["id"] | (typeof TOOL_TABS)[number]["id"];

function DocOracleTabButton({
  id,
  label,
  Icon,
  active,
  compact = false,
  onSelect,
}: {
  id: DocOracleTabId;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  compact?: boolean;
  onSelect: (value: DocOracleTabId) => void;
}) {
  return (
    <button
      key={id}
      type="button"
      role="tab"
      aria-label={label}
      aria-selected={active}
      aria-controls={`doc-oracle-panel-${id}`}
      id={`doc-oracle-tab-${id}`}
      onClick={() => onSelect(id)}
      className={cn(
        "group relative isolate h-11 shrink-0 overflow-hidden rounded-xl",
        compact ? "min-w-[7.25rem]" : "min-w-[6.5rem] flex-1 sm:min-w-[7rem]",
        "inline-flex items-center justify-center gap-2 px-3",
        "touch-manipulation select-none text-[12px] font-semibold leading-tight tracking-tight",
        "border backdrop-blur-[18px] [-webkit-backdrop-filter:blur(18px)]",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-xl",
        "before:bg-gradient-to-br before:from-white/12 before:via-transparent before:to-transparent",
        active
          ? [
              "z-[1] border-primary/45 bg-primary text-primary-foreground",
              "shadow-[0_12px_28px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.25)]",
              "before:from-white/30 before:opacity-90",
            ]
          : [
              "z-0 border-border/70 bg-background/35 text-muted-foreground",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
              "hover:border-primary/25 hover:bg-primary/8 hover:text-foreground",
              "before:opacity-40",
            ],
      )}
    >
      <Icon
        className={cn(
          "relative z-[1] size-[17px] shrink-0",
          active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
        aria-hidden
      />
      <span className="relative z-[1] whitespace-nowrap text-center leading-tight">{label}</span>
    </button>
  );
}

export function DocOracleTabBar({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const activeTool = TOOL_TABS.some((tab) => tab.id === value);
  const showTools = toolsOpen || activeTool;

  const handleSelect = (next: DocOracleTabId) => {
    onValueChange(next);
    if (TOOL_TABS.some((tab) => tab.id === next)) setToolsOpen(false);
  };

  return (
    <div className="w-full min-w-0 shrink-0 space-y-2 overflow-visible">
      <div
        className={cn(
          "-mx-1 rounded-2xl border p-1.5 sm:mx-0 sm:rounded-[20px] sm:p-2",
          "border-border bg-card/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_34px_rgba(0,0,0,0.08)]",
          "backdrop-blur-[24px] [-webkit-backdrop-filter:blur(24px)]",
          "supports-[backdrop-filter]:bg-card/45",
        )}
      >
        <div
          role="tablist"
          aria-label="Doc Oracle primary navigation"
          className="flex min-w-0 gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {PRIMARY_TABS.map((t) => {
            const active = value === t.id;
            const { id, label, Icon } = t;
            return (
              <DocOracleTabButton
                key={id}
                id={id}
                label={label}
                Icon={Icon}
                active={active}
                onSelect={handleSelect}
              />
            );
          })}
          <button
            type="button"
            aria-expanded={showTools}
            onClick={() => setToolsOpen((open) => !open)}
            className={cn(
              "inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border px-3 text-[12px] font-semibold transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              activeTool
                ? "border-primary/45 bg-primary text-primary-foreground"
                : "border-border/70 bg-background/35 text-muted-foreground hover:border-primary/25 hover:bg-primary/8 hover:text-foreground",
            )}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
            <span className="ml-1 hidden sm:inline">More</span>
            <span className="sr-only">More Doc Oracle tools</span>
          </button>
        </div>
      </div>

      {showTools ? (
        <div
          role="tablist"
          aria-label="Doc Oracle tools"
          className="flex gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card/35 p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TOOL_TABS.map((t) => (
            <DocOracleTabButton
              key={t.id}
              id={t.id}
              label={t.label}
              Icon={t.Icon}
              active={value === t.id}
              compact
              onSelect={handleSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
