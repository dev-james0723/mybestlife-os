import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile, error: readError } = await supabase
    .from("user_tts_voice_profiles")
    .select("id, reference_storage_path")
    .eq("id", profileId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) {
    return NextResponse.json(
      { error: "voice_profile_load_failed", detail: readError.message },
      { status: 502 },
    );
  }
  if (!profile) {
    return NextResponse.json({ error: "voice_profile_not_found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("user_tts_voice_profiles")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", profileId)
    .eq("user_id", user.id);
  if (updateError) {
    return NextResponse.json(
      { error: "voice_profile_archive_failed", detail: updateError.message },
      { status: 502 },
    );
  }

  await supabase
    .from("user_tts_preferences")
    .update({
      voice_mode: "preset",
      active_voice_profile_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("active_voice_profile_id", profileId);

  await supabase.storage
    .from("knowledge-files")
    .remove([(profile as { reference_storage_path: string }).reference_storage_path]);

  return NextResponse.json({ ok: true });
}
