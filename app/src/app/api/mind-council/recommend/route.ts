import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { recommendMindSkills } from "@/lib/mind-council/recommend";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isRecord(json)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const query = typeof json.query === "string" ? json.query : "";
  const out = recommendMindSkills(query);
  return NextResponse.json(out);
}
