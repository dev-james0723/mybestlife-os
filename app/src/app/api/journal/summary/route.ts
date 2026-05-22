import { NextResponse } from "next/server";

import { summaryRequestSchema } from "@/lib/journal/schema";
import { parseBody, requireAuthedContext } from "../_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;

  const parsed = parseBody(summaryRequestSchema, auth.bodyJson);
  if (!parsed.ok) return parsed.response;

  // Phase 3 will call Gemini here. For now, return a stub so the page can
  // exercise the request/response surface.
  return NextResponse.json({ ok: true, stub: true });
}
