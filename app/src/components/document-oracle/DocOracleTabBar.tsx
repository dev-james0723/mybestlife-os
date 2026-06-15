"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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

const TAB_EASE = [0.22, 1, 0.36, 1] as const;

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
  reduceMotion,
  onSelect,
}: {
  id: DocOracleTabId;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  compact?: boolean;
  reduceMotion: boolean;
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
        "group relative isolate h-11 min-w-0 overflow-hidden rounded-xl",
        compact ? "w-full" : "w-full sm:flex-1",
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
              "z-[1] border-primary/45 text-primary-foreground",
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
      {active ? (
        <motion.span
          layoutId={compact ? "doc-oracle-tool-tab-pill" : "doc-oracle-primary-tab-pill"}
          className="absolute inset-0 rounded-xl bg-primary"
          transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: TAB_EASE }}
          aria-hidden
        />
      ) : null}
      <Icon
        className={cn(
          "relative z-[1] size-[17px] shrink-0",
          active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
        aria-hidden
      />
      <span className="relative z-[1] min-w-0 truncate text-center leading-tight">{label}</span>
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
  const reduceMotion = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  const activeTool = TOOL_TABS.some((tab) => tab.id === value);

  const handleSelect = (next: DocOracleTabId) => {
    onValueChange(next);
    setToolsOpen(false);
  };

  useEffect(() => {
    if (!toolsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setToolsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setToolsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [toolsOpen]);

  return (
    <div ref={rootRef} className="relative z-30 w-full min-w-0 shrink-0 overflow-visible">
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
          className="grid min-w-0 grid-cols-3 gap-1.5 sm:flex"
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
                reduceMotion={reduceMotion}
                onSelect={handleSelect}
              />
            );
          })}
          <button
            type="button"
            aria-expanded={toolsOpen}
            aria-haspopup="menu"
            aria-controls="doc-oracle-tools-menu"
            onClick={() => setToolsOpen((open) => !open)}
            className={cn(
              "inline-flex h-11 min-w-0 items-center justify-center rounded-xl border px-3 text-[12px] font-semibold transition",
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

      <AnimatePresence>
        {toolsOpen ? (
          <motion.div
            id="doc-oracle-tools-menu"
            role="tablist"
            aria-label="Doc Oracle tools"
            initial={reduceMotion ? false : { opacity: 0, y: -4, scale: 0.98 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: TAB_EASE }}
            className={cn(
              "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 grid min-w-0 grid-cols-2 gap-1.5 rounded-2xl border border-border bg-card/95 p-1.5",
              "shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl [-webkit-backdrop-filter:blur(18px)] sm:left-auto sm:w-[min(34rem,calc(100vw-2rem))] sm:grid-cols-3",
            )}
          >
            {TOOL_TABS.map((t) => (
              <DocOracleTabButton
                key={t.id}
                id={t.id}
                label={t.label}
                Icon={t.Icon}
                active={value === t.id}
                compact
                reduceMotion={reduceMotion}
                onSelect={handleSelect}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
