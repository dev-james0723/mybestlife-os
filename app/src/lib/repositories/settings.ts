import { createClient } from "@/lib/supabase/client";
import { hasDevLoginBypassCookie } from "@/lib/dev-login-bypass";
import { ensureError } from "@/lib/utils/ensure-error";
import type { NotificationPreferences, UserProfile } from "@/types/database";
import type { OSBuddyPetId, OSBuddyPosition } from "@/types/os-buddy";
import type { OSBuddyFreeRoamIntensity } from "@/lib/os-buddy/os-buddy-free-roam";
import {
  validateOSBuddyShortcutSettings,
  type OSBuddyShortcutSettings,
} from "@/lib/os-buddy/os-buddy-shortcuts";
import {
  validateOSBuddyBirthdayProfile,
  type OSBuddyBirthdayProfile,
} from "@/lib/os-buddy/os-buddy-birthday";
import { normalizeIdeaQuickFilters } from "@/lib/ideas/quick-filters";
import { normalizeKnowledgeCommandLightOpacity } from "@/lib/knowledge/command-light-preferences";
import { normalizeKnowledgeQuickFilters } from "@/lib/knowledge/quick-filters";

export type UpdateProfileInput = Partial<
  Pick<
    UserProfile,
    | "language"
    | "theme"
    | "timezone"
    | "weather_lat"
    | "weather_lon"
    | "weather_city"
    | "avatar_url"
    | "ui_theme"
    | "color_mode"
    | "focus_areas"
    | "motto"
    | "dashboard_cover_url"
    | "dashboard_widgets"
    | "widget_density"
    | "focus_mode"
    | "font_size_pref"
    | "greeting_tone"
    | "accent_color_hex"
    | "sidebar_width"
    | "sidebar_mobile_auto_collapse"
    | "ui_copy_mode"
    | "onboarding_completed"
    | "block_minutes"
    | "quick_tasks"
    | "knowledge_quick_filters"
    | "knowledge_command_light_opacity"
    | "idea_quick_filters"
    | "display_currency"
    | "quick_save_enabled"
    | "quick_save_default_destination"
    | "quick_save_require_review"
    | "os_buddy_pet_id"
    | "os_buddy_name"
    | "os_buddy_enabled"
    | "os_buddy_position"
    | "os_buddy_onboarding_completed"
    | "os_buddy_interaction_stats"
    | "os_buddy_unlocked_pets"
    | "os_buddy_birthday_enabled"
    | "os_buddy_birthday_month"
    | "os_buddy_birthday_day"
    | "os_buddy_birthday_year"
    | "os_buddy_birthday_show_age"
    | "os_buddy_birthday_reminder_enabled"
    | "os_buddy_birthday_timezone"
    | "os_buddy_birthday_last_celebrated_on"
    | "os_buddy_birthday_last_reminder_on"
    | "os_buddy_free_roam_enabled"
    | "os_buddy_free_roam_intensity"
    | "os_buddy_free_roam_return_home"
    | "os_buddy_free_roam_near_home_only"
    | "os_buddy_shortcut_settings"
  >
>;

const AVATARS_BUCKET = "avatars";
const AVATAR_OBJECT_PATH = "avatar";

const ACCEPTED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const OS_BUDDY_BIRTHDAY_PROFILE_COLUMNS = [
  "os_buddy_birthday_enabled",
  "os_buddy_birthday_month",
  "os_buddy_birthday_day",
  "os_buddy_birthday_year",
  "os_buddy_birthday_show_age",
  "os_buddy_birthday_reminder_enabled",
  "os_buddy_birthday_timezone",
  "os_buddy_birthday_last_celebrated_on",
  "os_buddy_birthday_last_reminder_on",
] as const;
const OS_BUDDY_FREE_ROAM_PROFILE_COLUMNS = [
  "os_buddy_free_roam_enabled",
  "os_buddy_free_roam_intensity",
  "os_buddy_free_roam_return_home",
  "os_buddy_free_roam_near_home_only",
] as const;
const OS_BUDDY_SHORTCUT_PROFILE_COLUMNS = ["os_buddy_shortcut_settings"] as const;
const KNOWLEDGE_QUICK_FILTER_PROFILE_COLUMNS = ["knowledge_quick_filters"] as const;
const KNOWLEDGE_COMMAND_LIGHT_PROFILE_COLUMNS = ["knowledge_command_light_opacity"] as const;
const IDEA_QUICK_FILTER_PROFILE_COLUMNS = ["idea_quick_filters"] as const;
const LOCAL_SETTINGS_PROFILE_KEY = "mylifeos:settings-profile:v1";
const LOCAL_NOTIFICATION_PREFERENCES_KEY = "mylifeos:notification-preferences:v1";
const LOCAL_SETTINGS_USER_ID = "00000000-0000-0000-0000-000000000000";

