/**
 * Quote thumbnail orchestrator.
 *
 * One end-to-end pipeline:
 *
 *   1. Mark the quote as `generating`.
 *   2. Run Gemini analysis → structured visual direction + image prompt.
 *   3. Render the image with Gemini.
 *   4. Upload to Supabase Storage.
 *   5. Persist `thumbnail_url` + metadata back onto the quote row.
 *
 * Failure semantics:
 *   - Any step throwing is caught and persisted as `thumbnail_status =
 *     'failed'` with `thumbnail_error` populated, so the UI can surface a
 *     retry button without a server round-trip.
 *   - If the analyzer succeeded but image generation didn't, we still keep
 *     the structured metadata (mood, palette, keywords) so the deterministic
 *     CSS fallback can mood-match the gradient.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  analyzeQuoteWithGemini,
  buildFallbackVisualDirection,
  generateQuoteThumbnailPromptFromDirection,
  type AnalyzableQuote,
  type VisualDirection,
} from "@/lib/quote-library/thumbnail/analyze";
import {
  generateQuoteThumbnailImage,
  QuoteThumbnailImageError,
} from "@/lib/quote-library/thumbnail/image";
import {
  QUOTE_THUMBNAIL_PIPELINE_VERSION,
  deleteQuoteThumbnailsForQuote,
  uploadQuoteThumbnailToSupabase,
} from "@/lib/quote-library/thumbnail/upload";
import type { Quote, QuoteThumbnailStatus } from "@/types/quote";

// ============================================================
// Types
// ============================================================

export type GenerateThumbnailOptions = {
  /** Authenticated server client — RLS will ensure the quote belongs to the caller. */
  supabase: SupabaseClient;
  /** Quote ID to generate for. */
  quoteId: string;
  /** Authenticated user id (for storage path scoping). */
  userId: string;
  /** Force re-roll even when an image already exists. */
  force?: boolean;
  /** Wipe previous storage objects (regenerate flow). */
  cleanupOldImages?: boolean;
};

export type ThumbnailPipelineResult =
  | { ok: true; quote: Quote; modelUsed: string; cached: boolean }
  | { ok: false; quote: Quote; status: QuoteThumbnailStatus; error: string };

// ============================================================
// Reusable building blocks
// ============================================================

async function loadQuote(
  supabase: SupabaseClient,
  quoteId: string,
): Promise<Quote | null> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    ...(row as unknown as Quote),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
  } as Quote;
}

async function patchThumbnail(
  supabase: SupabaseClient,
  quoteId: string,
  patch: Partial<Quote>,
): Promise<Quote> {
  const { data, error } = await supabase
    .from("quotes")
    .update(patch)
    .eq("id", quoteId)
    .select()
    .single();
  if (error) throw new Error(`thumbnail_update_failed: ${error.message}`);
  const row = data as Record<string, unknown>;
  return {
    ...(row as unknown as Quote),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
  } as Quote;
}

/**
 * Best-effort variant of {@link patchThumbnail} — never throws, returns
 * `null` on failure. Used for intermediate state writes (e.g. flipping to
 * `generating`, persisting analysis metadata mid-flight) so we never crash
 * the route just because Supabase had a transient hiccup.
 */
async function patchThumbnailSafe(
  supabase: SupabaseClient,
  quoteId: string,
  patch: Partial<Quote>,
): Promise<Quote | null> {
  try {
    return await patchThumbnail(supabase, quoteId, patch);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[quote-thumbnail] non-fatal patch failed:",
        e instanceof Error ? e.message : e,
      );
    }
    return null;
  }
}

function shortenError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.length > 480 ? `${msg.slice(0, 477)}…` : msg;
}

function quoteToAnalyzable(quote: Quote): AnalyzableQuote {
  return {
    id: quote.id,
    quote_text: quote.quote_text,
    source_author: quote.source_author,
    source_context: quote.source_context,
    tags: quote.tags,
    category: quote.category,
    emotion_tone: quote.emotion_tone,
    thumbnail_mood: quote.thumbnail_mood,
  };
}

function metadataPatchFromDirection(
  direction: VisualDirection,
  prompt: string,
): Partial<Quote> {
  return {
    thumbnail_prompt: prompt,
    thumbnail_mood: direction.mood,
    thumbnail_palette: direction.color_palette,
    thumbnail_visual_keywords: direction.visual_keywords,
  };
}

