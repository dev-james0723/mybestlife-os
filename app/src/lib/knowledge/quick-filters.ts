import type { ContentType, ItemStatus, KnowledgeItem } from "@/types/knowledge";
import { CONTENT_TYPES } from "@/types/knowledge";
import type { KnowledgeCategory, Provider, SourceType } from "@/types/knowledge-source";
import { SOURCE_TYPES } from "@/types/knowledge-source";
import { KNOWLEDGE_CATEGORY_ORDER } from "@/lib/knowledge/labels";
import { getKnowledgeDisplayContentType } from "@/lib/knowledge/display-content-type";

export const KNOWLEDGE_BUILTIN_QUICK_FILTER_IDS = [
  "favorite",
  "recent",
  "social",
  "github",
  "hasMedia",
  "hasSource",
  "aiGenerated",
  "needsReview",
] as const;

export type KnowledgeBuiltinQuickFilterId =
  (typeof KNOWLEDGE_BUILTIN_QUICK_FILTER_IDS)[number];

export const KNOWLEDGE_QUICK_FILTER_ICON_KEYS = [
  "clock",
  "users",
  "gitBranch",
  "image",
  "link",
  "sparkles",
  "alertTriangle",
  "filter",
  "tag",
  "file",
  "video",
  "code",
  "bookmark",
  "star",
  "globe",
] as const;

export type KnowledgeQuickFilterIconKey =
  (typeof KNOWLEDGE_QUICK_FILTER_ICON_KEYS)[number];

export const KNOWLEDGE_QUICK_FILTER_FIELDS = [
  "builtin",
  "contentType",
  "category",
  "provider",
  "sourceType",
  "status",
  "tag",
  "sourceUrl",
  "media",
  "dateAdded",
  "text",
] as const;

export type KnowledgeQuickFilterRuleField =
  (typeof KNOWLEDGE_QUICK_FILTER_FIELDS)[number];

export type KnowledgeQuickFilterRuleOperator =
  | "is"
  | "contains"
  | "present"
  | "missing"
  | "withinDays";

export type KnowledgeQuickFilterRuleValue = string | number | null;

export type KnowledgeQuickFilterRule = {
  id: string;
  field: KnowledgeQuickFilterRuleField;
  operator: KnowledgeQuickFilterRuleOperator;
  value: KnowledgeQuickFilterRuleValue;
};

export type KnowledgeQuickFilterDefinition = {
  id: string;
  label: string;
  icon: KnowledgeQuickFilterIconKey;
  visible: boolean;
  builtIn: boolean;
  match: "all" | "any";
  rules: KnowledgeQuickFilterRule[];
};

export const KNOWLEDGE_QUICK_FILTER_PROVIDER_VALUES: Provider[] = [
  "web",
  "youtube",
  "x",
  "facebook",
  "instagram",
  "threads",
  "reddit",
  "github",
  "local",
];

export const KNOWLEDGE_QUICK_FILTER_STATUS_VALUES: ItemStatus[] = [
  "processing",
  "ready",
  "error",
];

export const KNOWLEDGE_DEFAULT_QUICK_FILTER_LABELS: Record<
  KnowledgeBuiltinQuickFilterId,
  string
> = {
  favorite: "Favorite",
  recent: "Recent",
  social: "Social",
  github: "GitHub",
  hasMedia: "Has media",
  hasSource: "Has source link",
  aiGenerated: "AI-tagged",
  needsReview: "Needs review",
};

const DEFAULT_ICON_BY_BUILTIN: Record<
  KnowledgeBuiltinQuickFilterId,
  KnowledgeQuickFilterIconKey
> = {
  favorite: "star",
  recent: "clock",
  social: "users",
  github: "gitBranch",
  hasMedia: "image",
  hasSource: "link",
  aiGenerated: "sparkles",
  needsReview: "alertTriangle",
};

const DEFAULT_RULE_BY_BUILTIN: Record<
  KnowledgeBuiltinQuickFilterId,
  KnowledgeQuickFilterRule
> = Object.fromEntries(
  KNOWLEDGE_BUILTIN_QUICK_FILTER_IDS.map((id) => [
    id,
    {
      id: `${id}-rule`,
      field: "builtin",
      operator: "is",
      value: id,
    } satisfies KnowledgeQuickFilterRule,
  ]),
) as Record<KnowledgeBuiltinQuickFilterId, KnowledgeQuickFilterRule>;