export type UpdateNotificationPreferencesInput = Partial<
  Pick<NotificationPreferences, "task_reminders" | "daily_summary" | "study_streak_reminders">
>;

function stringFromMeta(meta: Record<string, unknown> | undefined, key: string): string | null {
  const v = meta?.[key];
  return typeof v === "string" && v.trim() ? v : null;
}

/** Drop keys whose value is `undefined` so Supabase never receives them. */
function omitUndefinedKeys<V extends Record<string, unknown>>(obj: V): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function omitKeys(
  obj: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const drop = new Set(keys);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!drop.has(k)) out[k] = v;
  }
  return out;
}

function isBrowserLocalSettingsMode(): boolean {
  return typeof window !== "undefined" && hasDevLoginBypassCookie();
}

function defaultLocalProfile(now = new Date().toISOString()): UserProfile {
  return normalizeUserProfile({
    id: LOCAL_SETTINGS_USER_ID,
    email: "dev-bypass@mylifeos.local",
    full_name: "Dev Bypass",
    avatar_url: null,
    language: "en",
    timezone:
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        : "UTC",
    weather_lat: null,
    weather_lon: null,
    weather_city: null,
    theme: "light",
    ui_theme: "default",
    color_mode: "light",
    focus_areas: [],
    motto: null,
    dashboard_cover_url: null,
    dashboard_widgets: {},
    widget_density: "comfortable",
    focus_mode: false,
    font_size_pref: "medium",
    greeting_tone: "friendly",
    accent_color_hex: null,
    sidebar_width: "default",
    sidebar_mobile_auto_collapse: true,
    ui_copy_mode: "en",
    onboarding_completed: true,
    block_minutes: 10,
    quick_tasks: null,
    knowledge_quick_filters: [],
    knowledge_command_light_opacity: 82,
    idea_quick_filters: [],
    display_currency: "USD",
    quick_save_enabled: false,
    quick_save_default_destination: "review",
    quick_save_require_review: true,
    os_buddy_pet_id: "xiaoba",
    os_buddy_name: "Xiaoba",
    os_buddy_enabled: true,
    os_buddy_position: { x: null, y: null, anchor: "bottom-left" },
    os_buddy_onboarding_completed: false,
    os_buddy_interaction_stats: {},
    os_buddy_unlocked_pets: ["xiaoba", "doge"],
    os_buddy_birthday_enabled: false,
    os_buddy_birthday_month: null,
    os_buddy_birthday_day: null,
    os_buddy_birthday_year: null,
    os_buddy_birthday_show_age: false,
    os_buddy_birthday_reminder_enabled: true,
    os_buddy_birthday_timezone: null,
    os_buddy_birthday_last_celebrated_on: null,
    os_buddy_birthday_last_reminder_on: null,
    os_buddy_free_roam_enabled: false,
    os_buddy_free_roam_intensity: "balanced",
    os_buddy_free_roam_return_home: true,
    os_buddy_free_roam_near_home_only: true,
    os_buddy_shortcut_settings: coerceOSBuddyShortcutSettings(null),
    created_at: now,
    updated_at: now,
  });
}

function readLocalProfile(): UserProfile {
  if (typeof window === "undefined") return defaultLocalProfile();
  try {
    const raw = window.localStorage.getItem(LOCAL_SETTINGS_PROFILE_KEY);
    if (!raw) return defaultLocalProfile();
    return normalizeUserProfile(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return defaultLocalProfile();
  }
}

function writeLocalProfile(profile: UserProfile): UserProfile {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_SETTINGS_PROFILE_KEY, JSON.stringify(profile));
  }
  return profile;
}

