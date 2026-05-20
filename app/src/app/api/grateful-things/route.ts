import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { persistGratitudePhotosServer } from "@/lib/grateful-things/photo-storage-server";
import {
  insertGratefulThing,
  requireAuthenticatedUserId,
} from "@/lib/grateful-things/repository-core";

export const runtime = "nodejs";

type CreateBody = {
  content?: string;
  entry_date?: string;
  category?: string | null;
  photo_url?: string | null;
  is_favorite?: boolean;
};

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await requireAuthenticatedUserId(supabase);

    const body = (await request.json().catch(() => ({}))) as CreateBody;
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const photos = await persistGratitudePhotosServer({
      userId,
      photo: typeof body.photo_url === "string" ? body.photo_url : null,
    });

    const row = await insertGratefulThing(supabase, userId, {
      content,
      entry_date: typeof body.entry_date === "string" ? body.entry_date : undefined,
      category: typeof body.category === "string" ? body.category : body.category ?? null,
      photo_url: photos.photo_url,
      thumbnail_url: photos.thumbnail_url,
      is_favorite: body.is_favorite === true,
    });

    return NextResponse.json(row);
  } catch (error) {
    console.error("[grateful-things:create]", error);
    const message = error instanceof Error ? error.message : "Failed to save entry";
    const status = message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
