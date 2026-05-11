/**
 * POST /api/knowledge/[itemId]/recheck
 *
 * Lightweight embed health check. Called by the Knowledge detail sheet on
 * open when `checked_at` is older than ~24h. Verifies the live embed URL
 * still resolves; on failure, downgrades `render_mode` from
 * `true_live_embed` to `metadata_preview` (preserving any cached snapshot
 * or thumbnail) so the UI doesn't show a broken iframe.
 *
 * MVP behavior:
 *   - HEAD-fetch the embed URL or canonical post URL.
 *   - On 2xx: bump `checked_at` to now.
 *   - On 4xx/5xx: bump `checked_at` AND downgrade as above.
 *
 * Future: per-provider validation (re-fetch oEmbed for X/Reddit, verify
 * Meta token still has scope, etc.). This stub keeps the contract stable
 * so the detail sheet integration doesn't need to change later.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RenderMode } from "@/types/knowledge-source";

type CheckOutcome = {
  ok: boolean;
  status: number;
  reason?: string;
};

async function probeUrl(url: string): Promise<CheckOutcome> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "MyLifeOS-Knowledge/1.0 health-check" },
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      reason: err instanceof Error ? err.message : "fetch_failed",
    };
  }
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await ctx.params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("knowledge_items")
    .select(
      "id, user_id, source_url, render_mode, embed_html, screenshot_url, thumbnail_url",
    )
    .eq("id", itemId)
    .maybeSingle();
  if (error || !row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if ((row as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const item = row as {
    source_url: string | null;
    render_mode: RenderMode | null;
    embed_html: string | null;
    screenshot_url: string | null;
    thumbnail_url: string | null;
  };

  // Only `true_live_embed` benefits from active rechecks. Everything else
  // already renders from local assets (snapshot, thumbnail) and won't break
  // upstream.
  if (item.render_mode !== "true_live_embed") {
    await supabase
      .from("knowledge_items")
      .update({ checked_at: new Date().toISOString() })
      .eq("id", itemId);
    return NextResponse.json({ ok: true, action: "noop_non_embed" });
  }

  // Probe the source URL (cheaper than parsing embed_html for the iframe src).
  const probeTarget = item.source_url;
  if (!probeTarget) {
    await supabase
      .from("knowledge_items")
      .update({ checked_at: new Date().toISOString() })
      .eq("id", itemId);
    return NextResponse.json({ ok: true, action: "noop_no_url" });
  }

  const outcome = await probeUrl(probeTarget);

  if (outcome.ok) {
    await supabase
      .from("knowledge_items")
      .update({ checked_at: new Date().toISOString() })
      .eq("id", itemId);
    return NextResponse.json({ ok: true, action: "verified", status: outcome.status });
  }

  // Probe failed → downgrade render_mode without losing the row.
  const downgrade: RenderMode =
    item.screenshot_url
      ? "auto_snapshot"
      : item.thumbnail_url
        ? "metadata_preview"
        : "unavailable";

  await supabase
    .from("knowledge_items")
    .update({
      render_mode: downgrade,
      preview_status:
        outcome.status === 404 || outcome.status === 410
          ? "deleted_or_unavailable"
          : "extraction_failed",
      checked_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  return NextResponse.json({
    ok: false,
    action: "downgraded",
    to: downgrade,
    status: outcome.status,
    reason: outcome.reason,
  });
}
