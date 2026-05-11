import type { getThemeUiCopy } from "@/lib/i18n/theme-ui";

type ThemeUi = ReturnType<typeof getThemeUiCopy>;

/**
 * Maps Supabase / PostgREST / browser errors to a short user-facing hint (toast description).
 */
export function getOnboardingSaveErrorHint(err: unknown, ui: ThemeUi): string | undefined {
  const o = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
  const msg = typeof o.message === "string" ? o.message.toLowerCase() : "";
  const code = typeof o.code === "string" ? o.code : "";

  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    (msg.includes("fetch") && msg.includes("aborted")) ||
    msg.includes("network request failed") ||
    msg.includes("offline")
  ) {
    return ui.onboardingSaveFailedNetworkDesc;
  }

  if (
    msg.includes("jwt expired") ||
    msg.includes("invalid jwt") ||
    (msg.includes("session") && msg.includes("missing")) ||
    msg.includes("auth session")
  ) {
    return ui.onboardingSaveFailedSessionDesc;
  }

  if (
    msg.includes("schema cache") ||
    (msg.includes("column") && msg.includes("could not find")) ||
    msg.includes("does not exist")
  ) {
    return ui.onboardingSaveFailedDbSchemaDesc;
  }

  if (
    code === "42501" ||
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    msg.includes("violates row-level security")
  ) {
    return ui.onboardingSaveFailedSessionDesc;
  }

  return undefined;
}

export function logSupabaseClientError(context: string, err: unknown): void {
  const o = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
  const payload = {
    message: typeof o.message === "string" ? o.message : undefined,
    code: typeof o.code === "string" ? o.code : undefined,
    details: typeof o.details === "string" ? o.details : undefined,
    hint: typeof o.hint === "string" ? o.hint : undefined,
    status: typeof o.status === "number" ? o.status : undefined,
  };
  console.error(context, JSON.stringify(payload), err);
}