function defaultLocalNotificationPreferences(now = new Date().toISOString()): NotificationPreferences {
  return {
    id: "local-notification-preferences",
    user_id: LOCAL_SETTINGS_USER_ID,
    task_reminders: true,
    daily_summary: true,
    study_streak_reminders: true,
    created_at: now,
    updated_at: now,
  };
}

function readLocalNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return defaultLocalNotificationPreferences();
  try {
    const raw = window.localStorage.getItem(LOCAL_NOTIFICATION_PREFERENCES_KEY);
    if (!raw) return defaultLocalNotificationPreferences();
    const value = JSON.parse(raw) as Partial<NotificationPreferences>;
    const fallback = defaultLocalNotificationPreferences();
    return {
      id: typeof value.id === "string" ? value.id : fallback.id,
      user_id: typeof value.user_id === "string" ? value.user_id : fallback.user_id,
      task_reminders:
        typeof value.task_reminders === "boolean" ? value.task_reminders : fallback.task_reminders,
      daily_summary:
        typeof value.daily_summary === "boolean" ? value.daily_summary : fallback.daily_summary,
      study_streak_reminders:
        typeof value.study_streak_reminders === "boolean"
          ? value.study_streak_reminders
          : fallback.study_streak_reminders,
      created_at: typeof value.created_at === "string" ? value.created_at : fallback.created_at,
      updated_at: typeof value.updated_at === "string" ? value.updated_at : fallback.updated_at,
    };
  } catch {
    return defaultLocalNotificationPreferences();
  }
}

function writeLocalNotificationPreferences(
  preferences: NotificationPreferences,
): NotificationPreferences {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_NOTIFICATION_PREFERENCES_KEY, JSON.stringify(preferences));
  }
  return preferences;
}

function coerceNumOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function coerceQuickSaveDefaultDestination(
  v: unknown,
): UserProfile["quick_save_default_destination"] {
  if (v === "knowledge" || v === "idea" || v === "review") return v;
  return "review";
}

function coerceOSBuddyPetId(v: unknown): OSBuddyPetId {
  return v === "doge" ? "doge" : "xiaoba";
}

function coerceOSBuddyPosition(v: unknown): OSBuddyPosition {
  if (!v || typeof v !== "object") {
    return { x: null, y: null, anchor: "bottom-left" };
  }
  const row = v as Record<string, unknown>;
  const x = typeof row.x === "number" && Number.isFinite(row.x) ? row.x : null;
  const y = typeof row.y === "number" && Number.isFinite(row.y) ? row.y : null;
  const anchor =
    row.anchor === "bottom-right" ||
    row.anchor === "bottom-left" ||
    row.anchor === "top-right" ||
    row.anchor === "top-left" ||
    row.anchor === "custom"
      ? row.anchor
      : "bottom-left";
  return { x, y, anchor };
}

function coerceOSBuddyInteractionStats(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as Record<string, unknown>;
}

function coerceOSBuddyUnlockedPets(v: unknown): OSBuddyPetId[] {
  if (!Array.isArray(v)) return ["xiaoba", "doge"];
  const cleaned = v
    .map((item) => coerceOSBuddyPetId(item))
    .filter((item, idx, list) => list.indexOf(item) === idx);
  if (!cleaned.includes("xiaoba")) cleaned.unshift("xiaoba");
  if (!cleaned.includes("doge")) cleaned.push("doge");
  return cleaned;
}

function coerceOSBuddyFreeRoamIntensity(v: unknown): OSBuddyFreeRoamIntensity {
  if (v === "subtle" || v === "lively") return v;
  return "balanced";
}

function coerceOSBuddyShortcutSettings(v: unknown): OSBuddyShortcutSettings {
  return validateOSBuddyShortcutSettings(
    v as Partial<OSBuddyShortcutSettings> | null | undefined,
  );
}