// ============================================================
// Public pipeline
// ============================================================

/**
 * Run the full pipeline. Safe to invoke from a fire-and-forget background
 * worker (e.g. `void generateQuoteThumbnail(...)` after a quote insert).
 */
export async function generateQuoteThumbnail(
  options: GenerateThumbnailOptions,
): Promise<ThumbnailPipelineResult> {
  const { supabase, quoteId, userId, force = false, cleanupOldImages = false } = options;

  const initialQuote = await loadQuote(supabase, quoteId);
  if (!initialQuote) {
    return {
      ok: false,
      quote: { id: quoteId } as Quote,
      status: "failed",
      error: "quote_not_found",
    };
  }

  if (
    !force &&
    initialQuote.thumbnail_status === "completed" &&
    initialQuote.thumbnail_url
  ) {
    return { ok: true, quote: initialQuote, modelUsed: "cache", cached: true };
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    const fallback = buildFallbackVisualDirection(quoteToAnalyzable(initialQuote));
    const updated = await patchThumbnailSafe(supabase, quoteId, {
      ...metadataPatchFromDirection(fallback, fallback.image_prompt),
      thumbnail_status: "fallback",
      thumbnail_provider: "fallback-gradient",
      thumbnail_version: QUOTE_THUMBNAIL_PIPELINE_VERSION,
      thumbnail_error: "missing_gemini_api_key",
      thumbnail_generated_at: new Date().toISOString(),
    });
    return {
      ok: false,
      quote: updated ?? initialQuote,
      status: "fallback",
      error: "missing_gemini_api_key",
    };
  }

  const generatingQuote =
    (await patchThumbnailSafe(supabase, quoteId, {
      thumbnail_status: "generating",
      thumbnail_error: null,
    })) ?? initialQuote;

  // ----- Step 1: analyze -----
  let direction: VisualDirection;
  let analyzeModel: string;
  let prompt: string;
  try {
    const analysis = await analyzeQuoteWithGemini(
      quoteToAnalyzable(generatingQuote),
      { apiKey },
    );
    direction = analysis.direction;
    analyzeModel = analysis.modelUsed;
    prompt = generateQuoteThumbnailPromptFromDirection(
      quoteToAnalyzable(generatingQuote),
      direction,
    );
  } catch (e) {
    const fallback = buildFallbackVisualDirection(
      quoteToAnalyzable(generatingQuote),
    );
    const updated = await patchThumbnailSafe(supabase, quoteId, {
      ...metadataPatchFromDirection(fallback, fallback.image_prompt),
      thumbnail_status: "fallback",
      thumbnail_provider: "fallback-gradient",
      thumbnail_version: QUOTE_THUMBNAIL_PIPELINE_VERSION,
      thumbnail_error: `analysis_failed: ${shortenError(e)}`,
      thumbnail_generated_at: new Date().toISOString(),
    });
    return {
      ok: false,
      quote: updated ?? generatingQuote,
      status: "fallback",
      error: shortenError(e),
    };
  }

  // Persist analysis metadata before image generation — even if the image
  // step fails the row will mood-match the deterministic gradient.
  await patchThumbnailSafe(
    supabase,
    quoteId,
    metadataPatchFromDirection(direction, prompt),
  );

  if (cleanupOldImages) {
    await deleteQuoteThumbnailsForQuote({ supabase, userId, quoteId });
  }

  // ----- Step 2: render image -----
  let imageBytes: Uint8Array;
  let imageMime: string;
  let imageModel: string;
  try {
    const image = await generateQuoteThumbnailImage({ apiKey, prompt });
    imageBytes = image.bytes;
    imageMime = image.mimeType;
    imageModel = image.modelUsed;
  } catch (e) {
    const detail =
      e instanceof QuoteThumbnailImageError
        ? `image_failed: ${e.message}`
        : `image_failed: ${shortenError(e)}`;
    const updated = await patchThumbnailSafe(supabase, quoteId, {
      thumbnail_status: "failed",
      thumbnail_error: detail,
      thumbnail_provider: `gemini-image+analyze:${analyzeModel}`,
      thumbnail_version: QUOTE_THUMBNAIL_PIPELINE_VERSION,
      thumbnail_generated_at: new Date().toISOString(),
    });
    return {
      ok: false,
      quote: updated ?? generatingQuote,
      status: "failed",
      error: detail,
    };
  }

  // ----- Step 3: upload -----
  let publicUrl: string;
  let storedVersion: string;
  try {
    const uploaded = await uploadQuoteThumbnailToSupabase({
      supabase,
      userId,
      quoteId,
      bytes: imageBytes,
      mimeType: imageMime,
      version: QUOTE_THUMBNAIL_PIPELINE_VERSION,
    });
    publicUrl = uploaded.publicUrl;
    storedVersion = uploaded.version;
  } catch (e) {
    const updated = await patchThumbnailSafe(supabase, quoteId, {
      thumbnail_status: "failed",
      thumbnail_error: `upload_failed: ${shortenError(e)}`,
      thumbnail_provider: `gemini-image:${imageModel}+analyze:${analyzeModel}`,
      thumbnail_version: QUOTE_THUMBNAIL_PIPELINE_VERSION,
      thumbnail_generated_at: new Date().toISOString(),
    });
    return {
      ok: false,
      quote: updated ?? generatingQuote,
      status: "failed",
      error: shortenError(e),
    };
  }

  // ----- Step 4: finalize -----
  const updated = await patchThumbnailSafe(supabase, quoteId, {
    thumbnail_url: publicUrl,
    thumbnail_status: "completed",
    thumbnail_error: null,
    thumbnail_generated_at: new Date().toISOString(),
    thumbnail_provider: `gemini-image:${imageModel}+analyze:${analyzeModel}`,
    thumbnail_version: storedVersion,
  });

  if (!updated) {
    // The image rendered fine; only the final DB write failed. Surface that
    // explicitly so the client can retry without re-running Gemini.
    return {
      ok: false,
      quote: generatingQuote,
      status: "failed",
      error: "thumbnail_finalize_failed",
    };
  }

  return {
    ok: true,
    quote: updated,
    modelUsed: `${analyzeModel} + ${imageModel}`,
    cached: false,
  };
}

