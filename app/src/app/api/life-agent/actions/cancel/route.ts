import { NextResponse } from "next/server";
import { cancelActionPreview } from "@/lib/life-agent/action-preview-service";
import { requireLifeAgentUser } from "@/lib/life-agent/actions-api-shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireLifeAgentUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const previewId =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).previewId === "string"
      ? (body as Record<string, string>).previewId
      : null;

  if (!previewId) {
    return NextResponse.json({ error: "preview_id_required" }, { status: 400 });
  }

  const result = await cancelActionPreview(auth.supabase, auth.userId, previewId);

  if (!result.ok) {
    return NextResponse.json(
      { error: "cancel_failed", detail: result.error },
      { status: result.status ?? 400 },
    );
  }

  return NextResponse.json({ preview: result.preview });
}
