import { NextResponse } from "next/server";
import { getVaultRouteContext, parseVaultJson } from "@/app/api/vault/_shared";
import { usageEventRequestSchema } from "@/lib/vault/intelligence-schemas";

export const runtime = "nodejs";

function dbEventType(value: string) {
  if (value === "open") return "opened";
  if (value === "completed_workflow") return "used_in_recipe";
  return "manually_marked_used";
}

export async function POST(request: Request) {
  const { supabase, user } = await getVaultRouteContext();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await parseVaultJson(request, usageEventRequestSchema);
  if (!parsed.ok) return parsed.response;
  const req = parsed.data;

  const { data: current, error: readError } = await supabase
    .from("software_vault")
    .select("launch_count")
    .eq("id", req.entryId)
    .eq("user_id", user.id)
    .single();
  if (readError) return NextResponse.json({ error: "entry_not_found", message: readError.message }, { status: 404 });

  const eventAt = new Date().toISOString();
  const { data: event, error } = await supabase
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
  if (error) return NextResponse.json({ error: "save_failed", message: error.message }, { status: 500 });

  const nextLaunchCount = Number(current?.launch_count ?? 0) + 1;
  const { error: updateError } = await supabase
    .from("software_vault")
    .update({
      launch_count: nextLaunchCount,
      last_opened_at: eventAt,
      updated_at: eventAt,
    })
    .eq("id", req.entryId)
    .eq("user_id", user.id);
  if (updateError) return NextResponse.json({ error: "update_failed", message: updateError.message }, { status: 500 });

  return NextResponse.json({ id: event.id, launchCount: nextLaunchCount, lastOpenedAt: eventAt });
}
