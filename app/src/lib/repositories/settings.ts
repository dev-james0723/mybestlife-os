import { createClient } from "@/lib/supabase/client";
import { ensureError } from "@/lib/utils/ensure-error";
import type { NotificationPreferences, UserProfile } from "@/types/database";

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
    | "display_currency"
    | "quick_save_enabled"
    | "quick_save_default_destination"
    | "quick_save_require_review"
  >
>;

const AVATARS_BUCKET = "avatars";
const AVATAR_OBJECT_PATH = "avatar";

const ACCEPTED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

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

function normalizeUserProfile(row: Record<string, unknown>): UserProfile {
  const base = row as unknown as UserProfile;
  const raw = row.display_currency;
  const display_currency =
    typeof raw === "string" && /^[A-Za-z]{3}$/.test(raw) ? raw.toUpperCase() : "USD";
  const weather_city =
    typeof row.weather_city === "string" && row.weather_city.trim() ? row.weather_city.trim() : null;
  return {
    ...base,
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
