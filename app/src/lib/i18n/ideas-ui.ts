import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";
import { IDEA_DESTINATION_OPTIONS, type IdeaCategorySlug } from "@/lib/ideas/constants";
import type { IdeaRelatedCategory } from "@/lib/ideas/idea-related-display";
import type { IdeaRelatedScope } from "@/types/idea";

export type IdeasUiCopy = {
  pageTitle: string;
  pageDescription: string;
  captureIdea: string;
  openMenu: string;
  sidebarTitle: string;
  library: string;
  allIdeas: string;
  captured: string;
  reviewed: string;
  archived: string;
  categories: string;
  tags: string;
  relatedFilters: string;
  linkedProject: string;
  linkedTask: string;
  linkedGoal: string;
  linkedIdea: string;
  linkedResource: string;
  linkedKnowledge: string;
  noRelatedResource: string;
  relatedScopeLabels: Record<IdeaRelatedScope, string>;
  relatedCategoryLabels: Record<IdeaRelatedCategory, string>;
  expandDirectory: string;
  collapseDirectory: string;
  searchPlaceholder: string;
  sortLabel: string;
  sortLabels: Record<
    "latest" | "updated" | "titleAZ" | "status" | "category" | "sourceType",
    string
  >;
  viewLabels: Record<"gallery" | "board" | "table" | "constellation", string>;
  boardLandscape: {
    title: string;
    description: string;
    enter: string;
    exit: string;
    rotateHint: string;
  };
  constellation: {
    searchPlaceholder: string;
    mode: string;
    globalMode: string;
    localMode: string;
    depth: string;
    showLabels: string;
    hideUnconnected: string;
    resetLayout: string;
    enterFullscreen: string;
    exitFullscreen: string;
    legend: string;
    details: string;
    hideDetails: string;
    nodes: string;
    edges: string;
    ideaNode: string;
    selectHint: string;
    localNeedsSelection: string;
    noSelection: string;
    noSelectionHint: string;
    exploreLocal: string;
    connections: string;
    noConnections: string;
    noVisibleNodesTitle: string;
    noVisibleNodesDescription: string;
    edgeLabels: Partial<Record<import("@/types/constellation").ConstellationEdgeType, string>>;
  };
  filtersMenu: string;
  filterSource: string;
  filterCategory: string;
  clearFilters: string;
  tagSearchPlaceholder: string;
  noTagsFound: string;
  boardGroupBy: string;
  groupByStatus: string;
  groupByCategory: string;
  groupBySource: string;
  quickFilters: string;
  quickLabels: Record<
    "recent" | "unreviewed" | "hasTags" | "noTags" | "linked" | "unlinked" | "archived",
    string
  >;
  quickFilterManager: {
    manageButton: string;
    title: string;
    description: string;
    addFilter: string;
    resetDefaults: string;
    save: string;
    saving: string;
    cancel: string;
    filterLabel: string;
    filterNamePlaceholder: string;
    iconLabel: string;
    visibleLabel: string;
    matchLabel: string;
    matchAll: string;
    matchAny: string;
    builtInBadge: string;
    customBadge: string;
    moveUp: string;
    moveDown: string;
    hide: string;
    delete: string;
    rulesHeading: string;
    addRule: string;
    removeRule: string;
    fieldLabel: string;
    operatorLabel: string;
    valueLabel: string;
    present: string;
    missing: string;
    selectValue: string;
    incompleteDraft: string;
    noFilters: string;
    savedToast: string;
    saveFailedToast: string;
    textValuePlaceholder: string;
    tagValuePlaceholder: string;
    daysValuePlaceholder: string;
    iconLabels: Record<string, string>;
    ruleFields: Record<string, string>;
    ruleOperators: Record<string, string>;
  };
  activeFiltersHeading: string;
  emptyNoIdeasTitle: string;
  emptyNoIdeasDescription: string;
  emptyNoMatchesTitle: string;
  emptyNoMatchesDescription: string;
  clearAllFilters: string;
  categoryLabels: Record<IdeaCategorySlug, string>;
  statusLabels: Record<"captured" | "reviewed" | "archived", string>;
  sourceLabels: Record<"text" | "voice" | "share", string>;
  captureKindLabels: Record<"idea" | "task" | "note" | "goal", string>;
  destinationTask: string;
  destinationGraph: string;
  destinationKb: string;
  destinationTimeline: string;
  relatedCount: (n: number) => string;
  tableTitle: string;
  tableCategory: string;
  tableStatus: string;
  tableSource: string;
  tableTags: string;
  tableRelated: string;
  tableCreated: string;
  tableUpdated: string;
  addModalTitle: string;
  contentLabel: string;
  contentPlaceholder: string;
  titleLabel: string;
  titlePlaceholder: string;
  aiSummaryLabel: string;
  aiSummaryPlaceholder: string;
  categoryLabel: string;
  statusLabel: string;
  sourceLabel: string;
  captureKindLabel: string;
  voiceTranscriptLabel: string;
  destinationsLabel: string;
  linkedProjectsLabel: string;
  linkedTasksLabel: string;
  linkedGoalsLabel: string;
  linkedKnowledgeLabel: string;
  cancel: string;
  save: string;
  saving: string;
  manualTags: string;
  aiTags: string;
  addTagPlaceholder: string;
  addTag: string;
  removeAiTag: string;
  detailEdit: string;
  detailDelete: string;
  detailClose: string;
  detailSave: string;
  detailCancelEdit: string;
  contentSection: string;
  aiSuggestionsSection: string;
  aiSuggestionsGenerate: string;
  aiSuggestionsGenerating: string;
  aiSuggestionsReveal: string;
  aiSuggestionsRegenerate: string;
  aiSuggestionsGenerateDescription: string;
  aiSuggestionsGenerateError: string;
  aiSuggestionsEmpty: string;
  coreInsightLabel: string;
  nextStepLabel: string;
  possibleUseLabel: string;
  clarifyingQuestionLabel: string;
  accessBrain: string;
  visualPreviewSection: string;
  visualPreviewGenerating: string;
  visualPreviewFailed: string;
  visualPending: string;
  metadataPrefilling: string;
  relatedSection: string;
  attachmentsSection: string;
  destinationsSection: string;
  transcriptSection: string;
  openInKnowledge: string;
  openRelated: string;
  unknownKnowledge: string;
  unknownTask: string;
  unknownProject: string;
  unknownGoal: string;
  unknownIdea: string;
  unknownResource: string;
  nodeLabel: string;
  attachmentCount: (n: number) => string;
  deleteTitle: string;
  deleteDescription: string;
  deleteConfirm: string;
  geminiHint: string;
  couldNotAiEnrich: string;
};