export function getDefaultKnowledgeQuickFilters(): KnowledgeQuickFilterDefinition[] {
  return KNOWLEDGE_BUILTIN_QUICK_FILTER_IDS.map((id) => ({
    id,
    label: KNOWLEDGE_DEFAULT_QUICK_FILTER_LABELS[id],
    icon: DEFAULT_ICON_BY_BUILTIN[id],
    visible: true,
    builtIn: true,
    match: "all",
    rules: [{ ...DEFAULT_RULE_BY_BUILTIN[id] }],
  }));
}

export function isKnowledgeBuiltinQuickFilterId(
  value: unknown,
): value is KnowledgeBuiltinQuickFilterId {
  return (
    typeof value === "string" &&
    (KNOWLEDGE_BUILTIN_QUICK_FILTER_IDS as readonly string[]).includes(value)
  );
}

export function operatorForKnowledgeQuickFilterField(
  field: KnowledgeQuickFilterRuleField,
): KnowledgeQuickFilterRuleOperator {
  switch (field) {
    case "tag":
    case "text":
      return "contains";
    case "sourceUrl":
    case "media":
      return "present";
    case "dateAdded":
      return "withinDays";
    default:
      return "is";
  }
}

export function defaultValueForKnowledgeQuickFilterField(
  field: KnowledgeQuickFilterRuleField,
): KnowledgeQuickFilterRuleValue {
  switch (field) {
    case "builtin":
      return "recent";
    case "contentType":
      return "article";
    case "category":
      return "article";
    case "provider":
      return "web";
    case "sourceType":
      return "article_url";
    case "status":
      return "ready";
    case "dateAdded":
      return 7;
    case "tag":
    case "text":
      return "";
    case "sourceUrl":
    case "media":
      return null;
    default:
      return null;
  }
}

