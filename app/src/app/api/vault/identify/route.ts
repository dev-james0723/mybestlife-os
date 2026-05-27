import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveCandidates } from "@/lib/vault/identity-resolver";
import { consumeVaultAutofillQuota } from "@/lib/vault/rate-limit";

export const runtime = "nodejs";

const requestSchema = z.object({
  query: z.string().trim().min(1).max(400),
  selected_url: z.string().trim().url().optional(),
});

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const quota = await consumeVaultAutofillQuota({
    supabase,
    userId: user.id,
    cost: 1,
  });
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "rate_limited", reset: quota.reset.toISOString() },
      { status: 429 },
    );
  }

  const { inputType, candidates, autoSelect } = await resolveCandidates(parsed.data.query, {
    selectedUrl: parsed.data.selected_url,
  });

  return NextResponse.json({
    candidates,
    auto_select: autoSelect,
    input_type: inputType,
  });
}
