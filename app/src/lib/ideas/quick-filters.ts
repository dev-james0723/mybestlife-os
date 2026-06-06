import { stripHtml } from "@/lib/utils/html";
import type { CaptureKind, Idea } from "@/types/database";
import {
  displayCategory,
  ideaAiSuggestions,
  ideaHasAnyLinks,
  ideaTags,
  previewIdeaBody,
  previewIdeaTitle,
} from "./idea-helpers";
import { IDEA_CATEGORIES, type IdeaCategorySlug } from "./constants";

export const IDEA_BUILTIN_QUICK_FILTER_IDS = [
  "recent",
  "unreviewed",
  "hasTags",
  "noTags",
  "linked",
  "unlinked",
  "archived",
] as const;

export type IdeaBuiltinQuickFilterId =
  (typeof IDEA_BUILTIN_QUICK_FILTER_IDS)[number];

export const IDEA_QUICK_FILTER_ICON_KEYS = [
  "clock",
  "alertCircle",
  "tag",
  "tagOff",
  "link",
  "unlink",
  "archive",
  "filter",
  "file",
  "sparkles",
  "bookmark",
  "star",
  "lightbulb",
  "mic",
  "share",
  "paperclip",
] as const;

export type IdeaQuickFilterIconKey =
  (typeof IDEA_QUICK_FILTER_ICON_KEYS)[number];

export const IDEA_QUICK_FILTER_FIELDS = [
  "builtin",
  "sourceType",
  "category",
  "status",
  "captureKind",
  "tag",
  "related",
  "attachments",
  "dateAdded",
  "text",
] as const;

export type IdeaQuickFilterRuleField =
  (typeof IDEA_QUICK_FILTER_FIELDS)[number];

export type IdeaQuickFilterRuleOperator =
  | "is"
  | "contains"
  | "present"
  | "missing"
  | "withinDays";

export type IdeaQuickFilterRuleValue = string | number | null;

export type IdeaQuickFilterRule = {
  id: string;
  field: IdeaQuickFilterRuleField;
  operator: IdeaQuickFilterRuleOperator;
  value: IdeaQuickFilterRuleValue;
};

export type IdeaQuickFilterDefinition = {
  id: string;
  label: string;
  icon: IdeaQuickFilterIconKey;
  visible: boolean;
  builtIn: boolean;
  match: "all" | "any";
  rules: IdeaQuickFilterRule[];
};

export const IDEA_QUICK_FILTER_SOURCE_TYPE_VALUES: Idea["source_type"][] = [
  "text",
  "voice",
  "share",
];

export const IDEA_QUICK_FILTER_STATUS_VALUES: Idea["status"][] = [
  "captured",
  "reviewed",
  "archived",
];

export const IDEA_QUICK_FILTER_CAPTURE_KIND_VALUES: CaptureKind[] = [
  "idea",
  "task",
  "note",
  "goal",
];

export const IDEA_DEFAULT_QUICK_FILTER_LABELS: Record<
  IdeaBuiltinQuickFilterId,
  string
> = {
  recent: "Recent",
  unreviewed: "Unreviewed",
  hasTags: "Has tags",
  noTags: "No tags",
  linked: "Linked",
  unlinked: "Unlinked",
  archived: "Archived",
};

const DEFAULT_ICON_BY_BUILTIN: Record<
  IdeaBuiltinQuickFilterId,
  IdeaQuickFilterIconKey
> = {
  recent: "clock",
  unreviewed: "alertCircle",
  hasTags: "tag",
  noTags: "tagOff",
  linked: "link",
  unlinked: "unlink",
  archived: "archive",
};

const DEFAULT_RULE_BY_BUILTIN: Record<
  IdeaBuiltinQuickFilterId,
  IdeaQuickFilterRule
> = Object.fromEntries(
  IDEA_BUILTIN_QUICK_FILTER_IDS.map((id) => [
    id,
    {
      id: `${id}-rule`,
      field: "builtin",
      operator: "is",
      value: id,
    } satisfies IdeaQuickFilterRule,
  ]),
) as Record<IdeaBuiltinQuickFilterId, IdeaQuickFilterRule>;

export function getDefaultIdeaQuickFilters(): IdeaQuickFilterDefinition[] {
  return IDEA_BUILTIN_QUICK_FILTER_IDS.map((id) => ({
    id,
    label: IDEA_DEFAULT_QUICK_FILTER_LABELS[id],
    icon: DEFAULT_ICON_BY_BUILTIN[id],
    visible: true,
    builtIn: true,
    match: "all",
    rules: [{ ...DEFAULT_RULE_BY_BUILTIN[id] }],
  }));
}

