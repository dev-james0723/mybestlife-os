import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { getDocOracleImageModel, getDocOracleImageModelFallback } from "@/lib/ai/gemini-image";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    gemini_api_key_configured: Boolean(getGeminiServerApiKey()),
    image_model: getDocOracleImageModel(),
    image_model_fallback: getDocOracleImageModelFallback() ?? null,
    storage_bucket: "knowledge-files",
  });
}
