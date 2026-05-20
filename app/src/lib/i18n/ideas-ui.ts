import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";
import { IDEA_DESTINATION_OPTIONS, type IdeaCategorySlug } from "@/lib/ideas/constants";

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
  linkedKnowledge: string;
  noRelatedResource: string;
  expandDirectory: string;
  collapseDirectory: string;
  searchPlaceholder: string;
  sortLabel: string;
  sortLabels: Record<
    "latest" | "updated" | "titleAZ" | "status" | "category" | "sourceType",
    string
  >;
  viewLabels: Record<"gallery" | "board" | "table", string>;
  filtersMenu: string;
  filterSource: string;
  filterCategory: string;
  clearFilters: string;
  boardGroupBy: string;
  groupByStatus: string;
  groupByCategory: string;
  groupBySource: string;
  quickFilters: string;
  quickLabels: Record<
    "recent" | "unreviewed" | "hasTags" | "noTags" | "linked" | "unlinked" | "archived",
    string
  >;
  activeFiltersHeading: string;
  emptyNoIdeasTitle: string;
  emptyNoIdeasDescription: string;
  emptyNoMatchesTitle: string;
  emptyNoMatchesDescription: string;
  clearAllFilters: string;
  categoryLabels: Record<IdeaCategorySlug, string>;
  statusLabels: Record<"captured" | "reviewed" | "archived", string>;
  sourceLabels: Record<"text" | "voice", string>;
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
  relatedSection: string;
  attachmentsSection: string;
  destinationsSection: string;
  transcriptSection: string;
  openInKnowledge: string;
  unknownKnowledge: string;
  unknownTask: string;
  unknownProject: string;
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
  linkedKnowledge: "Linked to knowledge",
  noRelatedResource: "No related resource",
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
  },
  filtersMenu: "Filters",
  filterSource: "Source type",
  filterCategory: "Category",
  clearFilters: "Clear filters",
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
  titlePlaceholder: "Optional — we will use your first line if empty",
  aiSummaryLabel: "AI summary",
  aiSummaryPlaceholder: "Optional summary (filled by AI when you write enough)",
  categoryLabel: "Category",
  statusLabel: "Status",
  sourceLabel: "Source type",
  captureKindLabel: "Capture kind",
  voiceTranscriptLabel: "Voice transcript",
  destinationsLabel: "Destinations",
  linkedProjectsLabel: "Linked projects",
  linkedTasksLabel: "Linked tasks",
  linkedKnowledgeLabel: "Linked knowledge items",
  cancel: "Cancel",
  save: "Save",
  saving: "Saving…",
  manualTags: "Manual tags",
  aiTags: "AI tags",
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
  relatedSection: "Related resources",
  attachmentsSection: "Attachments",
  destinationsSection: "Destinations",
  transcriptSection: "Transcript",
  openInKnowledge: "Open in Knowledge",
  unknownKnowledge: "Knowledge item",
  unknownTask: "Task",
  unknownProject: "Project",
  nodeLabel: "Graph node",
  attachmentCount: (n) => `${n} file${n === 1 ? "" : "s"}`,
  deleteTitle: "Delete idea",
  deleteDescription: "This removes the idea permanently. This cannot be undone.",
  deleteConfirm: "Delete",
  geminiHint: "Gemini",
  couldNotAiEnrich: "Could not generate title and summary. You can still save the idea.",
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