const en: IdeasUiCopy = {
  pageTitle: "Idea Capture",
  pageDescription:
    "A lightweight knowledge base for raw sparks — classify, tag, and link before they slip away.",
  captureIdea: "Capture idea",
  openMenu: "Open idea filters",
  sidebarTitle: "Ideas",
  library: "Library",
  allIdeas: "All ideas",
  captured: "Captured",
  reviewed: "Reviewed",
  archived: "Archived",
  categories: "Categories",
  tags: "Tags",
  relatedFilters: "Related",
  linkedProject: "Linked to project",
  linkedTask: "Linked to task",
  linkedGoal: "Linked to goal",
  linkedIdea: "Linked to idea",
  linkedResource: "Linked to resource",
  linkedKnowledge: "Linked to knowledge",
  noRelatedResource: "No related resource",
  relatedScopeLabels: {
    idea: "Idea",
    project: "Project",
    goal: "Goal",
    resource: "Resource",
    task: "Task",
    knowledge: "Knowledge",
    bucket: "Bucket List",
    career: "Career",
  },
  relatedCategoryLabels: {
    knowledge: "Knowledge",
    idea: "Idea",
    task: "Task",
    project: "Project",
    goal: "Goal",
    bucket: "Bucket List",
    career: "Career",
    asset: "Asset",
    document: "Document",
    software: "Software",
    resource: "Resource",
  },
  expandDirectory: "Expand sidebar",
  collapseDirectory: "Collapse sidebar",
  searchPlaceholder: "Search ideas…",
  sortLabel: "Sort",
  sortLabels: {
    latest: "Latest",
    updated: "Updated",
    titleAZ: "Title A–Z",
    status: "Status",
    category: "Category",
    sourceType: "Source",
  },
  viewLabels: {
    gallery: "Gallery",
    board: "Board",
    table: "Table",
    constellation: "Constellation",
  },
  boardLandscape: {
    title: "Open board in landscape",
    description: "Tap to open a wider idea board, then rotate your phone sideways.",
    enter: "Enter landscape",
    exit: "Exit",
    rotateHint: "Rotate your phone sideways for the wide idea board.",
  },
  constellation: {
    searchPlaceholder: "Search idea graph…",
    mode: "Graph mode",
    globalMode: "Global",
    localMode: "Local",
    depth: "Depth",
    showLabels: "Labels",
    hideUnconnected: "Hide unconnected",
    resetLayout: "Reset layout",
    enterFullscreen: "Enter fullscreen",
    exitFullscreen: "Exit fullscreen",
    legend: "Legend",
    details: "Details",
    hideDetails: "Hide details",
    nodes: "nodes",
    edges: "edges",
    ideaNode: "Idea",
    selectHint: "Click an idea to inspect connections",
    localNeedsSelection: "Select an idea to see its local network",
    noSelection: "No idea selected",
    noSelectionHint: "Select a node to inspect its captured idea and related connections.",
    exploreLocal: "Explore local",
    connections: "Connections",
    noConnections: "This idea has no visible connections yet.",
    noVisibleNodesTitle: "No visible idea connections",
    noVisibleNodesDescription:
      "Try showing unconnected ideas or clearing the graph search.",
    edgeLabels: {
      manual_link: "Direct idea link",
      ai_suggested_link: "AI related idea",
      shared_tag: "Shared tag",
      idea_project: "Shared project",
      idea_knowledge: "Shared knowledge",
      domain_tag: "Shared reference",
    },
  },
  filtersMenu: "Filters",
  filterSource: "Source type",
  filterCategory: "Category",
  clearFilters: "Clear filters",
  tagSearchPlaceholder: "Search tags…",
  noTagsFound: "No matching tags",
  boardGroupBy: "Group board by",
  groupByStatus: "Status",
  groupByCategory: "Category",
  groupBySource: "Source",
  quickFilters: "Quick filters",
  quickLabels: {
    recent: "Recent",
    unreviewed: "Unreviewed",
    hasTags: "Has tags",
    noTags: "No tags",
    linked: "Linked",
    unlinked: "Unlinked",
    archived: "Archived",
  },
  quickFilterManager: {
    manageButton: "Manage",
    title: "Manage idea quick filters",
    description:
      "Create personal filter buttons from source, category, status, tags, links, attachments, dates, and text rules.",
    addFilter: "Add filter",
    resetDefaults: "Reset defaults",
    save: "Save filters",
    saving: "Saving...",
    cancel: "Cancel",
    filterLabel: "Label",
    filterNamePlaceholder: "Filter name",
    iconLabel: "Icon",
    visibleLabel: "Show in row",
    matchLabel: "Match",
    matchAll: "All rules",
    matchAny: "Any rule",
    builtInBadge: "Built-in",
    customBadge: "Custom",
    moveUp: "Move up",
    moveDown: "Move down",
    hide: "Hide",
    delete: "Delete",
    rulesHeading: "Rules",
    addRule: "Add rule",
    removeRule: "Remove rule",
    fieldLabel: "Field",
    operatorLabel: "Operator",
    valueLabel: "Value",
    present: "Present",
    missing: "Missing",
    selectValue: "Select value",
    incompleteDraft:
      "Name every filter and complete every rule before saving.",
    noFilters: "No quick filters configured.",
    savedToast: "Idea quick filters saved",
    saveFailedToast: "Could not save idea quick filters",
    textValuePlaceholder: "Words to find",
    tagValuePlaceholder: "Tag text",
    daysValuePlaceholder: "Days",
    iconLabels: {
      clock: "Clock",
      alertCircle: "Alert",
      tag: "Tag",
      tagOff: "No tag",
      link: "Link",
      unlink: "Unlink",
      archive: "Archive",
      filter: "Filter",
      file: "File",
      sparkles: "Sparkles",
      bookmark: "Bookmark",
      star: "Star",
      lightbulb: "Lightbulb",
      mic: "Mic",
      share: "Share",
      paperclip: "Attachment",
    },
    ruleFields: {
      builtin: "Built-in predicate",
      sourceType: "Source type",
      category: "Category",
      status: "Status",
      captureKind: "Capture kind",
      tag: "Tag contains",
      related: "Related resources",
      attachments: "Attachments",
      dateAdded: "Added within",
      text: "Text contains",
    },
    ruleOperators: {
      is: "is",
      contains: "contains",
      present: "is present",
      missing: "is missing",
      withinDays: "within days",
    },
  },
  activeFiltersHeading: "Active filters",
  emptyNoIdeasTitle: "No ideas yet",
  emptyNoIdeasDescription: "Capture your first spark while it is still warm.",
  emptyNoMatchesTitle: "No matches",
  emptyNoMatchesDescription: "Try clearing filters or changing search.",
  clearAllFilters: "Clear all",
  categoryLabels: {
    product: "Product",
    business: "Business",
    content: "Content",
    learning: "Learning",
    music: "Music",
    tech: "Tech",
    design: "Design",
    personal: "Personal",
    relationship: "Relationship",
    career: "Career",
    finance: "Finance",
    health: "Health",
    travel: "Travel",
    philosophy: "Philosophy",
    random: "Random",
  },
  statusLabels: {
    captured: "Captured",
    reviewed: "Reviewed",
    archived: "Archived",
  },
  sourceLabels: {
    text: "Text",
    voice: "Voice",
    share: "Share",
  },
  captureKindLabels: {
    idea: "Idea",
    task: "Task",
    note: "Note",
    goal: "Goal",
  },
  destinationTask: "Task inbox",
  destinationGraph: "Career graph",
  destinationKb: "Knowledge base",
  destinationTimeline: "Timeline",
  relatedCount: (n) => `${n} related`,
  tableTitle: "Title",
  tableCategory: "Category",
  tableStatus: "Status",
  tableSource: "Source",
  tableTags: "Tags",
  tableRelated: "Related",
  tableCreated: "Created",
  tableUpdated: "Updated",
  addModalTitle: "Capture idea",
  contentLabel: "Content",
  contentPlaceholder: "What is on your mind?",
  titleLabel: "Title",
  titlePlaceholder: "Auto-generated by Gemini (≤10 Chinese or ≤8 English)",
  aiSummaryLabel: "Overview",
  aiSummaryPlaceholder: "Your idea content appears here as you type",
  categoryLabel: "Category",
  statusLabel: "Status",
  sourceLabel: "Source type",
  captureKindLabel: "Capture kind",
  voiceTranscriptLabel: "Voice transcript",
  destinationsLabel: "Destinations",
  linkedProjectsLabel: "Linked projects",
  linkedTasksLabel: "Linked tasks",
  linkedGoalsLabel: "Linked goals",
  linkedKnowledgeLabel: "Linked knowledge items",
  cancel: "Cancel",
  save: "Save",
  saving: "Saving…",
  manualTags: "Your tags",
  aiTags: "Tags",
  addTagPlaceholder: "Add a tag…",
  addTag: "Add",
  removeAiTag: "Remove tag",
  detailEdit: "Edit",
  detailDelete: "Delete",
  detailClose: "Close",
  detailSave: "Save changes",
  detailCancelEdit: "Cancel",
  contentSection: "Content",
  aiSuggestionsSection: "AI suggestions",
  aiSuggestionsGenerate: "Generate AI suggestions",
  aiSuggestionsGenerating: "Generating...",
  aiSuggestionsReveal: "Show AI suggestions",
  aiSuggestionsRegenerate: "Regenerate",
  aiSuggestionsGenerateDescription:
    "Generate optional next-step thinking only when you want it.",
  aiSuggestionsGenerateError: "Could not generate AI suggestions.",
  aiSuggestionsEmpty: "No AI suggestions were generated for this idea yet.",
  coreInsightLabel: "Core insight",
  nextStepLabel: "Suggested next step",
  possibleUseLabel: "Possible use",
  clarifyingQuestionLabel: "Question to clarify",
  accessBrain: "Access My Brain",
  visualPreviewSection: "Visual",
  visualPreviewGenerating: "Generating visual...",
  visualPreviewFailed: "Visual preview could not be generated yet.",
  visualPending: "Visual is being generated…",
  metadataPrefilling: "AI is pre-filling metadata...",
  relatedSection: "Related resources",
  attachmentsSection: "Attachments",
  destinationsSection: "Destinations",
  transcriptSection: "Transcript",
  openInKnowledge: "Open in Knowledge",
  openRelated: "Open",
  unknownKnowledge: "Knowledge item",
  unknownTask: "Task",
  unknownProject: "Project",
  unknownGoal: "Goal",
  unknownIdea: "Idea",
  unknownResource: "Resource",
  nodeLabel: "Graph node",
  attachmentCount: (n) => `${n} file${n === 1 ? "" : "s"}`,
  deleteTitle: "Delete idea",
  deleteDescription: "This removes the idea permanently. This cannot be undone.",
  deleteConfirm: "Delete",
  geminiHint: "Gemini",
  couldNotAiEnrich: "Could not generate title. You can still save the idea.",
};

export type IdeaDestinationLabelKey = (typeof IDEA_DESTINATION_OPTIONS)[number]["labelKey"];

export function ideaDestinationLabel(ui: IdeasUiCopy, key: IdeaDestinationLabelKey): string {
  switch (key) {
    case "destinationTask":
      return ui.destinationTask;
    case "destinationGraph":
      return ui.destinationGraph;
    case "destinationKb":
      return ui.destinationKb;
    case "destinationTimeline":
      return ui.destinationTimeline;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

const ideasLocaleOverrides: Partial<Record<AppLocale, import("./copy-helpers").DeepPartial<IdeasUiCopy>>> = {};

const IDEAS_UI_MAP = createLocaleCopyMap(en, ideasLocaleOverrides);

export function getIdeasUiCopy(locale: AppLocale): IdeasUiCopy {
  return (IDEAS_UI_MAP[locale] ?? IDEAS_UI_MAP.en) as IdeasUiCopy;
}
