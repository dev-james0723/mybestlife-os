/**
 * POST /api/social/disconnect/[provider]
 *
 * Hard-deletes the connection row for the calling user. Best-effort —
 * upstream token revocation is provider-specific and not guaranteed; the
 * primary protection is that the row is gone, so the cascade can no longer
 * use the token.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOAuthProvider } from "@/types/knowledge-source";
import { deleteConnection } from "@/lib/social/connection-store";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;
  if (!isOAuthProvider(provider)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await deleteConnection(user.id, provider);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
