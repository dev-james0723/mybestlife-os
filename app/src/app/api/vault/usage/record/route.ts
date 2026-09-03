import { NextResponse } from "next/server";
import { getVaultRouteContext, parseVaultJson } from "@/app/api/vault/_shared";
import { usageEventRequestSchema } from "@/lib/vault/intelligence-schemas";

export const runtime = "nodejs";

function dbEventType(value: string) {
  if (value === "open") return "opened";
  if (value === "completed_workflow") return "used_in_recipe";
  return "manually_marked_used";
}

function isMissingUsageEventsTable(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("software_usage_events") === true
  );
}

export async function POST(request: Request) {
  const { supabase, user } = await getVaultRouteContext();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await parseVaultJson(request, usageEventRequestSchema);
  if (!parsed.ok) return parsed.response;
  const req = parsed.data;

  const eventAt = new Date().toISOString();
  let updated: { launch_count: number | null; last_opened_at: string | null } | null = null;

  // Compare-and-swap prevents two quick taps/tabs from overwriting the same count.
  // software_vault is the backward-compatible source of truth because some deployed
  // databases predate the optional software_usage_events table.
  for (let attempt = 0; attempt < 3 && !updated; attempt += 1) {
    const { data: current, error: readError } = await supabase
      .from("software_vault")
      .select("launch_count")
      .eq("id", req.entryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (readError) {
      console.error("[vault/usage/record] counter read failed", { code: readError.code });
      return NextResponse.json(
        { error: "read_failed", message: "Could not load usage for this tool." },
        { status: 500 },
      );
    }
    if (!current) {
      return NextResponse.json({ error: "entry_not_found" }, { status: 404 });
    }

    const currentLaunchCount = Math.max(0, Number(current.launch_count ?? 0));
    let updateQuery = supabase
      .from("software_vault")
      .update({
        launch_count: currentLaunchCount + 1,
        last_opened_at: eventAt,
        updated_at: eventAt,
      })
      .eq("id", req.entryId)
      .eq("user_id", user.id);

    updateQuery = current.launch_count == null
      ? updateQuery.is("launch_count", null)
      : updateQuery.eq("launch_count", current.launch_count);

    const { data: next, error: updateError } = await updateQuery
      .select("launch_count,last_opened_at")
      .maybeSingle();

    if (updateError) {
      console.error("[vault/usage/record] counter update failed", { code: updateError.code });
      return NextResponse.json(
        { error: "update_failed", message: "Could not save usage for this tool." },
        { status: 500 },
      );
    }
    updated = next;
  }

  if (!updated) {
    return NextResponse.json(
      { error: "usage_conflict", message: "Usage changed at the same time. Please try again." },
      { status: 409 },
    );
  }

  // Preserve detailed history where the additive Tool Stack OS migration is
  // available, but never make the visible counter depend on that optional table.
  const { data: event, error: eventError } = await supabase
    .from("software_usage_events")
    .insert({
      user_id: user.id,
      software_vault_entry_id: req.entryId,
      event_type: dbEventType(req.eventType),
      event_at: eventAt,
      project_id: req.contextType === "project" ? req.contextId ?? null : null,
      task_id: req.contextType === "task" ? req.contextId ?? null : null,
      metadata: {
        requestedEventType: req.eventType,
        contextType: req.contextType,
        contextId: req.contextId ?? null,
        note: req.note ?? null,
      },
    })
    .select("id")
    .single();

  if (eventError && !isMissingUsageEventsTable(eventError)) {
    console.warn("[vault/usage/record] optional history write failed", {
      code: eventError.code,
    });
  }

  return NextResponse.json({
    id: event?.id ?? null,
    launchCount: Number(updated.launch_count ?? 0),
    lastOpenedAt: updated.last_opened_at ?? eventAt,
    historyRecorded: !eventError,
  });
}
