import { GOOGLE_OAUTH_SCOPES_WITH_CALENDAR } from "./constants";

export function buildGoogleCalendarOAuthOptions(appOrigin: string) {
  return {
    redirectTo: `${appOrigin.replace(/\/$/, "")}/callback`,
    scopes: GOOGLE_OAUTH_SCOPES_WITH_CALENDAR,
    queryParams: {
      access_type: "offline",
      prompt: "consent",
    },
  };
}
