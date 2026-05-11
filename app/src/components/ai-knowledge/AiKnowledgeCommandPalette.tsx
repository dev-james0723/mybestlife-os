"use client";

import { useMemo, useState } from "react";
import { Command } from "cmdk";
import {
  Activity,
  BookMarked,
  ClipboardList,
  FolderTree,
  History,
  LibraryBig,
  Plus,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import {
  PROMPT_TOP_CATEGORIES,
  pickLocalizedText,
  type CustomPrompt,
  type LibraryPrompt,
  type PromptRun,
  type PromptTopCategory,
} from "@/types/prompt";
import type { PromptSurfaceTab } from "@/stores/prompt-store";

type AnyPrompt = LibraryPrompt | CustomPrompt;

interface AiKnowledgeCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  library: LibraryPrompt[];
  userPrompts: CustomPrompt[];
  recentRuns: PromptRun[];

  onSelectPrompt: (prompt: AnyPrompt) => void;
  onSwitchTab: (tab: PromptSurfaceTab) => void;
  onSelectTopCategory: (top: PromptTopCategory) => void;
  onCreatePrompt: () => void;
  onResetFilters: () => void;
}

const MAX_PROMPT_RESULTS = 20;
const MAX_RECENT_RESULTS = 5;

/**
 * Global command palette for AI Knowledge. Opens via ⌘K (bound in the
 * layout). cmdk handles fuzzy matching automatically when `shouldFilter` is
 * enabled; we supply `value` strings that combine title + tags + category for
 * good recall.
 */
export function AiKnowledgeCommandPalette({
  open,
  onOpenChange,
  library,
  userPrompts,
  recentRuns,
  onSelectPrompt,
  onSwitchTab,
  onSelectTopCategory,
  onCreatePrompt,
  onResetFilters,
}: AiKnowledgeCommandPaletteProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);
  const [query, setQuery] = useState("");

  const allPrompts = useMemo<AnyPrompt[]>(
    () => [...library, ...userPrompts],
    [library, userPrompts],
  );

  const recentPrompts = useMemo<AnyPrompt[]>(() => {
    const seen = new Set<string>();
    const out: AnyPrompt[] = [];
    for (const r of recentRuns) {
      const id = r.library_prompt_id ?? r.custom_prompt_id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const p =
        library.find((lp) => lp.id === id) ??
        userPrompts.find((up) => up.id === id);
      if (p) out.push(p);
      if (out.length >= MAX_RECENT_RESULTS) break;
    }
    return out;
  }, [recentRuns, library, userPrompts]);

  const runAndClose = (fn: () => void) => {
    fn();
    onOpenChange(false);
    setQuery("");
  };

  const tabs: Array<{
    id: PromptSurfaceTab;
    label: string;
    icon: typeof LibraryBig;
  }> = [
    { id: "library", label: ui.tabs.library, icon: LibraryBig },
    { id: "my_prompts", label: ui.tabs.myPrompts, icon: BookMarked },
    { id: "favorites", label: ui.tabs.favorites, icon: Star },
    { id: "recent", label: ui.tabs.recent, icon: History },
    { id: "activity", label: ui.tabs.activity, icon: Activity },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setQuery("");
      }}
    >
      <DialogContent
        className="p-0 overflow-hidden max-w-xl"
        showCloseButton={false}
      >
        <Command className="border-0" shouldFilter>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={ui.filters.searchPlaceholder}
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <Command.List className="max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              {ui.states.noSearchResultsTitle}
            </Command.Empty>

            <Command.Group
              heading={ui.header.createPrompt}
              className="px-1 py-1 text-[10px] uppercase tracking-wide text-muted-foreground"
            >
              <CommandItem
                value={`create ${ui.header.createPrompt}`}
                onSelect={() => runAndClose(onCreatePrompt)}
                icon={<Plus className="h-4 w-4" />}
                label={ui.header.createPrompt}
              />
              <CommandItem
                value={`clear filters ${ui.filters.clearFilters}`}
                onSelect={() => runAndClose(onResetFilters)}
                icon={<Sparkles className="h-4 w-4" />}
                label={ui.filters.clearFilters}
              />
            </Command.Group>

            <Command.Group
              heading={ui.tabs.library}
              className="px-1 py-1 text-[10px] uppercase tracking-wide text-muted-foreground"
            >
              {tabs.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`tab ${t.label}`}
                  onSelect={() => runAndClose(() => onSwitchTab(t.id))}
                  icon={<t.icon className="h-4 w-4" />}
                  label={t.label}
                />
              ))}
            </Command.Group>

            <Command.Group
              heading={ui.filters.allCategories}
              className="px-1 py-1 text-[10px] uppercase tracking-wide text-muted-foreground"
            >
              {PROMPT_TOP_CATEGORIES.map((top) => (
                <CommandItem
                  key={top}
                  value={`category ${ui.topCategoryLabels[top]}`}
                  onSelect={() => runAndClose(() => onSelectTopCategory(top))}
                  icon={<FolderTree className="h-4 w-4" />}
                  label={ui.topCategoryLabels[top]}
                />
              ))}
            </Command.Group>

            {recentPrompts.length > 0 && (
              <Command.Group
                heading={ui.tabs.recent}
                className="px-1 py-1 text-[10px] uppercase tracking-wide text-muted-foreground"
              >
                {recentPrompts.map((p) => (
                  <PromptCommandItem
                    key={p.id}
                    prompt={p}
                    language={language}
                    onSelect={() => runAndClose(() => onSelectPrompt(p))}
                    icon={<History className="h-4 w-4" />}
                  />
                ))}
              </Command.Group>
            )}

            {allPrompts.length > 0 && (
              <Command.Group
                heading={ui.pageTitle}
                className="px-1 py-1 text-[10px] uppercase tracking-wide text-muted-foreground"
              >
                {allPrompts.slice(0, MAX_PROMPT_RESULTS).map((p) => (
                  <PromptCommandItem
                    key={p.id}
                    prompt={p}
                    language={language}
                    onSelect={() => runAndClose(() => onSelectPrompt(p))}
                    icon={
                      p.source === "library" ? (
                        <LibraryBig className="h-4 w-4" />
                      ) : (
                        <ClipboardList className="h-4 w-4" />
                      )
                    }
                  />
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

interface CommandItemProps {
  value: string;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
  hint?: string;
}

function CommandItem({ value, onSelect, icon, label, hint }: CommandItemProps) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-muted"
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {hint && (
        <span className="text-[10px] text-muted-foreground shrink-0">
          {hint}
        </span>
      )}
    </Command.Item>
  );
}

interface PromptCommandItemProps {
  prompt: AnyPrompt;
  language: ReturnType<typeof useAppStore.getState>["language"];
  onSelect: () => void;
  icon: React.ReactNode;
}

function PromptCommandItem({
  prompt,
  language,
  onSelect,
  icon,
}: PromptCommandItemProps) {
  const title = pickLocalizedText(prompt.title_i18n, language);
  const searchValue = `${title} ${prompt.tags.join(" ")} ${prompt.top_category} ${prompt.source}`;
  return (
    <Command.Item
      value={searchValue}
      onSelect={onSelect}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-muted"
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="truncate flex-1">{title}</span>
      {prompt.tags[0] && (
        <span className="hidden sm:inline text-[10px] text-muted-foreground shrink-0">
          #{prompt.tags[0]}
        </span>
      )}
    </Command.Item>
  );
}
