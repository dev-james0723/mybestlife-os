"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useKnowledgeStore,
  type KnowledgeQuickFilter,
  type KnowledgeSortKey,
} from "@/stores/knowledge-store";
import { CONTENT_TYPES, typeColors } from "@/types/knowledge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Columns3,
  GitBranch,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  Search,
  Sparkles,
  Table,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";

function looksLikeQuestion(q: string): boolean {
  const lower = q.toLowerCase().trim();
  return lower.includes("?") || /^(what|how|find|show|list|tell|who|why|when)\b/.test(lower);
}

const QUICK_ICONS: Record<
  KnowledgeQuickFilter,
  React.ComponentType<{ className?: string }>
> = {
  recent: Clock,
  social: Users,
  github: GitBranch,
  hasMedia: ImageIcon,
  hasSource: Link2,
  aiGenerated: Sparkles,
  needsReview: AlertTriangle,
};

const SORT_KEYS: KnowledgeSortKey[] = [
  "latest",
  "updated",
  "relevance",
  "linked",
  "titleAZ",
  "contentType",
  "sourceDate",
];

export function KnowledgeTopControlBar() {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const common = getCommonUiCopy(language);

  const searchQuery = useKnowledgeStore((s) => s.searchQuery);
  const setSearchQuery = useKnowledgeStore((s) => s.setSearchQuery);
  const activeTypeFilters = useKnowledgeStore((s) => s.activeTypeFilters);
  const toggleTypeFilter = useKnowledgeStore((s) => s.toggleTypeFilter);
  const clearTypeFilters = useKnowledgeStore((s) => s.clearTypeFilters);
  const activeQuickFilters = useKnowledgeStore((s) => s.activeQuickFilters);
  const toggleQuickFilter = useKnowledgeStore((s) => s.toggleQuickFilter);
  const sortBy = useKnowledgeStore((s) => s.sortBy);
  const setSortBy = useKnowledgeStore((s) => s.setSortBy);
  const currentView = useKnowledgeStore((s) => s.currentView);
  const setView = useKnowledgeStore((s) => s.setView);
  const openAIPanel = useKnowledgeStore((s) => s.openAIPanel);

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleChange = useCallback(
    (value: string) => {
      setLocalQuery(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearchQuery(value);
      }, 300);
    },
    [setSearchQuery],
  );

  const isQuestion = looksLikeQuestion(localQuery);

  const viewOptions = [
    { key: "gallery" as const, label: ui.viewLabels.gallery, icon: LayoutGrid },
    { key: "board" as const, label: ui.viewLabels.board, icon: Columns3 },
    { key: "table" as const, label: ui.viewLabels.table, icon: Table },
    {
      key: "constellation" as const,
      label: ui.viewLabels.constellation,
      icon: Sparkles,
    },
  ];

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-border/40 bg-muted/10 px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localQuery}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={ui.searchKnowledgePlaceholder}
            className="h-9 border-border/60 bg-background/80 pl-9 pr-24 text-sm shadow-sm"
            aria-label={ui.searchKnowledgeBase}
          />
          {isQuestion && localQuery.trim() ? (
            <Button
              variant="secondary"
              size="sm"
              className="absolute right-1 top-1/2 h-7 -translate-y-1/2 gap-1 text-xs shadow-none"
              onClick={() => openAIPanel(localQuery)}
            >
              <Sparkles className="h-3 w-3" />
              {ui.askAi}
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as KnowledgeSortKey)}>
            <SelectTrigger className="h-9 w-full min-w-[9.5rem] border-border/60 bg-background/80 text-xs sm:w-[160px]">
              <SelectValue placeholder={ui.sortLabel} />
            </SelectTrigger>
            <SelectContent>
              {SORT_KEYS.map((key) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {ui.sortLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex w-full items-center rounded-lg border border-border/60 bg-background/80 p-0.5 sm:w-auto">
            {viewOptions.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 flex-1 gap-1.5 px-2 text-xs sm:flex-initial",
                  currentView === key
                    ? "bg-muted font-medium text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
                onClick={() => setView(key)}
                aria-label={common.switchToView(label)}
                aria-pressed={currentView === key}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full justify-between border-border/60 bg-background/80 text-xs font-normal sm:w-[200px]"
              />
            }
          >
            <span className="truncate">
              {activeTypeFilters.length === 0
                ? ui.contentTypesMenuTitle
                : `${ui.contentTypesMenuTitle} (${activeTypeFilters.length})`}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                {ui.contentTypesMenuTitle}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CONTENT_TYPES.map((type) => {
                const checked = activeTypeFilters.includes(type);
                return (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={checked}
                    onCheckedChange={() => toggleTypeFilter(type)}
                    className="text-xs capitalize"
                  >
                    <span className="mr-1.5">{typeColors[type].icon}</span>
                    {ui.typeLabels[type]}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs"
              disabled={activeTypeFilters.length === 0}
              onClick={() => clearTypeFilters()}
            >
              {ui.clearAllFilters}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex flex-wrap gap-1 sm:justify-end">
          {(Object.keys(QUICK_ICONS) as KnowledgeQuickFilter[]).map((id) => {
            const Icon = QUICK_ICONS[id];
            const isActive = activeQuickFilters.includes(id);
            const label =
              ui.quickFilters[id as keyof typeof ui.quickFilters] ?? id;
            return (
              <Button
                key={id}
                type="button"
                variant={isActive ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "h-7 gap-1 rounded-full border px-2.5 text-[11px] font-normal",
                  isActive
                    ? "border-transparent bg-foreground/10"
                    : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={isActive}
                onClick={() => toggleQuickFilter(id)}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
