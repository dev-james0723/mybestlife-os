import { BIO_LAB_INTENTION_MAX } from "@/lib/bio-lab/bio-lab-field-limits";

export const FOCUS_SPRINT_TEMPLATES_STORAGE_KEY = "bio-lab-focus-sprint-templates-v1";

export const MAX_FOCUS_SPRINT_TEMPLATES = 24;

export type StoredFocusSprintTemplate = {
  id: string;
  label: string;
  workMinutes: number;
  breakMinutes: number;
};

function isStoredTemplate(x: unknown): x is StoredFocusSprintTemplate {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.label === "string" &&
    typeof o.workMinutes === "number" &&
    Number.isFinite(o.workMinutes) &&
    typeof o.breakMinutes === "number" &&
    Number.isFinite(o.breakMinutes)
  );
}

export function parseFocusSprintTemplatesJson(raw: string | null): StoredFocusSprintTemplate[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredTemplate);
  } catch {
    return [];
  }
}

export function loadFocusSprintTemplates(): StoredFocusSprintTemplate[] {
  if (typeof window === "undefined") return [];
  return parseFocusSprintTemplatesJson(
    window.localStorage.getItem(FOCUS_SPRINT_TEMPLATES_STORAGE_KEY),
  );
}

export function persistFocusSprintTemplates(list: StoredFocusSprintTemplate[]): void {
  const trimmed = list.slice(0, MAX_FOCUS_SPRINT_TEMPLATES);
  window.localStorage.setItem(FOCUS_SPRINT_TEMPLATES_STORAGE_KEY, JSON.stringify(trimmed));
}

function newTemplateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Prepends a template; caps list length. */
export function appendFocusSprintTemplate(
  prev: StoredFocusSprintTemplate[],
  label: string,
  workMinutes: number,
  breakMinutes: number,
): StoredFocusSprintTemplate[] {
  const trimmedLabel = label.trim().slice(0, BIO_LAB_INTENTION_MAX);
  const entry: StoredFocusSprintTemplate = {
    id: newTemplateId(),
    label: trimmedLabel,
    workMinutes,
    breakMinutes,
  };
  return [entry, ...prev].slice(0, MAX_FOCUS_SPRINT_TEMPLATES);
}

export function removeFocusSprintTemplate(
  prev: StoredFocusSprintTemplate[],
  id: string,
): StoredFocusSprintTemplate[] {
  return prev.filter((t) => t.id !== id);
}