export function createKnowledgeQuickFilterRule(
  field: KnowledgeQuickFilterRuleField = "text",
): KnowledgeQuickFilterRule {
  return {
    id: `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    field,
    operator: operatorForKnowledgeQuickFilterField(field),
    value: defaultValueForKnowledgeQuickFilterField(field),
  };
}

export function createKnowledgeQuickFilterDefinition(): KnowledgeQuickFilterDefinition {
  return {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    label: "New filter",
    icon: "filter",
    visible: true,
    builtIn: false,
    match: "all",
    rules: [createKnowledgeQuickFilterRule("text")],
  };
}

function isIconKey(value: unknown): value is KnowledgeQuickFilterIconKey {
  return (
    typeof value === "string" &&
    (KNOWLEDGE_QUICK_FILTER_ICON_KEYS as readonly string[]).includes(value)
  );
}

function isField(value: unknown): value is KnowledgeQuickFilterRuleField {
  return (
    typeof value === "string" &&
    (KNOWLEDGE_QUICK_FILTER_FIELDS as readonly string[]).includes(value)
  );
}

function isOperator(value: unknown): value is KnowledgeQuickFilterRuleOperator {
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

export function isKnowledgeQuickFilterRuleComplete(
  rule: KnowledgeQuickFilterRule,
): boolean {
  switch (rule.field) {
    case "tag":
    case "text":
      return typeof rule.value === "string" && rule.value.trim().length > 0;
    case "dateAdded":
      return typeof rule.value === "number" && rule.value >= 1;
    case "sourceUrl":
    case "media":
      return rule.operator === "present" || rule.operator === "missing";
    default:
      return typeof rule.value === "string" && rule.value.trim().length > 0;
  }
}

export function normalizeKnowledgeQuickFilterRule(
  raw: unknown,
): KnowledgeQuickFilterRule | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!isField(obj.field)) return null;

  const field = obj.field;
  let operator = isOperator(obj.operator)
    ? obj.operator
    : operatorForKnowledgeQuickFilterField(field);

  if (field === "sourceUrl" || field === "media") {
    operator = operator === "missing" ? "missing" : "present";
    return {
      id: normalizeStringValue(obj.id) ?? createKnowledgeQuickFilterRule(field).id,
      field,
      operator,
      value: null,
    };
  }

  if (operator !== operatorForKnowledgeQuickFilterField(field)) {
    operator = operatorForKnowledgeQuickFilterField(field);
  }

  let value: KnowledgeQuickFilterRuleValue = null;
  switch (field) {
    case "builtin":
      value = isKnowledgeBuiltinQuickFilterId(obj.value) ? obj.value : null;
      break;
    case "contentType":
      value =
        typeof obj.value === "string" &&
        (CONTENT_TYPES as readonly string[]).includes(obj.value)
          ? obj.value
          : null;
      break;
    case "category":
      value =
        typeof obj.value === "string" &&
        (KNOWLEDGE_CATEGORY_ORDER as readonly string[]).includes(obj.value)
          ? obj.value
          : null;
      break;
    case "provider":
      value =
        typeof obj.value === "string" &&
        (KNOWLEDGE_QUICK_FILTER_PROVIDER_VALUES as readonly string[]).includes(obj.value)
          ? obj.value
          : null;
      break;
    case "sourceType":
      value =
        typeof obj.value === "string" &&
        (SOURCE_TYPES as readonly string[]).includes(obj.value)
          ? obj.value
          : null;
      break;
    case "status":
      value =
        typeof obj.value === "string" &&
        (KNOWLEDGE_QUICK_FILTER_STATUS_VALUES as readonly string[]).includes(obj.value)
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
    id: normalizeStringValue(obj.id) ?? createKnowledgeQuickFilterRule(field).id,
    field,
    operator,
    value,
  };
}

function normalizeDefinition(raw: unknown): KnowledgeQuickFilterDefinition | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = normalizeStringValue(obj.id);
  if (!id) return null;

  const builtIn = isKnowledgeBuiltinQuickFilterId(id);
  const fallback = builtIn
    ? getDefaultKnowledgeQuickFilters().find((def) => def.id === id)
    : null;

  const rules = Array.isArray(obj.rules)
    ? obj.rules
        .map((rule) => normalizeKnowledgeQuickFilterRule(rule))
        .filter((rule): rule is KnowledgeQuickFilterRule => Boolean(rule))
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

export function normalizeKnowledgeQuickFilters(
  raw: unknown,
): KnowledgeQuickFilterDefinition[] {
  const defaults = getDefaultKnowledgeQuickFilters();
  if (!Array.isArray(raw)) return defaults;

  const normalized = raw
    .map((row) => normalizeDefinition(row))
    .filter((row): row is KnowledgeQuickFilterDefinition => Boolean(row));

  if (normalized.length === 0) return defaults;

  const seen = new Set<string>();
  const deduped = normalized.filter((def) => {
    if (seen.has(def.id)) return false;
    seen.add(def.id);
    return true;
  });

  for (const def of defaults) {
    if (seen.has(def.id)) continue;
    if (def.id === "favorite") {
      deduped.unshift(def);
    } else {
      deduped.push(def);
    }
    seen.add(def.id);
  }

  return deduped;
}

export function serializeKnowledgeQuickFilters(
  defs: KnowledgeQuickFilterDefinition[],
): KnowledgeQuickFilterDefinition[] {
  return normalizeKnowledgeQuickFilters(defs);
}

export function cleanActiveKnowledgeQuickFilterIds(
  activeIds: string[],
  defs: KnowledgeQuickFilterDefinition[],
): string[] {
  const visibleIds = new Set(defs.filter((def) => def.visible).map((def) => def.id));
  const out: string[] = [];
  for (const id of activeIds) {
    if (!visibleIds.has(id) || out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

export function getActiveKnowledgeQuickFilterDefinitions(
  activeIds: string[],
  defs: KnowledgeQuickFilterDefinition[],
): KnowledgeQuickFilterDefinition[] {
  const byId = new Map(defs.filter((def) => def.visible).map((def) => [def.id, def]));
  return cleanActiveKnowledgeQuickFilterIds(activeIds, defs)
    .map((id) => byId.get(id))
    .filter((def): def is KnowledgeQuickFilterDefinition => Boolean(def));
}

function knowledgeItemHasMedia(item: KnowledgeItem): boolean {
  return Boolean(
    item.thumbnailUrl?.trim() ||
      item.screenshotUrl?.trim() ||
      (item.category === "social_media" && item.embedHtml?.trim()),
  );
}

function knowledgeItemHasText(item: KnowledgeItem, value: string): boolean {
  const needle = value.trim().toLowerCase();
  if (!needle) return false;
  const fields = [
    item.title,
    item.aiTldr,
    item.aiSummary,
    item.aiContentOverview,
    item.rawContent,
    item.sourceUrl,
    item.sourceDomain,
    item.label,
    item.generatedTitle,
    ...(item.aiTags ?? []),
    ...(item.manualTags ?? []),
    ...(item.aiKeyInsights ?? []),
    ...(item.aiKeyQuotes ?? []),
    ...(item.aiQuestionsAnswered ?? []),
    ...(item.aiActionItems ?? []),
  ];
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

export function matchesBuiltInKnowledgeQuickFilter(
  item: KnowledgeItem,
  id: KnowledgeBuiltinQuickFilterId,
  nowMs: number = Date.now(),
): boolean {
  const recentCutoffMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  switch (id) {
    case "favorite":
      return item.isFavorite;
    case "recent": {
      const ts = new Date(item.dateAdded).getTime();
      return Number.isFinite(ts) && ts >= recentCutoffMs;
    }
    case "social":
      return (
        item.category === "social_media" || (item.sourceType?.startsWith("social_") ?? false)
      );
    case "github":
      return (
        item.provider === "github" ||
        item.sourceType === "github_repository" ||
        item.category === "repository"
      );
    case "hasMedia":
      return knowledgeItemHasMedia(item);
    case "hasSource":
      return Boolean(item.sourceUrl?.trim());
    case "aiGenerated":
      return item.aiTags.length > 0;
    case "needsReview":
      return (
        item.status === "error" ||
        Boolean(item.extractionStatus && item.extractionStatus !== "success")
      );
    default:
      return true;
  }
}

export function matchesKnowledgeQuickFilterRule(
  item: KnowledgeItem,
  rule: KnowledgeQuickFilterRule,
  nowMs: number = Date.now(),
): boolean {
  switch (rule.field) {
    case "builtin":
      return isKnowledgeBuiltinQuickFilterId(rule.value)
        ? matchesBuiltInKnowledgeQuickFilter(item, rule.value, nowMs)
        : false;
    case "contentType":
      return getKnowledgeDisplayContentType(item) === rule.value;
    case "category":
      return item.category === rule.value;
    case "provider":
      return item.provider === rule.value;
    case "sourceType":
      return item.sourceType === rule.value;
    case "status":
      return item.status === rule.value;
    case "tag": {
      if (typeof rule.value !== "string") return false;
      const needle = rule.value.trim().toLowerCase();
      if (!needle) return false;
      return [...item.aiTags, ...item.manualTags].some((tag) =>
        tag.toLowerCase().includes(needle),
      );
    }
    case "sourceUrl": {
      const present = Boolean(item.sourceUrl?.trim());
      return rule.operator === "missing" ? !present : present;
    }
    case "media": {
      const present = knowledgeItemHasMedia(item);
      return rule.operator === "missing" ? !present : present;
    }
    case "dateAdded": {
      if (typeof rule.value !== "number") return false;
      const ts = new Date(item.dateAdded).getTime();
      if (!Number.isFinite(ts)) return false;
      return ts >= nowMs - rule.value * 24 * 60 * 60 * 1000;
    }
    case "text":
      return typeof rule.value === "string"
        ? knowledgeItemHasText(item, rule.value)
        : false;
    default:
      return true;
  }
}

export function matchesKnowledgeQuickFilterDefinition(
  item: KnowledgeItem,
  def: KnowledgeQuickFilterDefinition,
  nowMs: number = Date.now(),
): boolean {
  if (def.rules.length === 0) return true;
  const matcher = (rule: KnowledgeQuickFilterRule) =>
    matchesKnowledgeQuickFilterRule(item, rule, nowMs);
  return def.match === "any" ? def.rules.some(matcher) : def.rules.every(matcher);
}

export function knowledgeQuickFiltersNeedMinuteTicker(
  activeIds: string[],
  defs: KnowledgeQuickFilterDefinition[],
): boolean {
  return getActiveKnowledgeQuickFilterDefinitions(activeIds, defs).some((def) =>
    def.rules.some(
      (rule) =>
        rule.field === "dateAdded" ||
        (rule.field === "builtin" && rule.value === "recent"),
    ),
  );
}

export function getKnowledgeQuickFilterDisplayLabel(
  def: KnowledgeQuickFilterDefinition,
  builtInLabels: Record<KnowledgeBuiltinQuickFilterId, string>,
): string {
  if (
    isKnowledgeBuiltinQuickFilterId(def.id) &&
    def.label === KNOWLEDGE_DEFAULT_QUICK_FILTER_LABELS[def.id]
  ) {
    return builtInLabels[def.id];
  }
  return def.label;
}

export function hasIncompleteKnowledgeQuickFilterDraft(
  defs: KnowledgeQuickFilterDefinition[],
): boolean {
  return defs.some(
    (def) =>
      !def.label.trim() ||
      def.rules.length === 0 ||
      def.rules.some((rule) => !isKnowledgeQuickFilterRuleComplete(rule)),
  );
}

export type {
  ContentType,
  KnowledgeCategory,
  Provider,
  SourceType,
};