/**
 * Convenience wrapper used by the regenerate route. Wipes prior storage
 * objects, marks the row as `generating`, and re-runs the full pipeline.
 */
export async function regenerateQuoteThumbnail(
  options: Omit<GenerateThumbnailOptions, "force" | "cleanupOldImages">,
): Promise<ThumbnailPipelineResult> {
  return generateQuoteThumbnail({
    ...options,
    force: true,
    cleanupOldImages: true,
  });
}

// ============================================================
// Backfill
// ============================================================

export type BackfillSummary = {
  processed: number;
  succeeded: number;
  failed: number;
  fallback: number;
  cached: number;
  errors: { quote_id: string; error: string }[];
};

export type BackfillOptions = {
  supabase: SupabaseClient;
  userId: string;
  /** Process at most N quotes — default 12. */
  limit?: number;
  /** Force re-roll even when a thumbnail already exists. */
  force?: boolean;
};

/**
 * Runs the pipeline against quotes that don't yet have a completed thumbnail.
 * Used by the admin route + the optional CLI script.
 */
export async function backfillMissingQuoteThumbnails(
  options: BackfillOptions,
): Promise<BackfillSummary> {
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 50);
  const summary: BackfillSummary = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    fallback: 0,
    cached: 0,
    errors: [],
  };

  let query = options.supabase
    .from("quotes")
    .select("id")
    .eq("user_id", options.userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!options.force) {
    query = query.or(
      "thumbnail_url.is.null,thumbnail_status.eq.failed,thumbnail_status.eq.fallback,thumbnail_status.eq.pending",
    );
  }

  const { data: rows, error } = await query;
  if (error) {
    throw new Error(`backfill_query_failed: ${error.message}`);
  }
  if (!rows || rows.length === 0) return summary;

  for (const row of rows as { id: string }[]) {
    summary.processed += 1;
    try {
      const result = await generateQuoteThumbnail({
        supabase: options.supabase,
        userId: options.userId,
        quoteId: row.id,
        force: options.force ?? false,
        cleanupOldImages: options.force ?? false,
      });
      if (result.ok && result.cached) summary.cached += 1;
      else if (result.ok) summary.succeeded += 1;
      else if (result.status === "fallback") summary.fallback += 1;
      else {
        summary.failed += 1;
        summary.errors.push({ quote_id: row.id, error: result.error });
      }
    } catch (e) {
      summary.failed += 1;
      summary.errors.push({ quote_id: row.id, error: shortenError(e) });
    }
  }

  return summary;
}
