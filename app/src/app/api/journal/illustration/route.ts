import { NextResponse } from "next/server";

import { illustrationRequestSchema } from "@/lib/journal/schema";
import { parseBody, requireAuthedContext } from "../_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;

  const parsed = parseBody(illustrationRequestSchema, auth.bodyJson);
  if (!parsed.ok) return parsed.response;

  return NextResponse.json({ ok: true, stub: true });
}