function coerceOSBuddyBirthdayProfile(row: Record<string, unknown>): OSBuddyBirthdayProfile {
  return validateOSBuddyBirthdayProfile({
    enabled: row.os_buddy_birthday_enabled as boolean | undefined,
    month: row.os_buddy_birthday_month as number | null,
    day: row.os_buddy_birthday_day as number | null,
    year: row.os_buddy_birthday_year as number | null,
    showAge: row.os_buddy_birthday_show_age as boolean | undefined,
    reminderEnabled: row.os_buddy_birthday_reminder_enabled as boolean | undefined,
    timezone: row.os_buddy_birthday_timezone as string | null,
    lastCelebratedOn: row.os_buddy_birthday_last_celebrated_on as string | null,
    lastReminderOn: row.os_buddy_birthday_last_reminder_on as string | null,
  });
}

function normalizeUserProfile(row: Record<string, unknown>): UserProfile {
  const base = row as unknown as UserProfile;
  const birthday = coerceOSBuddyBirthdayProfile(row);
  const raw = row.display_currency;
  const display_currency =
    typeof raw === "string" && /^[A-Za-z]{3}$/.test(raw) ? raw.toUpperCase() : "USD";
  const weather_city =
    typeof row.weather_city === "string" && row.weather_city.trim() ? row.weather_city.trim() : null;
  const freeRoamFields = {
    ...(typeof row.os_buddy_free_roam_enabled === "boolean"
      ? { os_buddy_free_roam_enabled: row.os_buddy_free_roam_enabled }
      : {}),
    ...(typeof row.os_buddy_free_roam_intensity === "string"
      ? {
          os_buddy_free_roam_intensity: coerceOSBuddyFreeRoamIntensity(
            row.os_buddy_free_roam_intensity,
          ),
        }
      : {}),
    ...(typeof row.os_buddy_free_roam_return_home === "boolean"
      ? { os_buddy_free_roam_return_home: row.os_buddy_free_roam_return_home }
      : {}),
    ...(typeof row.os_buddy_free_roam_near_home_only === "boolean"
      ? { os_buddy_free_roam_near_home_only: row.os_buddy_free_roam_near_home_only }
      : {}),
  };
  return {
    ...base,
    knowledge_quick_filters: normalizeKnowledgeQuickFilters(row.knowledge_quick_filters),
    knowledge_command_light_opacity: normalizeKnowledgeCommandLightOpacity(
      row.knowledge_command_light_opacity,
    ),
    idea_quick_filters: normalizeIdeaQuickFilters(row.idea_quick_filters),
    display_currency,
    weather_lat: coerceNumOrNull(row.weather_lat),
    weather_lon: coerceNumOrNull(row.weather_lon),
    weather_city,
    quick_save_enabled:
      typeof row.quick_save_enabled === "boolean" ? row.quick_save_enabled : false,
    quick_save_default_destination: coerceQuickSaveDefaultDestination(
      row.quick_save_default_destination,
    ),
    quick_save_require_review:
      typeof row.quick_save_require_review === "boolean"
        ? row.quick_save_require_review
        : true,
    os_buddy_pet_id: coerceOSBuddyPetId(row.os_buddy_pet_id),
    os_buddy_name:
      typeof row.os_buddy_name === "string" && row.os_buddy_name.trim()
        ? row.os_buddy_name.trim()
        : "Xiaoba",
    os_buddy_enabled:
      typeof row.os_buddy_enabled === "boolean" ? row.os_buddy_enabled : true,
    os_buddy_position: coerceOSBuddyPosition(row.os_buddy_position),
    os_buddy_onboarding_completed:
      typeof row.os_buddy_onboarding_completed === "boolean"
        ? row.os_buddy_onboarding_completed
        : false,
    os_buddy_interaction_stats: coerceOSBuddyInteractionStats(row.os_buddy_interaction_stats),
    os_buddy_unlocked_pets: coerceOSBuddyUnlockedPets(row.os_buddy_unlocked_pets),
    os_buddy_birthday_enabled: birthday.enabled,
    os_buddy_birthday_month: birthday.month,
    os_buddy_birthday_day: birthday.day,
    os_buddy_birthday_year: birthday.year ?? null,
    os_buddy_birthday_show_age: Boolean(birthday.showAge),
    os_buddy_birthday_reminder_enabled: birthday.reminderEnabled !== false,
    os_buddy_birthday_timezone: birthday.timezone ?? null,
    os_buddy_birthday_last_celebrated_on: birthday.lastCelebratedOn ?? null,
    os_buddy_birthday_last_reminder_on: birthday.lastReminderOn ?? null,
    os_buddy_shortcut_settings: coerceOSBuddyShortcutSettings(
      row.os_buddy_shortcut_settings,
    ),
    ...freeRoamFields,
  };
}

