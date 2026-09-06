"use client";

import { useMemo, useState } from "react";
import {
  KNOWLEDGE_CARDS_PER_PAGE_OPTIONS,
  isKnowledgeCardsPerPagePreset,
  normalizeKnowledgeCardsPerPage,
  useKnowledgeStore,
  type KnowledgeView,
  type KnowledgeSortKey,
} from "@/stores/knowledge-store";
import { CONTENT_TYPES, typeColors } from "@/types/knowledge";
import {
  OSControl,
  OSIconControl,
  OSSegmentedControl,
} from "@/components/ui/os-primitives";
import { Input } from "@/components/ui/input";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Check,
  ChevronDown,
  Columns3,
  LayoutGrid,
  SlidersHorizontal,
  Sparkles,
  Table,
  Tag as TagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";
import {
  getKnowledgeQuickFilterDisplayLabel,
  isKnowledgeBuiltinQuickFilterId,
  type KnowledgeQuickFilterDefinition,
  type KnowledgeBuiltinQuickFilterId,
} from "@/lib/knowledge/quick-filters";
import { KNOWLEDGE_QUICK_FILTER_ICON_COMPONENTS } from "./knowledgeQuickFilterIcons";
import { KnowledgeQuickFiltersDialog } from "./KnowledgeQuickFiltersDialog";
import { TagTaxonomyPanel } from "./tags/TagTaxonomyPanel";
import { useTagFilter } from "@/hooks/use-tag-taxonomy";
import { getTagBreadcrumb } from "@/lib/knowledge/tags/build-tree";

const SORT_KEYS: KnowledgeSortKey[] = [
  "latest",
  "updated",
  "relevance",
  "linked",
  "titleAZ",
  "contentType",
  "sourceDate",
];

type QuickFilterTone = {
  active: string;
};

