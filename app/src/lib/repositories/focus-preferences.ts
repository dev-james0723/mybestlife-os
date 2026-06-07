import { createClient } from "@/lib/supabase/client";
import type { FocusPreference } from "@/types/database";
import { getCurrentUserId, LOCAL_DEV_USER_ID } from "./current-user";
import {
  isBrowserLocalFocusRealityMode,
  isRecord,
  nowIso,
  readLocalJson,
  safeBoolean,
  safeNumber,
  safeString,
  safeStringArray,
  writeLocalJson,
} from "./focus-reality-local";

const LOCAL_FOCUS_PREFERENCES_KEY = "mylifeos:focus-preferences:v1";

export const DEFAULT_FOCUS_PREFERENCE_VALUES = {
  low_stimulation_mode_enabled: true,
  distraction_gate_enabled: true,
  urge_surfing_delay_seconds: 10,
  default_focus_minutes: 50,
  break_reminder_minutes: 50,
  high_stimulation_routes: [
    "/youtube-radar",
    "/ai-assistant",
    "/business-analyst",
    "/ideas",
    "/idea-capture",
    "/vault",
    "/software-vault",
  ],
  ai_access_requires_intention: true,
  show_actual_timeline_overlay: true,
} satisfies Omit<FocusPreference, "id" | "user_id" | "created_at" | "updated_at">;

export type UpdateFocusPreferenceInput = Partial<
  Omit<FocusPreference, "id" | "user_id" | "created_at" | "updated_at">
>;

function defaultFocusPreference(now = nowIso()): FocusPreference {
  return {
    id: "local-focus-preferences",
    user_id: LOCAL_DEV_USER_ID,
    ...DEFAULT_FOCUS_PREFERENCE_VALUES,
    created_at: now,
    updated_at: now,
  };
}

export function normalizeFocusPreference(value: unknown): FocusPreference {
  if (!isRecord(value)) return defaultFocusPreference();
  const fallback = defaultFocusPreference();
  return {
    id: safeString(value.id, fallback.id),
    user_id: safeString(value.user_id, fallback.user_id),
    low_stimulation_mode_enabled: safeBoolean(
      value.low_stimulation_mode_enabled,
      fallback.low_stimulation_mode_enabled,
    ),
    distraction_gate_enabled: safeBoolean(
      value.distraction_gate_enabled,
      fallback.distraction_gate_enabled,
    ),
    urge_surfing_delay_seconds: Math.min(
      60,
      Math.max(0, safeNumber(value.urge_surfing_delay_seconds, fallback.urge_surfing_delay_seconds)),
    ),
    default_focus_minutes: Math.min(
      240,
      Math.max(5, safeNumber(value.default_focus_minutes, fallback.default_focus_minutes)),
    ),
    break_reminder_minutes: Math.min(
      240,
      Math.max(5, safeNumber(value.break_reminder_minutes, fallback.break_reminder_minutes)),
    ),
    high_stimulation_routes:
      safeStringArray(value.high_stimulation_routes).length > 0
        ? safeStringArray(value.high_stimulation_routes)
        : fallback.high_stimulation_routes,
    ai_access_requires_intention: safeBoolean(
      value.ai_access_requires_intention,
      fallback.ai_access_requires_intention,
    ),
    show_actual_timeline_overlay: safeBoolean(
      value.show_actual_timeline_overlay,
      fallback.show_actual_timeline_overlay,
    ),
    created_at: safeString(value.created_at, fallback.created_at),
    updated_at: safeString(value.updated_at, fallback.updated_at),
  };
}

function readLocalPreference(): FocusPreference {
  return readLocalJson(
    LOCAL_FOCUS_PREFERENCES_KEY,
    defaultFocusPreference(),
    normalizeFocusPreference,
  );
}

function writeLocalPreference(preference: FocusPreference): FocusPreference {
  writeLocalJson(LOCAL_FOCUS_PREFERENCES_KEY, preference);
  return preference;
}

export const focusPreferencesRepository = {
  async getOrCreate(): Promise<FocusPreference> {
    if (isBrowserLocalFocusRealityMode()) {
      const local = readLocalPreference();
      writeLocalPreference(local);
      return local;
    }

    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("focus_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return normalizeFocusPreference(data);

    const { data: created, error: createError } = await supabase
      .from("focus_preferences")
      .insert({ user_id: userId, ...DEFAULT_FOCUS_PREFERENCE_VALUES })
      .select()
      .single();
    if (createError) throw createError;
    return normalizeFocusPreference(created);
  },

  async update(input: UpdateFocusPreferenceInput): Promise<FocusPreference> {
    if (isBrowserLocalFocusRealityMode()) {
      const next = normalizeFocusPreference({
        ...readLocalPreference(),
        ...input,
        updated_at: nowIso(),
      });
      return writeLocalPreference(next);
    }

    const supabase = createClient();
    const userId = await getCurrentUserId();
    const existing = await this.getOrCreate();
    const { data, error } = await supabase
      .from("focus_preferences")
      .update({ ...input, updated_at: nowIso() })
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return normalizeFocusPreference(data);
  },
};
