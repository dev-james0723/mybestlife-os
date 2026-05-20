import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt, encrypt } from "@/lib/security/token-crypto";
import type { GoogleCalendarConnectionRow } from "@/lib/google/calendar-types";

const TABLE = "google_calendar_connections";

export type DecryptedGoogleCalendarConnection = {
  row: GoogleCalendarConnectionRow;
  accessToken: string | null;
  refreshToken: string;
};

export async function getGoogleCalendarConnection(
  supabase: SupabaseClient,
  userId: string,
): Promise<DecryptedGoogleCalendarConnection | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as GoogleCalendarConnectionRow;
  if (!row.sync_enabled) {
    // still return connection for status UI; caller checks sync_enabled
  }
  let refreshToken: string;
  try {
    refreshToken = decrypt({
      ct: row.refresh_token_ct,
      iv: row.refresh_token_iv,
      tag: row.refresh_token_tag,
    });
  } catch {
    return null;
  }
  let accessToken: string | null = null;
  if (row.access_token_ct && row.access_token_iv && row.access_token_tag) {
    try {
      accessToken = decrypt({
        ct: row.access_token_ct,
        iv: row.access_token_iv,
        tag: row.access_token_tag,
      });
    } catch {
      accessToken = null;
    }
  }
  return { row, accessToken, refreshToken };
}

export type UpsertGoogleCalendarConnectionInput = {
  userId: string;
  googleAccountEmail: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date | null;
  scopes: string[];
};

export async function upsertGoogleCalendarConnection(
  supabase: SupabaseClient,
  input: UpsertGoogleCalendarConnectionInput,
): Promise<void> {
  const accessBlob = encrypt(input.accessToken);
  const refreshBlob = encrypt(input.refreshToken);
  const payload = {
    user_id: input.userId,
    google_account_email: input.googleAccountEmail,
    access_token_ct: accessBlob.ct,
    access_token_iv: accessBlob.iv,
    access_token_tag: accessBlob.tag,
    refresh_token_ct: refreshBlob.ct,
    refresh_token_iv: refreshBlob.iv,
    refresh_token_tag: refreshBlob.tag,
    token_expiry: input.expiresAt ? input.expiresAt.toISOString() : null,
    scopes: input.scopes,
    sync_enabled: true,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(`upsertGoogleCalendarConnection: ${error.message}`);
}

export async function updateGoogleCalendarTokens(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  expiresAt: Date | null,
): Promise<void> {
  const accessBlob = encrypt(accessToken);
  const { error } = await supabase
    .from(TABLE)
    .update({
      access_token_ct: accessBlob.ct,
      access_token_iv: accessBlob.iv,
      access_token_tag: accessBlob.tag,
      token_expiry: expiresAt ? expiresAt.toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw new Error(`updateGoogleCalendarTokens: ${error.message}`);
}

export async function updateGoogleCalendarWatch(
  supabase: SupabaseClient,
  userId: string,
  fields: {
    watch_channel_id: string | null;
    watch_resource_id: string | null;
    watch_expiration: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw new Error(`updateGoogleCalendarWatch: ${error.message}`);
}

export async function updateGoogleCalendarSyncMeta(
  supabase: SupabaseClient,
  userId: string,
  fields: Partial<{
    sync_token: string | null;
    last_full_sync_at: string | null;
    last_incremental_sync_at: string | null;
    sync_enabled: boolean;
  }>,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw new Error(`updateGoogleCalendarSyncMeta: ${error.message}`);
}

export async function deleteGoogleCalendarConnection(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("user_id", userId);
  if (error) throw new Error(`deleteGoogleCalendarConnection: ${error.message}`);
}

export async function getGoogleCalendarConnectionByWatchChannel(
  supabase: SupabaseClient,
  channelId: string,
): Promise<GoogleCalendarConnectionRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("watch_channel_id", channelId)
    .maybeSingle();
  if (error || !data) return null;
  return data as GoogleCalendarConnectionRow;
}
