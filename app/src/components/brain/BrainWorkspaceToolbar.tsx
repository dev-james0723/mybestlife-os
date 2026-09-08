"use client";

import { memo, useId, useMemo, useState } from "react";
import { Expand, Globe, List, Maximize2, Minimize2, Network, Search, Settings2, Shrink, Target, X } from "lucide-react";
import { useBrainStore } from "@/stores/brain-store";
import { cn } from "@/lib/utils";
import { NODE_TYPE_LABEL } from "@/lib/knowledge/constellation/constants";
import type { ConstellationNode } from "@/types/constellation";
import { useBrainCopy } from "./useBrainCopy";
import styles from "./brain-workspace.module.css";

export type BrainWorkspacePanel = "settings" | "list" | "help" | null;

export const BrainWorkspaceToolbar = memo(function BrainWorkspaceToolbar({
  nodes, onFocusNode, focusMode, fullscreen, onToggleFocus, onToggleFullscreen, panel, onPanelChange,
}: {
  nodes: ConstellationNode[];
  onFocusNode: (id: string) => void;
  focusMode: boolean;
  fullscreen: boolean;
  onToggleFocus: () => void;
  onToggleFullscreen: () => void;
  panel: BrainWorkspacePanel;
  onPanelChange: (panel: BrainWorkspacePanel) => void;
}) {
  const b = useBrainCopy();
  const mode = useBrainStore(s => s.mode);
  const setMode = useBrainStore(s => s.setMode);
  const search = useBrainStore(s => s.search);
  const setSearch = useBrainStore(s => s.setSearch);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const matches = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    if (!q) return [];
    return nodes.filter(n => [n.label, n.description, n.category, ...(n.tags ?? [])].some(v => v?.toLocaleLowerCase().includes(q))).slice(0, 12);
  }, [nodes, search]);
  const choose = (node: ConstellationNode) => { onFocusNode(node.id); setOpen(false); };
  const actionClass = "flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground aria-pressed:bg-primary/15 aria-pressed:text-foreground";
  return (
    <div className={styles.toolbar} aria-label={b("Graph settings")}>
      <div className={cn(styles.search, "flex items-center gap-1")}>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden />
          <input
            className="h-11 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-11 text-sm outline-none"
            role="combobox" aria-label={b("Search your Brain")} aria-autocomplete="list" aria-expanded={open && !!search.trim()}
            aria-controls={listId} aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
            placeholder={b("Search your Brain")} value={search}
            onChange={e => { setSearch(e.target.value); setActive(0); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={e => { if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) setOpen(false); }}
            onKeyDown={e => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault(); setOpen(true);
                setActive(i => Math.max(0, Math.min(matches.length - 1, i + (e.key === "ArrowDown" ? 1 : -1))));
              } else if (e.key === "Enter" && open && matches[active]) { e.preventDefault(); choose(matches[active]); }
              else if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
            }}
          />
          {!!search && <button className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-xl" aria-label={b("Clear search")} onClick={() => { setSearch(""); setOpen(false); }}><X className="size-4" /></button>}
          {open && !!search.trim() && <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-[min(42dvh,360px)] overflow-y-auto rounded-xl border border-border bg-background p-1 shadow-xl">
            <ul id={listId} role="listbox" aria-label={b("Search results")}>
              {matches.map((n, i) => <li role="option" aria-selected={active === i} id={`${listId}-${i}`} key={n.id}>
                <button className={cn("flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-muted", active === i && "bg-muted")}
                  onPointerDown={e => e.preventDefault()} onClick={() => choose(n)}>
                  <span className="min-w-0 flex-1 truncate">{n.label}</span><span className="text-[10px] text-muted-foreground">{b(NODE_TYPE_LABEL[n.type])}</span>
                </button>
              </li>)}
            </ul>
            {!matches.length && <p className="p-3 text-sm text-muted-foreground" role="status">{b("No matching nodes")}</p>}
          </div>}
        </div>
        <button className={actionClass} aria-label={b("Browse nodes")} title={b("Browse nodes")} aria-pressed={panel === "list"} onClick={() => onPanelChange(panel === "list" ? null : "list")}><List className="size-4" /></button>
      </div>
      <div className={styles.modes} role="group" aria-label={b("Graph mode")}>
        {([{ key: "global", label: "Overview", short: "Map", icon: Network }, { key: "local", label: "Neighborhood", short: "Local", icon: Target }, { key: "sphere_3d", label: "Sphere", short: "3D", icon: Globe }] as const).map(({ key, label, short, icon: Icon }) => (
          <button key={key} aria-pressed={mode === key} aria-label={b(label)} title={b(label)} onClick={() => setMode(key)}
            className="flex min-w-11 items-center justify-center gap-1.5 rounded-[10px] px-3 text-xs text-muted-foreground hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm">
            <Icon className="hidden size-4 sm:block" aria-hidden /><span className="hidden sm:inline">{b(label)}</span><span className="sm:hidden">{b(short)}</span>
          </button>
        ))}
      </div>
      <div className={styles.actions}>
        <button className={actionClass} onClick={onToggleFocus} aria-pressed={focusMode} aria-label={b(focusMode ? "Exit focus mode" : "Focus mode")} title={b(focusMode ? "Exit focus mode" : "Focus mode")}>{focusMode ? <Shrink className="size-4" /> : <Expand className="size-4" />}</button>
        <button className={actionClass} onClick={onToggleFullscreen} aria-pressed={fullscreen} aria-label={b(fullscreen ? "Exit fullscreen" : "Fullscreen")} title={b(fullscreen ? "Exit fullscreen" : "Fullscreen")}>{fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button>
        <button className={actionClass} onClick={() => onPanelChange(panel === "settings" ? null : "settings")} aria-pressed={panel === "settings"} aria-label={b("Graph settings")} title={b("Graph settings")}><Settings2 className="size-4" /></button>
      </div>
    </div>
  );
});
