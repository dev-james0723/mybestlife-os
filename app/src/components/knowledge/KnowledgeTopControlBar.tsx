"use client";

import type { ComponentType } from "react";
import {
  useKnowledgeStore,
  type KnowledgeView,
  type KnowledgeQuickFilter,
  type KnowledgeSortKey,
} from "@/stores/knowledge-store";
import { CONTENT_TYPES, typeColors } from "@/types/knowledge";
import {
  OSControl,
  OSSegmentedControl,
} from "@/components/ui/os-primitives";
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
  Sparkles,
  Table,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";

const QUICK_ICONS: Record<
  KnowledgeQuickFilter,
  ComponentType<{ className?: string }>
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

  const activeTypeFilters = useKnowledgeStore((s) => s.activeTypeFilters);
  const toggleTypeFilter = useKnowledgeStore((s) => s.toggleTypeFilter);
  const clearTypeFilters = useKnowledgeStore((s) => s.clearTypeFilters);
  const activeQuickFilters = useKnowledgeStore((s) => s.activeQuickFilters);
  const toggleQuickFilter = useKnowledgeStore((s) => s.toggleQuickFilter);
  const sortBy = useKnowledgeStore((s) => s.sortBy);
  const setSortBy = useKnowledgeStore((s) => s.setSortBy);
  const currentView = useKnowledgeStore((s) => s.currentView);
  const setView = useKnowledgeStore((s) => s.setView);

  const viewOptions: Array<{
    id: KnowledgeView;
    label: string;
    icon: typeof LayoutGrid;
    ariaLabel: string;
  }> = [
    {
      id: "gallery",
      label: ui.viewLabels.gallery,
      icon: LayoutGrid,
      ariaLabel: common.switchToView(ui.viewLabels.gallery),
    },
    {
      id: "board",
      label: ui.viewLabels.board,
      icon: Columns3,
      ariaLabel: common.switchToView(ui.viewLabels.board),
    },
    {
      id: "table",
      label: ui.viewLabels.table,
      icon: Table,
      ariaLabel: common.switchToView(ui.viewLabels.table),
    },
    {
      id: "constellation",
      label: ui.viewLabels.constellation,
      icon: Sparkles,
      ariaLabel: common.switchToView(ui.viewLabels.constellation),
    },
  ];

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-border/40 bg-muted/10 px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 sm:shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <OSControl
                  size="sm"
                  osSize="compact"
                  className="w-full justify-between border-border/60 bg-background/80 font-normal sm:w-[200px]"
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
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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

          <OSSegmentedControl
            items={viewOptions}
            value={currentView}
            onValueChange={setView}
            ariaLabel={ui.pageTitle}
            className="sm:w-auto"
            labelMode="desktop"
            layoutId="knowledge-view-active-pill"
          />
        </div>
      </div>

      <div className="flex min-w-0 gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(Object.keys(QUICK_ICONS) as KnowledgeQuickFilter[]).map((id) => {
          const Icon = QUICK_ICONS[id];
          const isActive = activeQuickFilters.includes(id);
          const label =
            ui.quickFilters[id as keyof typeof ui.quickFilters] ?? id;
          return (
            <OSControl
              key={id}
              type="button"
              variant={isActive ? "secondary" : "outline"}
              size="sm"
              osSize="compact"
              className={cn(
                "shrink-0 gap-1 rounded-full border px-2.5 text-[11px] font-normal",
                isActive
                  ? "border-transparent bg-foreground/10"
                  : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={isActive}
              onClick={() => toggleQuickFilter(id)}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </OSControl>
          );
        })}
      </div>
    </div>
  );
}
