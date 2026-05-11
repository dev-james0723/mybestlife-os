/** Create/update events in the user's calendars (primary). */
export const GOOGLE_CALENDAR_EVENTS_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

/** Include OpenID basics so Supabase session stays consistent when re-consenting. */
export const GOOGLE_OAUTH_SCOPES_WITH_CALENDAR = [
  "openid",
  "email",
  "profile",
  GOOGLE_CALENDAR_EVENTS_SCOPE,
].join(" ");

export const MYLIFEOS_SYNC_PROP_KEY = "mylifeos_daily_plan";

export const GOOGLE_CALENDAR_EVENTS_ENDPOINT =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
