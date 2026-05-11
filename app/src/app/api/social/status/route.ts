/**
 * GET /api/social/status
 *
 * Returns the calling user's social connections in client-safe form
 * (NO TOKEN COLUMNS — see `connection-store.ts`). Used by Settings →
 * Social Integrations to render the connection cards.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listConnectionsForClient } from "@/lib/social/connection-store";
import type { OAuthProvider } from "@/types/knowledge-source";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const connections = await listConnectionsForClient(user.id);

  // Re-index by provider for a tidy client shape: every supported provider
  // appears in the response (with `connection: null` when absent), so the
  // UI can render the full grid of cards uniformly.
  const supported: OAuthProvider[] = ["meta", "reddit", "github"];
  const byProvider = Object.fromEntries(
    supported.map((p) => [
      p,
      connections.find((c) => c.provider === p) ?? null,
    ]),
  );

  return NextResponse.json({ connections: byProvider });
}
