import type { ResolvedShare } from "@/types/career-vault";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/env";

export type ResolveShareInput = {
  token: string;
  password?: string | null;
  action?: "preview" | "downloaded";
};

export type ResolveShareResult =
  | { ok: true; data: ResolvedShare }
  | {
      ok: false;
      status: number;
      error:
        | "missing_token"
        | "not_found"
        | "revoked"
        | "expired"
        | "exhausted"
        | "password_required"
        | "password_invalid"
        | "server_misconfigured"
        | "unknown";
    };

/**
 * Invokes the `resolve-share` edge function anonymously. The function runs
 * with the service role server-side, so we need neither a Supabase session
 * nor direct table access on the caller.
 */
export async function resolveShare(
  input: ResolveShareInput,
): Promise<ResolveShareResult> {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  if (!url || !key) {
    return { ok: false, status: 500, error: "server_misconfigured" };
  }

  const endpoint = `${url.replace(/\/$/, "")}/functions/v1/resolve-share`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        token: input.token,
        password: input.password ?? undefined,
        action: input.action ?? "preview",
      }),
    });
  } catch {
    return { ok: false, status: 0, error: "unknown" };
  }

  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }

  if (res.ok) {
    return { ok: true, data: body as unknown as ResolvedShare };
  }

  const error = (typeof body.error === "string" ? body.error : "unknown") as
    | "missing_token"
    | "not_found"
    | "revoked"
    | "expired"
    | "exhausted"
    | "password_required"
    | "password_invalid"
    | "server_misconfigured"
    | "unknown";

  return { ok: false, status: res.status, error };
}
