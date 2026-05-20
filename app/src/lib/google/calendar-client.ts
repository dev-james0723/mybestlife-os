import type { SupabaseClient } from "@supabase/supabase-js";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import {
  getGoogleCalendarConnection,
  updateGoogleCalendarTokens,
} from "@/lib/google/calendar-connection-store";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";

export async function getGoogleOAuth2ForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ oauth2: OAuth2Client; calendarId: string } | null> {
  const conn = await getGoogleCalendarConnection(supabase, userId);
  if (!conn) return null;
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET");
  }
  const oauth2 = new OAuth2Client({
    clientId,
    clientSecret,
  });
  oauth2.setCredentials({
    refresh_token: conn.refreshToken,
    access_token: conn.accessToken ?? undefined,
  });

  const expiryMs = conn.row.token_expiry ? Date.parse(conn.row.token_expiry) : 0;
  const needsRefresh =
    !conn.accessToken || !Number.isFinite(expiryMs) || expiryMs < Date.now() + 60_000;
  if (needsRefresh) {
    const refreshed = await refreshGoogleAccessToken(conn.refreshToken);
    const expiresAt =
      typeof refreshed.expires_in === "number"
        ? new Date(Date.now() + refreshed.expires_in * 1000)
        : null;
    await updateGoogleCalendarTokens(supabase, userId, refreshed.access_token, expiresAt);
    oauth2.setCredentials({
      refresh_token: conn.refreshToken,
      access_token: refreshed.access_token,
    });
  }

  return { oauth2, calendarId: conn.row.calendar_id || "primary" };
}

export async function getGoogleCalendarClientForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  const pair = await getGoogleOAuth2ForUser(supabase, userId);
  if (!pair) return null;
  const calendar = google.calendar({
    version: "v3",
    auth: pair.oauth2 as unknown as Parameters<typeof google.calendar>[0]["auth"],
  });
  return { calendar, calendarId: pair.calendarId };
}
