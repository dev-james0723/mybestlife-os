/**
 * Shared helpers for `app/api/journal/*` route handlers.
 *
 * The journal AI routes follow the same authentication and JSON-parsing
 * contract as the habits / bio-lab routes. See
 * `app/api/ai/habits/_shared.ts` for the reference implementation we mirror.
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z, ZodError, type ZodTypeAny } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthedContext = {
  supabase: SupabaseClient;
  userId: string;
};

export async function requireAuthedContext(
  request: Request,
): Promise<
  | { ok: true; ctx: AuthedContext; bodyJson: Record<string, unknown> }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthenticated" },
        { status: 401 },
      ),
    };
  }

  let bodyJson: Record<string, unknown> = {};
  const rawText = await request.text();
  if (rawText) {
    try {
      const parsed = JSON.parse(rawText) as unknown;
      if (parsed && typeof parsed === "object") {
        bodyJson = parsed as Record<string, unknown>;
      }
    } catch {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "invalid_json" },
          { status: 400 },
        ),
      };
    }
  }

  return {
    ok: true,
    ctx: { supabase, userId: userData.user.id },
    bodyJson,
  };
}

export function parseBody<TSchema extends ZodTypeAny>(
  schema: TSchema,
  body: unknown,
): { ok: true; data: z.infer<TSchema> } | { ok: false; response: NextResponse } {
  try {
    const data = schema.parse(body) as z.infer<TSchema>;
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "invalid_request", issues: err.issues },
          { status: 400 },
        ),
      };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: "invalid_request" },
        { status: 400 },
      ),
    };
  }
}
