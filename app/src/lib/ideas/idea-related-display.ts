import type { IdeaRelatedResource, IdeaRelatedScope, IdeaResourceKind } from "@/types/idea";

/**
 * Fine-grained display categories for Related Resources. Several map onto the
 * single `resource` scope (asset / document / software) so each gets its own
 * coloured Liquid Glass pill, icon, and label.
 */
export type IdeaRelatedCategory =
  | "knowledge"
  | "idea"
  | "task"
  | "project"
  | "goal"
  | "bucket"
  | "career"
  | "asset"
  | "document"
  | "software"
  | "resource";

export function resolveIdeaRelatedCategory(input: {
  scope: IdeaRelatedScope;
  resourceKind?: IdeaResourceKind;
}): IdeaRelatedCategory {
  switch (input.scope) {
    case "knowledge":
      return "knowledge";
    case "idea":
      return "idea";
    case "task":
      return "task";
    case "project":
      return "project";
    case "goal":
      return "goal";
    case "bucket":
      return "bucket";
    case "career":
      return "career";
    case "resource":
      if (input.resourceKind === "asset") return "asset";
      if (input.resourceKind === "document") return "document";
      if (input.resourceKind === "software_vault") return "software";
      return "resource";
    default:
      return "resource";
  }
}

/**
 * Liquid Glass pill classes per category. Full literal strings so Tailwind's
 * JIT can detect them; readable on both light and dark surfaces.
 */
export const IDEA_RELATED_CATEGORY_PILL: Record<IdeaRelatedCategory, string> = {
  knowledge:
    "border-blue-400/30 bg-blue-500/12 text-blue-700 dark:text-blue-200",
  idea: "border-amber-400/30 bg-amber-500/12 text-amber-700 dark:text-amber-200",
  task: "border-cyan-400/30 bg-cyan-500/12 text-cyan-700 dark:text-cyan-200",
  project:
    "border-indigo-400/30 bg-indigo-500/12 text-indigo-700 dark:text-indigo-200",
  goal: "border-emerald-400/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200",
  bucket: "border-rose-400/30 bg-rose-500/12 text-rose-700 dark:text-rose-200",
  career:
    "border-purple-400/30 bg-purple-500/12 text-purple-700 dark:text-purple-200",
  asset: "border-green-400/30 bg-green-500/12 text-green-700 dark:text-green-200",
  document:
    "border-slate-400/30 bg-slate-500/12 text-slate-700 dark:text-slate-200",
  software: "border-zinc-400/30 bg-zinc-500/12 text-zinc-700 dark:text-zinc-200",
  resource: "border-zinc-400/30 bg-zinc-500/12 text-zinc-700 dark:text-zinc-200",
};

export function ideaRelatedCategory(r: IdeaRelatedResource): IdeaRelatedCategory {
  return resolveIdeaRelatedCategory(r);
}
