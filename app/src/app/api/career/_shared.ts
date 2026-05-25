/**
 * Shared helpers for the AI Career Mirror route handlers.
 *
 * Every route runs on the Node runtime, authenticates with the server Supabase
 * client (`createServerSupabaseClient` → `auth.getUser()`), and scopes all
 * reads/writes to the authed user (RLS + explicit `.eq('user_id', user.id)`).
 *
 * Convention for failures:
 *   - auth / body errors  → 401 / 400
 *   - AI / model failures → HTTP 200 `{ ok:false, error }` (so the client can
 *     show a graceful toast instead of treating it as a hard request failure).
 */

import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAppLocale, type AppLocale } from "@/lib/i18n/app-locale";

export type AuthedContext = {
  supabase: SupabaseClient;
  user: User;
};

export type RouteFailure = { response: NextResponse };

/** Resolve the authed user or return a 401 response to bail with. */
export async function requireUser(): Promise<
  ({ ok: true } & AuthedContext) | ({ ok: false } & RouteFailure)
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, supabase, user };
}

/** Parse a JSON body, tolerating empty bodies (returns `{}`). */
export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: Record<string, unknown> } | ({ ok: false } & RouteFailure)> {
  let raw: unknown;
  try {
    const text = await request.text();
    raw = text.trim().length === 0 ? {} : JSON.parse(text);
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "invalid_json" }, { status: 400 }),
    };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "invalid_body" }, { status: 400 }),
    };
  }
  return { ok: true, body: raw as Record<string, unknown> };
}

/**
 * Resolve the user's preferred output locale: explicit body `locale`, else the
 * stored `user_ai_preferences.prompt_language`, else the app default.
 */
export async function resolveLocale(
  supabase: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
): Promise<AppLocale> {
  if (typeof body.locale === "string" && body.locale.trim().length > 0) {
    return parseAppLocale(body.locale);
  }
  try {
    const { data } = await supabase
      .from("user_ai_preferences")
      .select("prompt_language")
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.prompt_language) return parseAppLocale(data.prompt_language);
  } catch {
    // fall through to default
  }
  return parseAppLocale(undefined);
}

/** Standard `{ ok:false, error }` 200 response for AI/model failures. */
export function aiFailure(e: unknown): NextResponse {
  const detail = e instanceof Error ? e.message : String(e);
  if (process.env.NODE_ENV !== "production") {
    console.error("[career-mirror] AI generation failed:", detail);
  }
  return NextResponse.json(
    { ok: false, error: detail.slice(0, 480) },
    { status: 200 },
  );
}