const BUILTIN_QUICK_FILTER_TONES: Record<KnowledgeBuiltinQuickFilterId, QuickFilterTone> = {
  favorite: {
    active:
      "border-amber-400/65 bg-amber-200/85 text-amber-950 shadow-[0_8px_22px_rgba(217,119,6,0.14),inset_0_1px_0_rgba(255,255,255,0.58)] dark:border-amber-300/50 dark:bg-amber-400/24 dark:text-amber-50 dark:shadow-[0_8px_22px_rgba(251,191,36,0.13),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
  recent: {
    active:
      "border-sky-400/60 bg-sky-200/80 text-sky-950 shadow-[0_8px_22px_rgba(14,116,144,0.14),inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-sky-300/45 dark:bg-sky-400/22 dark:text-sky-50 dark:shadow-[0_8px_22px_rgba(56,189,248,0.12),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
  social: {
    active:
      "border-rose-400/60 bg-rose-200/80 text-rose-950 shadow-[0_8px_22px_rgba(190,18,60,0.13),inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-rose-300/45 dark:bg-rose-400/22 dark:text-rose-50 dark:shadow-[0_8px_22px_rgba(251,113,133,0.12),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
  github: {
    active:
      "border-zinc-500/55 bg-zinc-200/90 text-zinc-950 shadow-[0_8px_22px_rgba(39,39,42,0.12),inset_0_1px_0_rgba(255,255,255,0.58)] dark:border-zinc-200/40 dark:bg-zinc-100/18 dark:text-white dark:shadow-[0_8px_22px_rgba(228,228,231,0.08),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
  hasMedia: {
    active:
      "border-violet-400/60 bg-violet-200/80 text-violet-950 shadow-[0_8px_22px_rgba(109,40,217,0.13),inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-violet-300/45 dark:bg-violet-400/22 dark:text-violet-50 dark:shadow-[0_8px_22px_rgba(167,139,250,0.12),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
  hasSource: {
    active:
      "border-teal-400/60 bg-teal-200/80 text-teal-950 shadow-[0_8px_22px_rgba(13,148,136,0.13),inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-teal-300/45 dark:bg-teal-400/22 dark:text-teal-50 dark:shadow-[0_8px_22px_rgba(45,212,191,0.12),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
  aiGenerated: {
    active:
      "border-emerald-400/60 bg-emerald-200/80 text-emerald-950 shadow-[0_8px_22px_rgba(5,150,105,0.13),inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-300/45 dark:bg-emerald-400/22 dark:text-emerald-50 dark:shadow-[0_8px_22px_rgba(52,211,153,0.12),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
  needsReview: {
    active:
      "border-red-400/60 bg-red-200/80 text-red-950 shadow-[0_8px_22px_rgba(220,38,38,0.13),inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-red-300/45 dark:bg-red-400/22 dark:text-red-50 dark:shadow-[0_8px_22px_rgba(248,113,113,0.12),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
};

const QUICK_FILTER_IDLE_CLASS =
  "border-border/60 bg-background/70 text-muted-foreground shadow-none hover:border-foreground/20 hover:bg-muted/60 hover:text-foreground dark:bg-white/[0.04] dark:hover:bg-white/[0.07]";

const KNOWLEDGE_DROPDOWN_POSITIONER_CLASS =
  "glass-modal-surface overflow-hidden rounded-xl";

const KNOWLEDGE_DROPDOWN_CONTENT_CLASS =
  "bg-transparent shadow-none ring-0 [&_[data-slot=select-scroll-down-button]]:bg-transparent [&_[data-slot=select-scroll-up-button]]:bg-transparent";

const CUSTOM_QUICK_FILTER_TONES: QuickFilterTone[] = [
  BUILTIN_QUICK_FILTER_TONES.favorite,
  BUILTIN_QUICK_FILTER_TONES.recent,
  BUILTIN_QUICK_FILTER_TONES.social,
  BUILTIN_QUICK_FILTER_TONES.hasMedia,
  BUILTIN_QUICK_FILTER_TONES.hasSource,
  BUILTIN_QUICK_FILTER_TONES.aiGenerated,
];

function quickFilterToneFor(def: KnowledgeQuickFilterDefinition): QuickFilterTone {
  if (isKnowledgeBuiltinQuickFilterId(def.id)) {
    return BUILTIN_QUICK_FILTER_TONES[def.id];
  }

  const index = Array.from(def.id).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % CUSTOM_QUICK_FILTER_TONES.length;

  return CUSTOM_QUICK_FILTER_TONES[index];
}

export function KnowledgeTopControlBar() {
  const [quickFiltersOpen, setQuickFiltersOpen] = useState(false);
  const [customPageSizeOpen, setCustomPageSizeOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const common = getCommonUiCopy(language);

  const activeTypeFilters = useKnowledgeStore((s) => s.activeTypeFilters);
  const toggleTypeFilter = useKnowledgeStore((s) => s.toggleTypeFilter);
  const clearTypeFilters = useKnowledgeStore((s) => s.clearTypeFilters);
  const activeQuickFilters = useKnowledgeStore((s) => s.activeQuickFilters);
  const quickFilterDefinitions = useKnowledgeStore((s) => s.quickFilterDefinitions);
  const toggleQuickFilter = useKnowledgeStore((s) => s.toggleQuickFilter);
  const sortBy = useKnowledgeStore((s) => s.sortBy);
  const setSortBy = useKnowledgeStore((s) => s.setSortBy);
  const cardsPerPage = useKnowledgeStore((s) => s.cardsPerPage);
  const setCardsPerPage = useKnowledgeStore((s) => s.setCardsPerPage);
  const currentView = useKnowledgeStore((s) => s.currentView);
  const setView = useKnowledgeStore((s) => s.setView);
  const { taxonomy, activeTagId } = useTagFilter();
  const [customPageSizeDraft, setCustomPageSizeDraft] = useState(() =>
    String(cardsPerPage),
  );

  const activeTagTrail = useMemo(
    () => (activeTagId ? getTagBreadcrumb(activeTagId, taxonomy) : []),
    [activeTagId, taxonomy],
  );
  const activeTagLabel = activeTagTrail[activeTagTrail.length - 1]?.name;

  const pageSizeSelectValue =
    customPageSizeOpen || !isKnowledgeCardsPerPagePreset(cardsPerPage)
      ? "custom"
      : String(cardsPerPage);

  function handlePageSizeChange(value: string | null) {
    if (!value) return;
    if (value === "custom") {
      setCustomPageSizeDraft(String(cardsPerPage));
      setCustomPageSizeOpen(true);
      return;
    }
    setCustomPageSizeOpen(false);
    setCardsPerPage(Number(value));
  }

  function applyCustomPageSize() {
    const parsed = Number.parseInt(customPageSizeDraft, 10);
    if (Number.isNaN(parsed)) {
      setCustomPageSizeDraft(String(cardsPerPage));
      return;
    }
    const next = normalizeKnowledgeCardsPerPage(parsed);
    setCustomPageSizeDraft(String(next));
    setCardsPerPage(next);
    setCustomPageSizeOpen(!isKnowledgeCardsPerPagePreset(next));
  }

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

  const visibleQuickFilters = quickFilterDefinitions.filter((def) => def.visible);

  return (
    <div className="flex shrink-0 flex-col gap-2.5 border-b border-border/40 bg-muted/10 px-4 py-3 sm:px-5">
      <div className="grid min-w-0 gap-2">
        <div className="grid min-w-0 gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <OSControl
                  size="sm"
                  osSize="compact"
                  className="h-9 w-full min-w-0 justify-between border-border/60 bg-background/80 font-normal"
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
            <DropdownMenuContent
              align="start"
              positionerClassName={KNOWLEDGE_DROPDOWN_POSITIONER_CLASS}
              className={KNOWLEDGE_DROPDOWN_CONTENT_CLASS}
            >
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

          <div className="flex min-w-0 items-center gap-1.5">
            <Select value={pageSizeSelectValue} onValueChange={handlePageSizeChange}>
              <SelectTrigger
                aria-label={ui.cardsPerPageLabel}
                className="h-9 min-w-0 flex-1 border-border/60 bg-background/80 text-xs"
              >
                <SelectValue placeholder={ui.cardsPerPageLabel} />
              </SelectTrigger>
              <SelectContent
                align="start"
                positionerClassName={KNOWLEDGE_DROPDOWN_POSITIONER_CLASS}
                className={KNOWLEDGE_DROPDOWN_CONTENT_CLASS}
              >
                {KNOWLEDGE_CARDS_PER_PAGE_OPTIONS.map((count) => (
                  <SelectItem key={count} value={String(count)} className="text-xs">
                    {ui.formatCardsPerPageOption(count)}
                  </SelectItem>
                ))}
                <SelectItem value="custom" className="text-xs">
                  {ui.cardsPerPageCustom}
                </SelectItem>
              </SelectContent>
            </Select>

            {pageSizeSelectValue === "custom" ? (
              <div className="flex min-w-0 shrink-0 items-center gap-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={500}
                  value={customPageSizeDraft}
                  aria-label={ui.cardsPerPageInputAria}
                  onChange={(event) => setCustomPageSizeDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyCustomPageSize();
                    }
                  }}
                  className="h-9 min-h-9 w-20 bg-background/80 text-xs sm:min-h-0"
                />
                <OSIconControl
                  type="button"
                  size="icon-sm"
                  osSize="none"
                  className="h-9 min-h-9 w-9 shrink-0"
                  aria-label={ui.cardsPerPageApply}
                  onClick={applyCustomPageSize}
                >
                  <Check className="h-3.5 w-3.5" />
                </OSIconControl>
              </div>
            ) : null}
          </div>

          <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
            <PopoverTrigger
              render={
                <OSControl
                  size="sm"
                  osSize="compact"
                  className="h-9 w-full min-w-0 justify-between border-border/60 bg-background/80 font-normal"
                />
              }
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <TagIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="truncate">
                  {activeTagId && activeTagLabel
                    ? `${ui.tagTaxonomy.sectionTitle}: ${activeTagLabel}`
                    : ui.tagTaxonomy.sectionTitle}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="bottom"
              className="w-[min(calc(100vw-2rem),var(--anchor-width))] bg-transparent p-3 shadow-none ring-0"
            >
              <TagTaxonomyPanel onAfterSelect={() => setTagsOpen(false)} />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid min-w-0 gap-2">
          <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as KnowledgeSortKey)}>
            <SelectTrigger className="h-9 w-full min-w-0 justify-between border-border/60 bg-background/80 text-xs">
              <SelectValue placeholder={ui.sortLabel}>{ui.sortLabels[sortBy]}</SelectValue>
            </SelectTrigger>
            <SelectContent
              positionerClassName={KNOWLEDGE_DROPDOWN_POSITIONER_CLASS}
              className={KNOWLEDGE_DROPDOWN_CONTENT_CLASS}
            >
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
            className="w-full min-w-0 sm:w-full [&>button]:min-w-0 [&>button]:flex-1 [&>button>span:last-child]:min-w-0 [&>button>span:last-child]:truncate [&>button>span:last-child]:whitespace-nowrap max-[420px]:[&>button]:gap-0 max-[520px]:[&>button>span:last-child]:sr-only"
            labelMode="desktop"
            layoutId="knowledge-view-active-pill"
          />
        </div>
      </div>

      <div
        className="flex min-w-0 items-center gap-2"
        role="group"
        aria-label={ui.quickFilterManager.title}
      >
        {visibleQuickFilters.length > 0 ? (
          <div className="relative min-w-0 flex-1">
            <div
              className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5 pr-6 sm:gap-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, #000 calc(100% - 2rem), transparent)",
                maskImage:
                  "linear-gradient(to right, #000 calc(100% - 2rem), transparent)",
              }}
            >
              {visibleQuickFilters.map((def) => {
                const Icon = KNOWLEDGE_QUICK_FILTER_ICON_COMPONENTS[def.icon];
                const isActive = activeQuickFilters.includes(def.id);
                const tone = quickFilterToneFor(def);
                const label = getKnowledgeQuickFilterDisplayLabel(
                  def,
                  ui.quickFilters as Record<KnowledgeBuiltinQuickFilterId, string>,
                );
                return (
                  <OSControl
                    key={def.id}
                    type="button"
                    variant={isActive ? "secondary" : "outline"}
                    size="sm"
                    osSize="compact"
                    data-control-shape="pill"
                    className={cn(
                      "shrink-0 gap-1 rounded-full border px-3 text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]",
                      isActive ? tone.active : QUICK_FILTER_IDLE_CLASS,
                    )}
                    aria-pressed={isActive}
                    data-selection-glow={isActive ? "active" : undefined}
                    onClick={() => toggleQuickFilter(def.id)}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="hidden sm:inline">{label}</span>
                  </OSControl>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <OSControl
          type="button"
          variant="outline"
          size="sm"
          osSize="compact"
          data-control-shape="pill"
          className="relative z-10 shrink-0 gap-1 rounded-full border-border/60 bg-background/70 px-2.5 text-[11px] font-medium text-muted-foreground shadow-[-10px_0_20px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.42)] hover:border-foreground/20 hover:bg-muted/60 hover:text-foreground hover:shadow-[-12px_0_24px_rgba(15,23,42,0.13),inset_0_1px_0_rgba(255,255,255,0.48)] focus-visible:ring-lime-300/40 dark:bg-white/[0.04] dark:shadow-[-12px_0_24px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] dark:hover:bg-white/[0.07] dark:hover:shadow-[-14px_0_28px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.10)]"
          onClick={() => setQuickFiltersOpen(true)}
          aria-label={ui.quickFilterManager.manageButton}
        >
          <SlidersHorizontal className="h-3 w-3 shrink-0" />
          <span className="hidden 2xl:inline">{ui.quickFilterManager.manageButton}</span>
        </OSControl>
      </div>
      <KnowledgeQuickFiltersDialog
        open={quickFiltersOpen}
        onOpenChange={setQuickFiltersOpen}
      />
    </div>
  );
}
