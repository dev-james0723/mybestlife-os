import { NextResponse } from "next/server";
import type { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SoftwareVaultEntry } from "@/types/database";

export type VaultServerSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export async function getVaultRouteContext() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function parseVaultJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "invalid_json" }, { status: 400 }) };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "invalid_request", details: parsed.error.flatten() },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export async function selectVaultEntries(supabase: VaultServerSupabase): Promise<SoftwareVaultEntry[]> {
  const { data, error } = await supabase
    .from("software_vault")
    .select("*")
    .order("app_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SoftwareVaultEntry[];
}

export function safeCriticalSeverity(value: string): "info" | "notice" | "warning" {
  if (value === "warning" || value === "critical") return "warning";
  if (value === "notice") return "notice";
  return "info";
}
