/**
 * autofillFromDocs — REVIEW-ONLY. Reads extracted text from the user's Career
 * Vault documents and proposes profile-field suggestions with per-field
 * confidence. Routes return these for the user to review; they NEVER auto-write.
 *
 * Also exports {@link loadCareerVaultDocText}, which pulls the user's
 * `career_vault_files` rows, downloads each blob from the `career-vault` bucket
 * via the passed Supabase client, runs `extractFileContentFromBlob`, and
 * returns `[{ category, text }]` capped to ~24000 total chars.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { CAREER_VAULT_BUCKET } from "@/lib/career-vault/constants";
import { extractFileContentFromBlob } from "@/lib/knowledge/ai/extractContent";
import {
  AutofillSchema,
  type AutofillResult,
} from "@/lib/career-mirror/validators";
import { AutofillGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

/** Hard cap on total extracted text fed to the model, across all documents. */
const DOC_TEXT_TOTAL_CHAR_CAP = 24_000;

export type CareerDocText = { category: string; text: string };

export type AutofillSuggested = Record<string, { value: unknown }>;
export type AutofillConfidence = Record<string, number>;

/**
 * Load + extract text from the user's career vault documents.
 *
 * Queries `career_vault_files` (RLS-scoped + explicit user_id filter),
 * optionally filtered to `categories`, downloads each blob from
 * {@link CAREER_VAULT_BUCKET}, runs format-specific extraction, and returns the
 * per-document text capped to {@link DOC_TEXT_TOTAL_CHAR_CAP} total chars.
 */
export async function loadCareerVaultDocText(
  supabase: SupabaseClient,
  userId: string,
  categories?: string[],
): Promise<CareerDocText[]> {
  let query = supabase
    .from("career_vault_files")
    .select("file_path, original_filename, mime_type, category, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (categories && categories.length > 0) {
    query = query.in("category", categories);
  }

  const { data: rows, error } = await query;
  if (error || !rows) return [];

  const out: CareerDocText[] = [];
  let used = 0;

  for (const row of rows as Array<{
    file_path: string;
    original_filename: string;
    mime_type: string | null;
    category: string;
  }>) {
    if (used >= DOC_TEXT_TOTAL_CHAR_CAP) break;

    try {
      const { data: blob, error: dlError } = await supabase.storage
        .from(CAREER_VAULT_BUCKET)
        .download(row.file_path);
      if (dlError || !blob) continue;

      const text = (
        await extractFileContentFromBlob(
          blob,
          row.original_filename,
          row.mime_type ?? undefined,
        )
      ).trim();
      if (!text) continue;

      const remaining = DOC_TEXT_TOTAL_CHAR_CAP - used;
      const slice = text.slice(0, remaining);
      used += slice.length;
      out.push({ category: row.category, text: slice });
    } catch {
      // Best-effort: a single unreadable doc must not break the autofill flow.
      continue;
    }
  }

  return out;
}

export async function autofillFromDocs(params: {
  docTexts: CareerDocText[];
  locale?: AppLocale;
}): Promise<{
  suggested: AutofillSuggested;
  confidence: AutofillConfidence;
  modelUsed: string;
}> {
  const taskBrief =
    "Extract profile-field suggestions from the documents below. For each field " +
    "you can confidently fill (e.g. current_role, industry, top_skills, " +
    "target_roles, career_goals, location, years_experience), return a " +
    "suggestion with the field name, the suggested value, and a confidence 0-1. " +
    "Only suggest what the documents actually support — do not guess. This is a " +
    "review-only draft the user will confirm, so accuracy beats coverage.";

  const userText =
    params.docTexts.length > 0
      ? params.docTexts
          .map((d, i) => asContext(`Document ${i + 1} (${d.category})`, d.text))
          .join("\n\n")
      : "No documents available.";

  const { data, modelUsed } = await runCareerMirrorGenerator<AutofillResult>({
    taskBrief,
    userText,
    responseSchema: AutofillGeminiSchema,
    validator: AutofillSchema,
    locale: params.locale,
    temperature: 0.2,
    maxOutputTokens: 4096,
  });

  const suggested: AutofillSuggested = {};
  const confidence: AutofillConfidence = {};
  for (const s of data.suggestions) {
    suggested[s.field] = { value: s.value };
    confidence[s.field] = s.confidence;
  }

  return { suggested, confidence, modelUsed };
}