export function isIdeaBuiltinQuickFilterId(
  value: unknown,
): value is IdeaBuiltinQuickFilterId {
  return (
    typeof value === "string" &&
    (IDEA_BUILTIN_QUICK_FILTER_IDS as readonly string[]).includes(value)
  );
}

export function operatorForIdeaQuickFilterField(
  field: IdeaQuickFilterRuleField,
): IdeaQuickFilterRuleOperator {
  switch (field) {
    case "tag":
    case "text":
      return "contains";
    case "related":
    case "attachments":
      return "present";
    case "dateAdded":
      return "withinDays";
    default:
      return "is";
  }
}

export function defaultValueForIdeaQuickFilterField(
  field: IdeaQuickFilterRuleField,
): IdeaQuickFilterRuleValue {
  switch (field) {
    case "builtin":
      return "recent";
    case "sourceType":
      return "text";
    case "category":
      return "product";
    case "status":
      return "captured";
    case "captureKind":
      return "idea";
    case "dateAdded":
      return 14;
    case "tag":
    case "text":
      return "";
    case "related":
    case "attachments":
      return null;
    default:
      return null;
  }
}

export function createIdeaQuickFilterRule(
  field: IdeaQuickFilterRuleField = "text",
): IdeaQuickFilterRule {
  return {
    id: `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    field,
    operator: operatorForIdeaQuickFilterField(field),
    value: defaultValueForIdeaQuickFilterField(field),
  };
}

export function createIdeaQuickFilterDefinition(): IdeaQuickFilterDefinition {
  return {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    label: "New filter",
    icon: "filter",
    visible: true,
    builtIn: false,
    match: "all",
    rules: [createIdeaQuickFilterRule("text")],
  };
}

function isIconKey(value: unknown): value is IdeaQuickFilterIconKey {
  return (
    typeof value === "string" &&
    (IDEA_QUICK_FILTER_ICON_KEYS as readonly string[]).includes(value)
  );
}

function isField(value: unknown): value is IdeaQuickFilterRuleField {
  return (
    typeof value === "string" &&
    (IDEA_QUICK_FILTER_FIELDS as readonly string[]).includes(value)
  );
}

function isOperator(value: unknown): value is IdeaQuickFilterRuleOperator {
  return (
    value === "is" ||
    value === "contains" ||
    value === "present" ||
    value === "missing" ||
    value === "withinDays"
  );
}

function normalizeStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePositiveInteger(value: unknown, fallback: number | null): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), 1), 3650);
}

function isIdeaCategory(value: unknown): value is IdeaCategorySlug {
  return (
    typeof value === "string" &&
    (IDEA_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isIdeaQuickFilterRuleComplete(
  rule: IdeaQuickFilterRule,
): boolean {
  switch (rule.field) {
    case "tag":
    case "text":
      return typeof rule.value === "string" && rule.value.trim().length > 0;
    case "dateAdded":
      return typeof rule.value === "number" && rule.value >= 1;
    case "related":
    case "attachments":
      return rule.operator === "present" || rule.operator === "missing";
    default:
      return typeof rule.value === "string" && rule.value.trim().length > 0;
  }
}

export function normalizeIdeaQuickFilterRule(
  raw: unknown,
): IdeaQuickFilterRule | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!isField(obj.field)) return null;

  const field = obj.field;
  let operator = isOperator(obj.operator)
    ? obj.operator
    : operatorForIdeaQuickFilterField(field);

  if (field === "related" || field === "attachments") {
    operator = operator === "missing" ? "missing" : "present";
    return {
      id: normalizeStringValue(obj.id) ?? createIdeaQuickFilterRule(field).id,
      field,
      operator,
      value: null,
    };
  }

  if (operator !== operatorForIdeaQuickFilterField(field)) {
    operator = operatorForIdeaQuickFilterField(field);
  }

  let value: IdeaQuickFilterRuleValue = null;
  switch (field) {
    case "builtin":
      value = isIdeaBuiltinQuickFilterId(obj.value) ? obj.value : null;
      break;
    case "sourceType":
      value =
        typeof obj.value === "string" &&
        (IDEA_QUICK_FILTER_SOURCE_TYPE_VALUES as readonly string[]).includes(obj.value)
          ? obj.value
          : null;
      break;
    case "category":
      value = isIdeaCategory(obj.value) ? obj.value : null;
      break;
    case "status":
      value =
        typeof obj.value === "string" &&
        (IDEA_QUICK_FILTER_STATUS_VALUES as readonly string[]).includes(obj.value)
          ? obj.value
          : null;
      break;
    case "captureKind":
      value =
        typeof obj.value === "string" &&
        (IDEA_QUICK_FILTER_CAPTURE_KIND_VALUES as readonly string[]).includes(obj.value)
          ? obj.value
          : null;
      break;
    case "tag":
    case "text":
      value = normalizeStringValue(obj.value);
      break;
    case "dateAdded":
      value = normalizePositiveInteger(obj.value, null);
      break;
    default:
      value = null;
      break;
  }

  if (value == null) return null;
  return {
    id: normalizeStringValue(obj.id) ?? createIdeaQuickFilterRule(field).id,
    field,
    operator,
    value,
  };
}

function normalizeDefinition(raw: unknown): IdeaQuickFilterDefinition | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = normalizeStringValue(obj.id);
  if (!id) return null;

  const builtIn = isIdeaBuiltinQuickFilterId(id);
  const fallback = builtIn
    ? getDefaultIdeaQuickFilters().find((def) => def.id === id)
    : null;

  const rules = Array.isArray(obj.rules)
    ? obj.rules
        .map((rule) => normalizeIdeaQuickFilterRule(rule))
        .filter((rule): rule is IdeaQuickFilterRule => Boolean(rule))
        .slice(0, 8)
    : [];

  const fallbackRules = fallback?.rules.map((rule) => ({ ...rule })) ?? [];
  const normalizedRules = rules.length > 0 ? rules : fallbackRules;
  if (!builtIn && normalizedRules.length === 0) return null;

  const label =
    normalizeStringValue(obj.label)?.slice(0, 40) ??
    fallback?.label ??
    "Custom filter";

  return {
    id,
    label,
    icon: isIconKey(obj.icon) ? obj.icon : fallback?.icon ?? "filter",
    visible: typeof obj.visible === "boolean" ? obj.visible : true,
    builtIn,
    match: obj.match === "any" ? "any" : "all",
    rules: normalizedRules,
  };
}

export function normalizeIdeaQuickFilters(raw: unknown): IdeaQuickFilterDefinition[] {
  const defaults = getDefaultIdeaQuickFilters();
  if (!Array.isArray(raw)) return defaults;

  const normalized = raw
    .map((row) => normalizeDefinition(row))
    .filter((row): row is IdeaQuickFilterDefinition => Boolean(row));

  if (normalized.length === 0) return defaults;

  const seen = new Set<string>();
  const deduped = normalized.filter((def) => {
    if (seen.has(def.id)) return false;
    seen.add(def.id);
    return true;
  });

  for (const def of defaults) {
    if (!seen.has(def.id)) deduped.push(def);
  }

  return deduped;
}

export function serializeIdeaQuickFilters(
  defs: IdeaQuickFilterDefinition[],
): IdeaQuickFilterDefinition[] {
  return normalizeIdeaQuickFilters(defs);
}

export function cleanActiveIdeaQuickFilterIds(
  activeIds: string[],
  defs: IdeaQuickFilterDefinition[],
): string[] {
  const visibleIds = new Set(defs.filter((def) => def.visible).map((def) => def.id));
  const out: string[] = [];
  for (const id of activeIds) {
    if (!visibleIds.has(id) || out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

export function getActiveIdeaQuickFilterDefinitions(
  activeIds: string[],
  defs: IdeaQuickFilterDefinition[],
): IdeaQuickFilterDefinition[] {
  const byId = new Map(defs.filter((def) => def.visible).map((def) => [def.id, def]));
  return cleanActiveIdeaQuickFilterIds(activeIds, defs)
    .map((id) => byId.get(id))
    .filter((def): def is IdeaQuickFilterDefinition => Boolean(def));
}

function ideaHasAttachments(idea: Idea): boolean {
  return Array.isArray(idea.attachments) && idea.attachments.length > 0;
}

function ideaHasText(idea: Idea, value: string): boolean {
  const needle = value.trim().toLowerCase();
  if (!needle) return false;
  const suggestions = ideaAiSuggestions(idea);
  const related = suggestions.relatedResources ?? [];
  const fields = [
    idea.title ?? "",
    stripHtml(idea.content),
    idea.voice_transcript ?? "",
    previewIdeaTitle(idea, 500),
    previewIdeaBody(idea, 2000),
    displayCategory(idea.category),
    idea.source_type,
    idea.capture_kind,
    idea.status,
    suggestions.summary,
    suggestions.coreInsight,
    suggestions.suggestedNextStep,
    suggestions.possibleUse,
    suggestions.clarifyingQuestion,
    suggestions.model,
    ...(idea.destinations ?? []),
    ...ideaTags(idea),
    ...related.flatMap((resource) => [
      resource.title,
      resource.subtitle ?? "",
      resource.explanation,
      resource.source ?? "",
      resource.url ?? "",
    ]),
  ];
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

export function matchesBuiltInIdeaQuickFilter(
  idea: Idea,
  id: IdeaBuiltinQuickFilterId,
  nowMs: number = Date.now(),
): boolean {
  const tagCount = ideaTags(idea).length;
  const linked = ideaHasAnyLinks(idea);
  switch (id) {
    case "recent": {
      const ts = new Date(idea.created_at).getTime();
      return Number.isFinite(ts) && nowMs - ts <= 14 * 24 * 60 * 60 * 1000;
    }
    case "unreviewed":
      return idea.status === "captured";
    case "hasTags":
      return tagCount > 0;
    case "noTags":
      return tagCount === 0;
    case "linked":
      return linked;
    case "unlinked":
      return !linked;
    case "archived":
      return idea.status === "archived";
    default:
      return true;
  }
}

export function matchesIdeaQuickFilterRule(
  idea: Idea,
  rule: IdeaQuickFilterRule,
  nowMs: number = Date.now(),
): boolean {
  switch (rule.field) {
    case "builtin":
      return isIdeaBuiltinQuickFilterId(rule.value)
        ? matchesBuiltInIdeaQuickFilter(idea, rule.value, nowMs)
        : false;
    case "sourceType":
      return idea.source_type === rule.value;
    case "category":
      return displayCategory(idea.category) === rule.value;
    case "status":
      return idea.status === rule.value;
    case "captureKind":
      return idea.capture_kind === rule.value;
    case "tag": {
      if (typeof rule.value !== "string") return false;
      const needle = rule.value.trim().toLowerCase();
      if (!needle) return false;
      return ideaTags(idea).some((tag) => tag.toLowerCase().includes(needle));
    }
    case "related": {
      const present = ideaHasAnyLinks(idea);
      return rule.operator === "missing" ? !present : present;
    }
    case "attachments": {
      const present = ideaHasAttachments(idea);
      return rule.operator === "missing" ? !present : present;
    }
    case "dateAdded": {
      if (typeof rule.value !== "number") return false;
      const ts = new Date(idea.created_at).getTime();
      if (!Number.isFinite(ts)) return false;
      return ts >= nowMs - rule.value * 24 * 60 * 60 * 1000;
    }
    case "text":
      return typeof rule.value === "string" ? ideaHasText(idea, rule.value) : false;
    default:
      return true;
  }
}

export function matchesIdeaQuickFilterDefinition(
  idea: Idea,
  def: IdeaQuickFilterDefinition,
  nowMs: number = Date.now(),
): boolean {
  if (def.rules.length === 0) return true;
  const matcher = (rule: IdeaQuickFilterRule) =>
    matchesIdeaQuickFilterRule(idea, rule, nowMs);
  return def.match === "any" ? def.rules.some(matcher) : def.rules.every(matcher);
}

export function ideaQuickFiltersNeedMinuteTicker(
  activeIds: string[],
  defs: IdeaQuickFilterDefinition[],
): boolean {
  return getActiveIdeaQuickFilterDefinitions(activeIds, defs).some((def) =>
    def.rules.some(
      (rule) =>
        rule.field === "dateAdded" ||
        (rule.field === "builtin" && rule.value === "recent"),
    ),
  );
}

export function getIdeaQuickFilterDisplayLabel(
  def: IdeaQuickFilterDefinition,
  builtInLabels: Record<IdeaBuiltinQuickFilterId, string>,
): string {
  if (
    isIdeaBuiltinQuickFilterId(def.id) &&
    def.label === IDEA_DEFAULT_QUICK_FILTER_LABELS[def.id]
  ) {
    return builtInLabels[def.id];
  }
  return def.label;
}

export function hasIncompleteIdeaQuickFilterDraft(
  defs: IdeaQuickFilterDefinition[],
): boolean {
  return defs.some(
    (def) =>
      !def.label.trim() ||
      def.rules.length === 0 ||
      def.rules.some((rule) => !isIdeaQuickFilterRuleComplete(rule)),
  );
}
