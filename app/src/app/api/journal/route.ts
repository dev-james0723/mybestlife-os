import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  insertJournalEntry,
  requireAuthenticatedUserId,
  updateJournalEntryRow,
  type JournalWriteInput,
} from "@/lib/journal/repository-core";

export const runtime = "nodejs";

type CreateBody = JournalWriteInput;

type UpdateBody = Partial<JournalWriteInput> & {
  id?: string;
};

function journalErrorResponse(error: unknown, action: "create" | "update") {
  console.error(`[journal:${action}]`, error);
  const message = error instanceof Error ? error.message : "Failed to save entry";
  const status =
    message === "Not authenticated"
      ? 401
      : message.includes("violates row-level security")
        ? 403
        : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await requireAuthenticatedUserId(supabase);
    const body = (await request.json().catch(() => ({}))) as CreateBody;

    if (!body.entry_date || typeof body.entry_date !== "string") {
      return NextResponse.json({ error: "Entry date is required" }, { status: 400 });
    }

    const row = await insertJournalEntry(supabase, userId, body);
    return NextResponse.json(row);
  } catch (error) {
    return journalErrorResponse(error, "create");
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    await requireAuthenticatedUserId(supabase);
    const body = (await request.json().catch(() => ({}))) as UpdateBody;

    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json({ error: "Entry id is required" }, { status: 400 });
    }

    const { id, ...patch } = body;
    const row = await updateJournalEntryRow(supabase, id, patch);
    return NextResponse.json(row);
  } catch (error) {
    return journalErrorResponse(error, "update");
  }
}
