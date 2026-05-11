/**
 * AI insights cache.
 *
 * Every habits AI feature runs through this module so the generation →
 * validate → store → return flow is identical across route handlers. The
 * cache key is a SHA-256 of a *canonicalized* JSON representation of the
 * input payload, so semantically-equal inputs always collide.
 *
 * The store is `public.ai_insights` (see 20260418_habits_rebuild.sql), keyed
 * on `(user_id, kind, input_hash, language)`. Two identical requests in the
 * same language return the same cached row without hitting Gemini.
 */

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIInsightKind } from "@/lib/habits/types";
import type { AppLocale } from "@/lib/i18n/app-locale";

/**
 * Produce a stable hash regardless of property insertion order.
 * Arrays stay ordered (order is meaningful). Objects are sorted by key.
 */
export function stableHash(input: unknown): string {
  const canonical = canonicalize(input);
  return createHash("sha256").update(canonical).digest("hex");
}

function canonicalize(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "bigint") return JSON.stringify(v.toString());
  if (Array.isArray(v)) {
    return `[${v.map((x) => canonicalize(x)).join(",")}]`;
  }
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`)
      .join(",")}}`;
  }
  return "null";
}

// ============================================================
// Cache read / write
// ============================================================

export type CacheReadArgs = {
  supabase: SupabaseClient;
  userId: string;
  kind: AIInsightKind;
  inputHash: string;
  language: AppLocale;
};

export type CacheRow = {
  id: string;
  kind: AIInsightKind;
  target_kind: string | null;
  target_id: string | null;
  input_hash: string;
  content_json: unknown;
  content_text: string | null;
  language: string;
  model_used: string | null;
  created_at: string;
};

/** Returns the cached insight row, or `null` if missing. */
export async function readInsight(
  args: CacheReadArgs,
): Promise<CacheRow | null> {
  const { supabase, userId, kind, inputHash, language } = args;
  const { data, error } = await supabase
    .from("ai_insights")
    .select(
      "id, kind, target_kind, target_id, input_hash, content_json, content_text, language, model_used, created_at",
    )
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("input_hash", inputHash)
    .eq("language", language)
    .maybeSingle();

  if (error) {
    // PGRST116 = "no rows" isn't returned by maybeSingle; any other error is a
    // real failure (RLS, network, etc.) — bubble it up.
    throw error;
  }
  return (data as CacheRow | null) ?? null;
}

export type CacheWriteArgs = {
  supabase: SupabaseClient;
  userId: string;
  kind: AIInsightKind;
  inputHash: string;
  language: AppLocale;
  targetKind?: string | null;
  targetId?: string | null;
  contentJson?: unknown;
  contentText?: string | null;
  modelUsed: string;
};

export async function writeInsight(args: CacheWriteArgs): Promise<CacheRow> {
  const { supabase, userId, kind, inputHash, language } = args;
  const { data, error } = await supabase
    .from("ai_insights")
    .upsert(
      {
        user_id: userId,
        kind,
        target_kind: args.targetKind ?? null,
        target_id: args.targetId ?? null,
        input_hash: inputHash,
        content_json: args.contentJson ?? null,
        content_text: args.contentText ?? null,
        language,
        model_used: args.modelUsed,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,kind,input_hash,language" },
    )
    .select(
      "id, kind, target_kind, target_id, input_hash, content_json, content_text, language, model_used, created_at",
    )
    .single();

  if (error) throw error;
  return data as CacheRow;
}
