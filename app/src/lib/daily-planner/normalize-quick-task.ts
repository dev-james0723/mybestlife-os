import type { QuickTaskDef } from "@/types/database";

/** Accept camelCase or legacy snake_case from JSON. */
export function normalizeQuickTaskDef(raw: unknown): QuickTaskDef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name : null;
  const icon = typeof o.icon === "string" ? o.icon : null;
  const blocks = typeof o.blocks === "number" && Number.isFinite(o.blocks) ? o.blocks : null;
  const iconClass = typeof o.iconClass === "string" ? o.iconClass : null;
  if (!name || !icon || blocks == null || !iconClass) return null;
  const iconUrlRaw = o.iconUrl ?? o.icon_url;
  const presetKeyRaw = o.presetKey ?? o.preset_key;
  return {
    name,
    icon,
    blocks,
    iconClass,
    iconUrl: typeof iconUrlRaw === "string" && iconUrlRaw.trim() ? iconUrlRaw.trim() : null,
    presetKey:
      typeof presetKeyRaw === "string" && presetKeyRaw.trim() ? presetKeyRaw.trim() : null,
  };
}

export function normalizeQuickTasksJson(raw: unknown): QuickTaskDef[] | null {
  if (!Array.isArray(raw)) return null;
  const out: QuickTaskDef[] = [];
  for (const row of raw) {
    const n = normalizeQuickTaskDef(row);
    if (n) out.push(n);
  }
  return out.length > 0 ? out : null;
}