/**
 * PostgREST / Supabase when the remote schema has no column for a field we send
 * (e.g. migration not applied yet on production).
 */
function isMissingProfilesColumnError(err: unknown, column: string): boolean {
  const o = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
  const code = typeof o.code === "string" ? o.code : "";
  const msg = typeof o.message === "string" ? o.message.toLowerCase() : "";
  const details = typeof o.details === "string" ? o.details.toLowerCase() : "";
  const hint = typeof o.hint === "string" ? o.hint.toLowerCase() : "";
  const combined = `${msg} ${details} ${hint}`;
  const colLower = column.toLowerCase();
  if (!combined.includes(colLower)) return false;
  return (
    code === "PGRST204" ||
    combined.includes("schema cache") ||
    combined.includes("could not find") ||
    combined.includes("does not exist")
  );
}

export const settingsRepository = {
  async getProfile(): Promise<UserProfile> {
    if (isBrowserLocalSettingsMode()) {
      const local = readLocalProfile();
      writeLocalProfile(local);
      return local;
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw ensureError(userError, "Not authenticated");
    if (!user) throw new Error("Not authenticated");

    const { data: existing, error: selectError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (selectError) throw selectError;
    if (existing) return normalizeUserProfile(existing as Record<string, unknown>);

    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const fullName = stringFromMeta(meta, "full_name") ?? stringFromMeta(meta, "name");
    const avatarUrl = stringFromMeta(meta, "avatar_url");

    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email ?? null,
        full_name: fullName,
        avatar_url: avatarUrl,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: raced, error: retryErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        if (retryErr) throw retryErr;
        if (raced) return normalizeUserProfile(raced as Record<string, unknown>);
      }
      throw insertError;
    }
    return normalizeUserProfile(created as Record<string, unknown>);
  },

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    if (isBrowserLocalSettingsMode()) {
      const next = normalizeUserProfile({
        ...readLocalProfile(),
        ...(input as Record<string, unknown>),
        updated_at: new Date().toISOString(),
      });
      return writeLocalProfile(next);
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw ensureError(userError, "Not authenticated");
    if (!user) throw new Error("Not authenticated");

    const normalizedInput: UpdateProfileInput = {
      ...input,
      ...(input.display_currency !== undefined
        ? { display_currency: input.display_currency.trim().toUpperCase() }
        : {}),
      ...(input.knowledge_command_light_opacity !== undefined
        ? {
            knowledge_command_light_opacity: normalizeKnowledgeCommandLightOpacity(
              input.knowledge_command_light_opacity,
            ),
          }
        : {}),
      ...(input.os_buddy_pet_id !== undefined
        ? { os_buddy_pet_id: coerceOSBuddyPetId(input.os_buddy_pet_id) }
        : {}),
      ...(input.os_buddy_name !== undefined
        ? { os_buddy_name: input.os_buddy_name.trim() || "Xiaoba" }
        : {}),
      ...(input.os_buddy_position !== undefined
        ? { os_buddy_position: coerceOSBuddyPosition(input.os_buddy_position) }
        : {}),
      ...(input.os_buddy_unlocked_pets !== undefined
        ? { os_buddy_unlocked_pets: coerceOSBuddyUnlockedPets(input.os_buddy_unlocked_pets) }
        : {}),
      ...(input.os_buddy_free_roam_intensity !== undefined
        ? {
            os_buddy_free_roam_intensity: coerceOSBuddyFreeRoamIntensity(
              input.os_buddy_free_roam_intensity,
            ),
          }
        : {}),
      ...(input.os_buddy_shortcut_settings !== undefined
        ? {
            os_buddy_shortcut_settings: coerceOSBuddyShortcutSettings(
              input.os_buddy_shortcut_settings,
            ),
          }
        : {}),
    };

    let payload = omitUndefinedKeys({
      ...(normalizedInput as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    });

    const runUpdate = () =>
      supabase.from("profiles").update(payload).eq("id", user.id).select().single();

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { data, error } = await runUpdate();

      if (!error && data) return normalizeUserProfile(data as Record<string, unknown>);

      // No row matched (e.g. profile row missing). getProfile() inserts if needed, then retry.
      if (error?.code === "PGRST116") {
        await settingsRepository.getProfile();
        continue;
      }

      if (error && "block_minutes" in payload && isMissingProfilesColumnError(error, "block_minutes")) {
        const { block_minutes: _drop, ...rest } = payload;
        payload = rest;
        continue;
      }

      if (error && "quick_tasks" in payload && isMissingProfilesColumnError(error, "quick_tasks")) {
        const { quick_tasks: _drop, ...rest } = payload;
        payload = rest;
        continue;
      }

      if (
        error &&
        "knowledge_quick_filters" in payload &&
        isMissingProfilesColumnError(error, "knowledge_quick_filters")
      ) {
        payload = omitKeys(payload, KNOWLEDGE_QUICK_FILTER_PROFILE_COLUMNS);
        continue;
      }

      if (
        error &&
        "knowledge_command_light_opacity" in payload &&
        isMissingProfilesColumnError(error, "knowledge_command_light_opacity")
      ) {
        payload = omitKeys(payload, KNOWLEDGE_COMMAND_LIGHT_PROFILE_COLUMNS);
        continue;
      }

      if (
        error &&
        "idea_quick_filters" in payload &&
        isMissingProfilesColumnError(error, "idea_quick_filters")
      ) {
        payload = omitKeys(payload, IDEA_QUICK_FILTER_PROFILE_COLUMNS);
        continue;
      }

      if (
        error &&
        "display_currency" in payload &&
        isMissingProfilesColumnError(error, "display_currency")
      ) {
        const { display_currency: _drop, ...rest } = payload;
        payload = rest;
        continue;
      }

      if (
        error &&
        ("weather_lat" in payload || "weather_lon" in payload || "weather_city" in payload) &&
        isMissingProfilesColumnError(error, "weather_lat")
      ) {
        const { weather_lat: _a, weather_lon: _b, weather_city: _c, ...rest } = payload;
        payload = rest;
        continue;
      }

      if (
        error &&
        ("quick_save_enabled" in payload ||
          "quick_save_default_destination" in payload ||
          "quick_save_require_review" in payload) &&
        (isMissingProfilesColumnError(error, "quick_save_enabled") ||
          isMissingProfilesColumnError(error, "quick_save_default_destination") ||
          isMissingProfilesColumnError(error, "quick_save_require_review"))
      ) {
        const {
          quick_save_enabled: _a,
          quick_save_default_destination: _b,
          quick_save_require_review: _c,
          ...rest
        } = payload;
        payload = rest;
        continue;
      }

      if (
        error &&
        ("os_buddy_pet_id" in payload ||
          "os_buddy_name" in payload ||
          "os_buddy_enabled" in payload ||
          "os_buddy_position" in payload ||
          "os_buddy_onboarding_completed" in payload ||
          "os_buddy_interaction_stats" in payload ||
          "os_buddy_unlocked_pets" in payload) &&
        (isMissingProfilesColumnError(error, "os_buddy_pet_id") ||
          isMissingProfilesColumnError(error, "os_buddy_name") ||
          isMissingProfilesColumnError(error, "os_buddy_enabled") ||
          isMissingProfilesColumnError(error, "os_buddy_position") ||
          isMissingProfilesColumnError(error, "os_buddy_onboarding_completed") ||
          isMissingProfilesColumnError(error, "os_buddy_interaction_stats") ||
          isMissingProfilesColumnError(error, "os_buddy_unlocked_pets"))
      ) {
        const {
          os_buddy_pet_id: _a,
          os_buddy_name: _b,
          os_buddy_enabled: _c,
          os_buddy_position: _d,
          os_buddy_onboarding_completed: _e,
          os_buddy_interaction_stats: _f,
          os_buddy_unlocked_pets: _g,
          ...rest
        } = payload;
        payload = rest;
        continue;
      }

      if (
        error &&
        ("os_buddy_birthday_enabled" in payload ||
          "os_buddy_birthday_month" in payload ||
          "os_buddy_birthday_day" in payload ||
          "os_buddy_birthday_year" in payload ||
          "os_buddy_birthday_show_age" in payload ||
          "os_buddy_birthday_reminder_enabled" in payload ||
          "os_buddy_birthday_timezone" in payload ||
          "os_buddy_birthday_last_celebrated_on" in payload ||
          "os_buddy_birthday_last_reminder_on" in payload) &&
        (isMissingProfilesColumnError(error, "os_buddy_birthday_enabled") ||
          isMissingProfilesColumnError(error, "os_buddy_birthday_month") ||
          isMissingProfilesColumnError(error, "os_buddy_birthday_day") ||
          isMissingProfilesColumnError(error, "os_buddy_birthday_year") ||
          isMissingProfilesColumnError(error, "os_buddy_birthday_show_age") ||
          isMissingProfilesColumnError(error, "os_buddy_birthday_reminder_enabled") ||
          isMissingProfilesColumnError(error, "os_buddy_birthday_timezone") ||
          isMissingProfilesColumnError(error, "os_buddy_birthday_last_celebrated_on") ||
          isMissingProfilesColumnError(error, "os_buddy_birthday_last_reminder_on"))
      ) {
        payload = omitKeys(payload, OS_BUDDY_BIRTHDAY_PROFILE_COLUMNS);
        continue;
      }

      if (
        error &&
        OS_BUDDY_FREE_ROAM_PROFILE_COLUMNS.some((column) => column in payload) &&
        OS_BUDDY_FREE_ROAM_PROFILE_COLUMNS.some((column) =>
          isMissingProfilesColumnError(error, column),
        )
      ) {
        payload = omitKeys(payload, OS_BUDDY_FREE_ROAM_PROFILE_COLUMNS);
        continue;
      }

      if (
        error &&
        OS_BUDDY_SHORTCUT_PROFILE_COLUMNS.some((column) => column in payload) &&
        OS_BUDDY_SHORTCUT_PROFILE_COLUMNS.some((column) =>
          isMissingProfilesColumnError(error, column),
        )
      ) {
        payload = omitKeys(payload, OS_BUDDY_SHORTCUT_PROFILE_COLUMNS);
        continue;
      }

      throw error;
    }

    throw new Error("PROFILE_UPDATE_RETRIES_EXHAUSTED");
  },

  async uploadProfileAvatar(file: File): Promise<UserProfile> {
    if (!ACCEPTED_AVATAR_TYPES.has(file.type)) {
      throw new Error("INVALID_AVATAR_TYPE");
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new Error("AVATAR_TOO_LARGE");
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw ensureError(userError, "Not authenticated");
    if (!user) throw new Error("Not authenticated");

    const objectPath = `${user.id}/${AVATAR_OBJECT_PATH}`;
    const { error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(objectPath, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(objectPath);

    return settingsRepository.updateProfile({ avatar_url: publicUrl });
  },

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    if (isBrowserLocalSettingsMode()) {
      const local = readLocalNotificationPreferences();
      writeLocalNotificationPreferences(local);
      return local;
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw ensureError(userError, "Not authenticated");
    if (!user) throw new Error("Not authenticated");

    const { data: existing, error: selectError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (selectError) throw selectError;
    if (existing) return existing as NotificationPreferences;

    const { data: created, error: insertError } = await supabase
      .from("notification_preferences")
      .insert({ user_id: user.id })
      .select()
      .single();
    if (insertError) {
      if (insertError.code === "23505") {
        const { data: raced, error: retryErr } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (retryErr) throw retryErr;
        if (raced) return raced as NotificationPreferences;
      }
      throw insertError;
    }
    return created as NotificationPreferences;
  },

  async updateNotificationPreferences(
    input: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferences> {
    if (isBrowserLocalSettingsMode()) {
      return writeLocalNotificationPreferences({
        ...readLocalNotificationPreferences(),
        ...input,
        updated_at: new Date().toISOString(),
      });
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw ensureError(userError, "Not authenticated");
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("notification_preferences")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) throw error;
    return data as NotificationPreferences;
  },
};
