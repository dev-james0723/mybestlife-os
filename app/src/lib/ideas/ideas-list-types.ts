import type { Idea } from "@/types/database";

export type IdeasView = "gallery" | "board" | "table";

export type IdeasSortKey =
  | "latest"
  | "updated"
  | "titleAZ"
  | "status"
  | "category"
  | "sourceType";

export type IdeasLibraryScope = "all" | Idea["status"];

export type IdeasQuickFilter =
  | "recent"
  | "unreviewed"
  | "hasTags"
  | "noTags"
  | "linked"
  | "unlinked"
  | "archived";

export type IdeasRelatedScopeFilter =
  | "none"
  | "hasProject"
  | "hasTask"
  | "hasKnowledge"
  | "noRelated";
