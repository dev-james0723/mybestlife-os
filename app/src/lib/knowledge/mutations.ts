"use server";

import { after } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  mapRowToItem,
  type ContentType,
  type KnowledgeItem,
  type ThumbnailStyle,
  contentTypeForSourceType,
  normalizeThumbnailStyle,
  parseThumbnailStyle,
} from "@/types/knowledge";
import { generateThumbnail } from "@/lib/knowledge/ai/generateThumbnail";
import { generateTitleSuggestion } from "@/lib/knowledge/ai/generateTitleSuggestion";
import { extractFileContent, extractKnowledgeFileWithServiceRole } from "@/lib/knowledge/ai/extractContent";
import { extractFileTextViaGemini } from "@/lib/knowledge/ai/geminiExtractFileText";
import {
  buildYouTubeContextFromOEmbed,
  fetchYouTubeOEmbed,
  isYouTubePageUrl,
  youTubeThumbnailUrlFromPageUrl,
} from "@/lib/knowledge/youtube";
import { findConnections } from "@/lib/knowledge/ai/findConnections";
import {
  tryFetchYoutubeTranscriptText,
  tryGeminiYoutubeTranscript,
} from "@/lib/knowledge/youtube-transcript";
import type { DocumentBrainJobSummary } from "@/lib/document-brain/map-extraction-job-row";
import { parseGitHubRepoUrl } from "@/lib/knowledge/github-readme";
import { classifyKnowledgeInput, classifyUrl } from "@/lib/knowledge/classify";
import {
  ingestArticle,
  ingestGitHubRepo,
  ingestMarkupInput,
  ingestSocialPost,
  ingestYouTube,
  runProviderCascade,
  type NormalizedIngest,
} from "@/lib/knowledge/providers";
import {
  generateKnowledgeDerivatives,
  type DerivativeResult,
} from "@/lib/knowledge/derivatives";
import {
  generateDeferredKnowledgeDetail,
  type KnowledgeDeferredDetailSection,
} from "@/lib/knowledge/ai/generateDeferredDetail";
import {
  runKnowledgeGeminiTaxonomyForItem,
  shouldRunKnowledgeGeminiTaxonomy,
} from "@/lib/knowledge/ai/runKnowledgeGeminiTaxonomy";
import { suggestTags } from "@/lib/knowledge/ai/suggestTags";
import { captureAndUploadSnapshot } from "@/lib/snapshot/service";
import {
  buildDerivativeUpdatePayload,
  buildInsertPayload,
} from "@/lib/knowledge/normalize";
import type { SourceType } from "@/types/knowledge-source";
import { type AppLocale, parseAppLocale } from "@/lib/i18n/app-locale";
import { knowledgeFilesProxyUrlFromStoragePath } from "@/lib/knowledge/storage-thumbnail-url";
import {
  guessMimeFromExtension,
  isVideoExtension,
  KNOWLEDGE_FILE_MAX_BYTES,
  KNOWLEDGE_PHOTO_MAX_BYTES,
  KNOWLEDGE_VIDEO_MAX_BYTES,
} from "@/lib/knowledge/knowledge-file-upload";

// ── Status helpers ────────────────────────────────────────────────────────

/**
 * Snapshot of the user's existing tag inventory used by the AI tagger.
 *
 * Pulls every distinct tag string the user has ever produced (across both
 * `ai_tags` and `manual_tags`), deduped and capped. The tagger uses this to
 * prefer reusing existing tags rather than minting near-duplicates.
 */
async function loadUserTagInventory(
  userId: string,
  excludeItemId?: string,
): Promise<string[]> {
  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("knowledge_items")
      .select("ai_tags, manual_tags")
      .eq("user_id", userId);
    if (excludeItemId) query = query.neq("id", excludeItemId);
    const { data, error } = await query.limit(500);
    if (error || !data) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const row of data as Array<{ ai_tags?: string[]; manual_tags?: string[] }>) {
      for (const tag of [...(row.ai_tags ?? []), ...(row.manual_tags ?? [])]) {
        const trimmed = (tag ?? "").trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(trimmed);
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function loadProfileLanguage(): Promise<AppLocale | undefined> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return undefined;
    const { data } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle();
    const raw = data && typeof data === "object" ? (data as { language?: unknown }).language : undefined;
    if (typeof raw === "string" && raw.trim()) {
      return parseAppLocale(raw);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function updateProcessingStep(itemId: string, step: string) {
  const supabase = await createServerSupabaseClient();
  await supabase
    .from("knowledge_items")
    .update({ processing_step: step, date_modified: new Date().toISOString() })
    .eq("id", itemId);
}

async function markError(itemId: string, step: string, error: string) {
  const supabase = await createServerSupabaseClient();
  await supabase
    .from("knowledge_items")
    .update({
      status: "error",
      processing_step: null,
      error_details: { step, error: error.slice(0, 500) },
      extraction_status: "failed",
      date_modified: new Date().toISOString(),
    })
    .eq("id", itemId);
}

/**
 * When MinerU HTTP dispatch fails (wrong URL, worker down, etc.), still extract PDF text
 * in-process, mark the extraction job complete, write `document_analyses`, and run AI (soft-fail).
 */
async function recoverPdfKnowledgeItemAfterMinerUDispatchFailure(args: {
  jobId: string;
  userId: string;
  documentId: string;
  storagePath: string;
  originalFileName: string;
  fileMimeType: string | undefined;
  itemTitle: string;
  thumbnailStyle: ThumbnailStyle;
  targetLanguage: AppLocale | undefined;
  mineruError: string;
  contentType: ContentType;
}): Promise<boolean> {
  try {
    const rawText = await extractKnowledgeFileWithServiceRole(
      args.storagePath,
      args.originalFileName,
      args.fileMimeType,
    );
    const { completeExtractionJobWithLocalPdfFallback } = await import(
      "@/lib/document-brain/jobs/extractionJobService"
    );
    await completeExtractionJobWithLocalPdfFallback({
      jobId: args.jobId,
      userId: args.userId,
      documentId: args.documentId,
      rawText,
      documentTitle: args.itemTitle,
      mineruErrorSummary: args.mineruError,
    });

    try {
      const syntheticIngest: NormalizedIngest = {
        sourceType: "file_upload",
        provider: "local",
        category: mapContentTypeToCategory(args.contentType),
        label: "File",
        title: args.itemTitle,
        titleSource: "extracted",
        rawContent: rawText,
        aiInputText: rawText,
        metadata: {},
        extractionStatus: "success",
        transcriptStatus: "not_applicable",
        askEnabled: true,
        contentType: args.contentType,
      };

      await runSourceAwareAIProcessing({
        itemId: args.documentId,
        userId: args.userId,
        ingest: syntheticIngest,
        thumbnailStyle: args.thumbnailStyle,
        skipAiThumbnail: args.thumbnailStyle === "na",
        allowTitleSuggestion: args.thumbnailStyle === "na",
        targetLanguage: args.targetLanguage,
        softFail: true,
      });
    } catch (aiErr) {
      console.warn(`[document-brain] Post-fallback AI skipped for ${args.documentId}`, aiErr);
    }

    console.warn(
      `[document-brain] MinerU dispatch failed (${args.mineruError.slice(0, 160)}); local PDF fallback completed for ${args.documentId}`,
    );
    return true;
  } catch (err) {
    console.error(`[document-brain] Local PDF fallback failed for ${args.documentId}`, err);
    return false;
  }
}

/**
 * If processing finished with no tags (e.g. taxonomy join failed, or the
 * first suggestTags call returned nothing), run one more tag pass before
 * connections so cards are still discoverable.
 */
async function backfillKnowledgeTagsIfEmpty(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  itemId: string,
  knownTagInventory: string[],
): Promise<void> {
  try {
    const { data: row, error } = await supabase
      .from("knowledge_items")
      .select("ai_tags, title, raw_content, ai_summary, ai_tldr")
      .eq("id", itemId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !row) return;

    const existing =
      ((row as { ai_tags?: unknown }).ai_tags as string[] | null)?.filter(
        (t) => typeof t === "string" && t.trim(),
      ) ?? [];
    if (existing.length > 0) return;

    const r = row as {
      title: string;
      raw_content: string | null;
      ai_summary: string | null;
      ai_tldr: string | null;
    };
    const excerpt =
      [r.ai_tldr, r.ai_summary, r.raw_content].find(
        (s) => typeof s === "string" && s.trim(),
      ) ?? "";
    if (!String(excerpt).trim()) return;

    const tags = await suggestTags(String(excerpt), r.title || "Untitled", {
      knownTags: knownTagInventory,
    }).catch(() => [] as string[]);
    if (!tags.length) return;

    await supabase
      .from("knowledge_items")
      .update({ ai_tags: tags, date_modified: new Date().toISOString() })
      .eq("id", itemId)
      .eq("user_id", userId);
  } catch (e) {
    console.error(`[knowledge-ai] tag backfill failed for ${itemId}:`, e);
  }
}

// ── AI processing pipeline ────────────────────────────────────────────────

type RunAiProcessingArgs = {
  itemId: string;
  userId: string;
  ingest: NormalizedIngest;
  thumbnailStyle: ThumbnailStyle;
  skipAiThumbnail: boolean;
  allowTitleSuggestion: boolean;
  /** UI language the user has selected — AI output should always match it. */
  targetLanguage?: AppLocale;
  /**
   * When set, empty content / derivative failures log only — they do not flip the item to `error`.
   * Used after MinerU dispatch fails but local PDF fallback already marked the row ready.
   */
  softFail?: boolean;
};

/** Ensure Gemini always receives non-empty text (snapshot-only ingests had none). */
async function resolveAiInputTextForProcessing(ingest: NormalizedIngest): Promise<string> {
  let text = (ingest.aiInputText ?? ingest.rawContent ?? "").trim();
  if (text) return text;

  const url = ingest.sourceUrl?.trim();
  if (url) {
    try {
      const article = await ingestArticle(url);
      text = (article.aiInputText ?? article.rawContent ?? "").trim();
      if (text) return text;
    } catch {
      /* ignore — OG/article fetch is best-effort */
    }
  }

  return [
    ingest.title?.trim(),
    ingest.label?.trim(),
    ingest.authorName ? `Author: ${ingest.authorName}` : "",
    ingest.authorHandle ? String(ingest.authorHandle).trim() : "",
    url ? `Link: ${url}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

async function runSourceAwareAIProcessing(args: RunAiProcessingArgs): Promise<void> {
  const { itemId, userId, ingest, thumbnailStyle, skipAiThumbnail } = args;
  const supabase = await createServerSupabaseClient();

  // 0. Snapshot capture (deferred from the cascade).
  // Runs for any auto_snapshot row OR an authenticated_preview row that
  // doesn't yet have a screenshot. Failures are logged but non-fatal — the
  // card still has its data layer to render from.
  const needsSnapshot =
    !ingest.screenshotUrl &&
    (ingest.renderMode === "auto_snapshot" ||
      ingest.renderMode === "authenticated_preview");
  if (needsSnapshot && ingest.sourceUrl) {
    try {
      await updateProcessingStep(itemId, "Capturing snapshot…");
      const snap = await captureAndUploadSnapshot({
        url: ingest.sourceUrl,
        userId,
        knowledgeItemId: itemId,
        mode: ingest.renderMode === "authenticated_preview" ? "post" : "fullpage",
      });
      if (snap.ok) {
        await supabase
          .from("knowledge_items")
          .update({
            screenshot_url: snap.publicUrl,
            checked_at: snap.capturedAt,
            date_modified: new Date().toISOString(),
          })
          .eq("id", itemId);
      } else {
        // Downgrade preview_status when the wall is detected.
        const downgrade =
          snap.reason === "login_required"
            ? "login_required"
            : snap.reason === "private_or_restricted"
              ? "private_or_restricted"
              : snap.reason === "deleted_or_unavailable"
                ? "deleted_or_unavailable"
                : snap.reason === "geo_restricted"
                  ? "geo_restricted"
                  : "screenshot_failed";
        await supabase
          .from("knowledge_items")
          .update({
            preview_status: downgrade,
            // If we were a pure auto_snapshot row and snapshot failed, fall
            // back to metadata-only render so the UI doesn't show a broken
            // visual placeholder forever.
            render_mode:
              ingest.renderMode === "auto_snapshot" ? "metadata_preview" : ingest.renderMode,
            date_modified: new Date().toISOString(),
          })
          .eq("id", itemId);
      }
    } catch (err) {
      console.error(`[knowledge-snapshot] capture failed for ${itemId}:`, err);
    }
  }

  const aiInputText = await resolveAiInputTextForProcessing(ingest);
  if (!aiInputText) {
    if (args.softFail) {
      console.warn(`[knowledge-ai] softFail: no AI input for ${itemId}, leaving prior item state`);
      return;
    }
    await markError(itemId, "content_extraction", "No content available for AI processing");
    return;
  }

  // Snapshot of the user's existing tag inventory. The AI tagger uses it to
  // prefer reusing existing tags instead of inventing duplicates. We exclude
  // the in-flight item itself (it has no tags yet).
  const knownTags = await loadUserTagInventory(userId, itemId);

  // 1. Derivatives (summary/insights/etc.)
  let derivatives: DerivativeResult = {};
  try {
    await updateProcessingStep(itemId, processingStepFor(ingest.sourceType));
    derivatives = await generateKnowledgeDerivatives({
      sourceType: ingest.sourceType,
      title: ingest.title,
      aiInputText,
      contentType: ingest.contentType,
      youtubePageUrl:
        ingest.sourceType === "youtube_video" || ingest.sourceType === "youtube_shorts"
          ? ingest.sourceUrl
          : undefined,
      allowTitleSuggestion: args.allowTitleSuggestion,
      targetLanguage: args.targetLanguage,
      knownTags,
      // Always run legacy suggestTags here so ai_tags is populated even when
      // per-user DB taxonomy fails or is disabled. Taxonomy may still refine
      // tags afterward.
      skipTagSuggestions: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[knowledge-ai] Derivative generation failed for ${itemId}:`, msg);
    if (args.softFail) {
      console.warn(`[knowledge-ai] softFail: derivative failure for ${itemId}, leaving prior item state`);
      return;
    }
    await markError(itemId, "summary", msg);
    return;
  }

  const shouldOverrideTitle =
    args.allowTitleSuggestion &&
    (thumbnailStyle === "na" || ingest.sourceType.startsWith("social_"));

  const updatePayload = buildDerivativeUpdatePayload({
    ingest,
    derivatives,
    allowTitleOverride: shouldOverrideTitle,
  });

  await supabase.from("knowledge_items").update(updatePayload).eq("id", itemId);

  // 2. Thumbnail (non-blocking)
  if (!skipAiThumbnail && thumbnailStyle !== "na") {
    try {
      await updateProcessingStep(itemId, "Generating thumbnail…");
      const finalTitle =
        (typeof updatePayload.title === "string" ? updatePayload.title : ingest.title) ||
        ingest.title;
      const thumb = await generateThumbnail({
        title: finalTitle,
        summary: aiInputText.slice(0, 300),
        style: thumbnailStyle,
      });
      await supabase
        .from("knowledge_items")
        .update({ thumbnail_url: thumb.url, date_modified: new Date().toISOString() })
        .eq("id", itemId);
    } catch (err) {
      console.error(`[knowledge-ai] Thumbnail failed for ${itemId}:`, err);
    }
  }

  // 3. Mark ready
  await supabase
    .from("knowledge_items")
    .update({
      status: "ready",
      processing_step: null,
      error_details: null,
      date_modified: new Date().toISOString(),
    })
    .eq("id", itemId);

  // 3b. Per-user DB taxonomy + ai_tags (Gemini structured). Best-effort.
  if (shouldRunKnowledgeGeminiTaxonomy()) {
    try {
      await runKnowledgeGeminiTaxonomyForItem(supabase, userId, itemId);
    } catch (err) {
      console.error(`[knowledge-gemini-taxonomy] failed for ${itemId}:`, err);
    }
  }

  await backfillKnowledgeTagsIfEmpty(supabase, userId, itemId, knownTags);

  // 4. Connections (best-effort)
  try {
    await findConnections(itemId, userId);
  } catch (err) {
    console.error(`[knowledge-ai] Connections failed for ${itemId}:`, err);
  }
}

function processingStepFor(sourceType: SourceType): string {
  if (sourceType === "youtube_video" || sourceType === "youtube_shorts") {
    return "Analyzing YouTube video with Gemini…";
  }
  if (sourceType.startsWith("social_")) return "Summarizing social post…";
  if (sourceType === "github_repository") return "Analyzing repository README…";
  if (sourceType.startsWith("code_") || sourceType === "html_input" || sourceType === "markdown_input") {
    return "Analyzing code & markup…";
  }
  if (sourceType === "article_url") return "Summarizing article…";
  return "Generating summary & insights…";
}

// ── Public mutations ──────────────────────────────────────────────────────

export type AddKnowledgeFromUrlOptions = {
  thumbnailStyle?: ThumbnailStyle;
  /** Set by the Add modal for YouTube links when the user toggles the
   *  "Generate transcript" option. */
  withYouTubeTranscript?: boolean;
  /** UI language the AI output should be written in (overrides profile). */
  language?: AppLocale | string;
};

export async function addKnowledgeFromUrl(
  url: string,
  thumbnailStyleOrOptions: ThumbnailStyle | AddKnowledgeFromUrlOptions = "minimal",
): Promise<KnowledgeItem> {
  const options: AddKnowledgeFromUrlOptions =
    typeof thumbnailStyleOrOptions === "string"
      ? { thumbnailStyle: thumbnailStyleOrOptions }
      : (thumbnailStyleOrOptions ?? {});
  const thumbnailStyle: ThumbnailStyle = options.thumbnailStyle ?? "minimal";
  const targetLanguage =
    (options.language ? parseAppLocale(options.language) : undefined) ??
    (await loadProfileLanguage());

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Classify — cheap, client-safe, mirrored in the Add modal.
  const classification = classifyUrl(url) ?? classifyKnowledgeInput(url);

  // 2. Delegate to provider adapter via the cascade.
  // The cascade tries every matching provider in priority order until one
  // returns a success render mode (true_live_embed → authenticated_preview
  // → auto_snapshot → metadata_preview), then falls through to a clear
  // unavailable result. See `app/docs/social-provider-design.md`.
  let ingest: NormalizedIngest;
  let transcriptText: string | null = null;
  const nowIso = () => new Date().toISOString();

  try {
    if (classification.provider === "youtube") {
      // YouTube is special-cased so we can opt-in to transcript fetching.
      // The cascade's YouTubeProvider stub doesn't accept that option (yet);
      // this preserves the original behavior bit-for-bit.
      const result = await ingestYouTube(url, {
        withTranscript: Boolean(options.withYouTubeTranscript),
        isShorts: classification.sourceType === "youtube_shorts",
      });
      transcriptText = result.transcriptText ?? null;
      const { transcriptText: _drop, ...rest } = result;
      void _drop;
      ingest = {
        ...(rest as NormalizedIngest),
        renderMode: rest.renderMode ?? "true_live_embed",
        previewStatus: rest.previewStatus ?? "embed_success",
        checkedAt: rest.checkedAt ?? nowIso(),
      };
    } else {
      ingest = await runProviderCascade(url, {
        userId: user.id,
        classification,
        locale: typeof targetLanguage === "string" ? targetLanguage : "en",
      });
    }
  } catch (err) {
    // Cascade is fault-tolerant by design, but defend against unexpected
    // infrastructure errors (DB outage during connection lookup, etc.) by
    // dropping to a minimal article fallback.
    console.error("[knowledge-ai] cascade threw:", err);
    const fallback = await ingestArticle(url);
    ingest = {
      ...fallback,
      renderMode: fallback.renderMode ?? "metadata_preview",
      previewStatus: fallback.previewStatus ?? "metadata_success",
      checkedAt: fallback.checkedAt ?? nowIso(),
    };
  }

  // Preserve the YouTube static thumbnail for cards where we skipped AI thumbnail.
  const youTubeStaticThumb = youTubeThumbnailUrlFromPageUrl(url);
  // Social posts use the embedded post as the visual (see KnowledgeCard); skip AI image gen.
  const skipAiThumbnail =
    youTubeStaticThumb !== null ||
    thumbnailStyle === "na" ||
    ingest.category === "social_media";

  // 3. Insert
  const insertPayload = buildInsertPayload({
    userId: user.id,
    ingest,
    thumbnailStyle,
    processingStep: "Extracting content…",
    thumbnailOverride: youTubeStaticThumb ?? undefined,
    transcriptText,
  });

  const { data, error } = await supabase
    .from("knowledge_items")
    .insert(insertPayload)
    .select()
    .single();
  if (error) throw error;
  const item = mapRowToItem(data as Record<string, unknown>);

  // 4. AI background job
  after(() =>
    runSourceAwareAIProcessing({
      itemId: item.id,
      userId: user.id,
      ingest,
      thumbnailStyle,
      skipAiThumbnail,
      allowTitleSuggestion: thumbnailStyle === "na" || ingest.sourceType.startsWith("social_"),
      targetLanguage,
    }),
  );

  return item;
}

/**
 * Manual fallback when the cascade can't produce a usable preview (login wall,
 * private content, deleted post, etc.). The user provides:
 *   - the original URL
 *   - their own screenshot of the post (image File)
 *   - optionally: pasted caption, author, date, notes
 *
 * Result: a knowledge_items row with renderMode='user_snapshot', the image
 * stored in `knowledge-files/snapshots/{user}/...`, and the AI pipeline
 * scheduled to run on caption + screenshot OCR (Task #11's Gemini multimodal).
 */
export async function addKnowledgeFromUserSnapshot(
  formData: FormData,
): Promise<KnowledgeItem> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const url = (formData.get("url") as string | null)?.trim();
  if (!url) throw new Error("URL required for user snapshot.");
  const file = formData.get("image") as File | null;
  if (!file) throw new Error("Screenshot image required.");
  const caption = ((formData.get("caption") as string | null) ?? "").trim();
  const authorName = ((formData.get("authorName") as string | null) ?? "").trim();
  const authorHandle = ((formData.get("authorHandle") as string | null) ?? "").trim();
  const publishedAt = ((formData.get("publishedAt") as string | null) ?? "").trim();
  const notes = ((formData.get("notes") as string | null) ?? "").trim();
  const languageField = formData.get("language");
  const targetLanguage =
    (typeof languageField === "string" && languageField.trim()
      ? parseAppLocale(languageField)
      : undefined) ?? (await loadProfileLanguage());

  // 1. Classify the URL so we still get the right source_type / provider /
  //    category, even though our automatic extraction failed.
  const classification = classifyUrl(url) ?? classifyKnowledgeInput(url);

  // 2. Upload the screenshot.
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const storagePath = `snapshots/${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("knowledge-files")
    .upload(storagePath, file, { contentType: file.type || "image/png" });
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage
    .from("knowledge-files")
    .getPublicUrl(storagePath);
  const screenshotUrl = urlData.publicUrl;

  // 3. Build NormalizedIngest equivalent for the row + AI pipeline.
  const aiInput = [
    `Source: ${classification.label}`,
    authorName ? `Author: ${authorName}${authorHandle ? ` (${authorHandle})` : ""}` : "",
    publishedAt ? `Published: ${publishedAt}` : "",
    caption ? `Caption:\n${caption}` : "",
    notes ? `Notes:\n${notes}` : "",
    `URL: ${url}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const ingest: NormalizedIngest = {
    sourceType: classification.sourceType,
    provider: classification.provider,
    category: classification.category,
    label: classification.label,
    title: caption.split(/\n+/)[0]?.slice(0, 80) || classification.label,
    titleSource: caption ? "extracted" : "fallback",
    sourceUrl: url,
    sourceDomain: classification.metadata.domain,
    thumbnailUrl: screenshotUrl,
    rawContent: caption || undefined,
    aiInputText: aiInput || classification.label,
    metadata: {
      ...classification.metadata,
      author: authorName || classification.metadata.author,
      handle: authorHandle || classification.metadata.handle,
      publishedAt: publishedAt || classification.metadata.publishedAt,
    },
    extractionStatus: "success",
    transcriptStatus: "not_applicable",
    askEnabled: false,
    contentType: contentTypeForSourceType(classification.sourceType),
    renderMode: "user_snapshot",
    previewStatus: "user_snapshot_success",
    checkedAt: new Date().toISOString(),
    screenshotUrl,
    caption: caption || undefined,
    authorName: authorName || undefined,
    authorHandle: authorHandle || undefined,
  };

  // 4. Insert.
  const insertPayload = buildInsertPayload({
    userId: user.id,
    ingest,
    thumbnailStyle: "na", // user-uploaded image is the visual; skip AI thumb
    processingStep: "Summarizing your snapshot…",
    thumbnailOverride: screenshotUrl,
  });

  const { data, error } = await supabase
    .from("knowledge_items")
    .insert(insertPayload)
    .select()
    .single();
  if (error) throw error;
  const item = mapRowToItem(data as Record<string, unknown>);

  // 5. Insert the asset row for audit trail.
  try {
    await supabase.from("knowledge_assets").insert({
      knowledge_item_id: item.id,
      user_id: user.id,
      asset_type: "user_snapshot",
      storage_path: storagePath,
      public_url: screenshotUrl,
      source: "user_upload",
      mime_type: file.type || "image/png",
      byte_size: file.size,
    });
  } catch (err) {
    console.error("[knowledge-user-snapshot] asset insert failed:", err);
  }

  // 6. AI pipeline runs on caption + URL + metadata.
  after(() =>
    runSourceAwareAIProcessing({
      itemId: item.id,
      userId: user.id,
      ingest,
      thumbnailStyle: "na",
      skipAiThumbnail: true,
      allowTitleSuggestion: true,
      targetLanguage,
    }),
  );

  return item;
}

function assertKnowledgeStoragePathForUser(storagePath: string, userId: string): void {
  const normalized = storagePath.replace(/^\/+/, "");
  if (normalized.includes("..")) {
    throw new Error("KNOWLEDGE_INVALID_STORAGE_PATH");
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("KNOWLEDGE_INVALID_STORAGE_PATH");
  }
  const uuidSeg =
    /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

  if (
    segments[0] === "quick-save" &&
    segments[1] === userId &&
    segments.length >= 4 &&
    uuidSeg.test(segments[2]!)
  ) {
    return;
  }
  if (segments[0] !== userId) {
    throw new Error("KNOWLEDGE_FORBIDDEN_STORAGE_PATH");
  }

  // Legacy flat upload: {userId}/{uuid}.ext (optional _thumb before extension)
  if (segments.length === 2) {
    const fileSeg = segments[1]!;
    if (
      !/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:_thumb)?\.[a-z0-9]{1,12}$/i.test(
        fileSeg,
      )
    ) {
      throw new Error("KNOWLEDGE_INVALID_STORAGE_PATH");
    }
    return;
  }

  // Doc Brain layout: {userId}/documents/{documentId}/...
  if (segments[1] === "documents" && segments.length >= 3 && uuidSeg.test(segments[2]!)) {
    return;
  }

  throw new Error("KNOWLEDGE_INVALID_STORAGE_PATH");
}

async function getUploadedObjectByteSize(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storagePath: string,
  byteSizeHint?: number | null,
): Promise<number> {
  const segments = storagePath.split("/").filter(Boolean);
  if (segments.length < 2) throw new Error("KNOWLEDGE_INVALID_STORAGE_PATH");
  const fileName = segments[segments.length - 1]!;
  const folder = segments.slice(0, -1).join("/");
  const { data, error } = await supabase.storage
    .from("knowledge-files")
    .list(folder, { limit: 1000, search: fileName });
  if (error) throw error;
  const row = data?.find((o) => o.name === fileName);
  const size = row?.metadata && typeof row.metadata === "object" && "size" in row.metadata
    ? Number((row.metadata as { size?: unknown }).size)
    : NaN;
  if (Number.isFinite(size) && size >= 0) return size;

  if (typeof byteSizeHint === "number" && Number.isFinite(byteSizeHint) && byteSizeHint >= 0) {
    return byteSizeHint;
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from("knowledge-files")
    .download(storagePath);
  if (dlErr || !blob) {
    throw new Error("KNOWLEDGE_FILE_NOT_IN_STORAGE");
  }
  return blob.size;
}

async function insertKnowledgeFileAndQueueAiProcessing(args: {
  userId: string;
  storagePath: string;
  originalFileName: string;
  fileMimeType: string | undefined;
  style: ThumbnailStyle;
  targetLanguage: AppLocale | undefined;
  /** Optional compressed preview object (photos only). Card uses this path for `<img>`. */
  thumbnailStoragePath?: string | null;
}): Promise<KnowledgeItem> {
  const {
    userId,
    storagePath,
    originalFileName,
    fileMimeType,
    style,
    targetLanguage,
    thumbnailStoragePath,
  } = args;
  const ext = originalFileName.split(".").pop()?.toLowerCase() ?? "";
  const contentType = inferContentType(ext);
  const isPhotoUpload = contentType === "photo";
  const { isMinerUHttpConfigured } = await import("@/lib/document-brain/parser/mineruClient");
  const useMinerUQueue = ext === "pdf" && !isPhotoUpload && isMinerUHttpConfigured();

  const supabase = await createServerSupabaseClient();

  let thumbnailUrl: string | null = null;
  let effectiveThumbnailStyle: ThumbnailStyle = style;
  if (isPhotoUpload) {
    effectiveThumbnailStyle = "na";
    const thumbKey = thumbnailStoragePath ?? storagePath;
    thumbnailUrl = knowledgeFilesProxyUrlFromStoragePath(thumbKey);
  }

  const { data, error } = await supabase
    .from("knowledge_items")
    .insert({
      user_id: userId,
      title: originalFileName.replace(/\.[^.]+$/, ""),
      content_type: contentType,
      file_path: storagePath,
      thumbnail_url: thumbnailUrl,
      thumbnail_style: effectiveThumbnailStyle,
      status: "processing",
      processing_step: useMinerUQueue ? "Queued for MinerU extraction…" : "Extracting file content…",
      source_type: "file_upload",
      provider: "local",
      category: mapContentTypeToCategory(contentType),
      label: "File",
      extraction_status: useMinerUQueue ? "partial" : "success",
      transcript_status: "not_applicable",
      ask_enabled: true,
      title_source: "extracted",
    })
    .select()
    .single();

  if (error) throw error;
  const item = mapRowToItem(data as Record<string, unknown>);

  if (useMinerUQueue) {
    const { insertQueuedExtractionJob, markMinerUDispatchFailureAdmin } = await import(
      "@/lib/document-brain/jobs/extractionJobService"
    );
    const { dispatchMinerUExtractionHttp } = await import("@/lib/document-brain/parser/mineruClient");
    const { createSignedUrlForKnowledgePath } = await import(
      "@/lib/document-brain/storage/signedUrlService"
    );
    const { docBrainRootPrefix } = await import("@/lib/document-brain/storage/documentStorage");

    const job = await insertQueuedExtractionJob({
      userId,
      documentId: item.id,
      inputFilePath: storagePath,
      parserMode: process.env.MINERU_PARSER_MODE?.trim() || null,
    });

    let documentBrainJob: DocumentBrainJobSummary = {
      id: job.id,
      status: "queued",
      progress: 0,
      currentStage: "Queued for MinerU worker",
      parser: "mineru",
      retryCount: 0,
      maxRetries: 3,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    };

    try {
      const signed = await createSignedUrlForKnowledgePath(storagePath, 3600);
      const out = docBrainRootPrefix(userId, item.id);
      const res = await dispatchMinerUExtractionHttp({
        jobId: job.id,
        userId,
        documentId: item.id,
        signedInputUrl: signed,
        inputStoragePath: storagePath,
        outputBasePath: out,
        parserMode: process.env.MINERU_PARSER_MODE?.trim() || null,
      });
      if (!res.ok) {
        const dispatchErr = [res.status != null ? `HTTP ${res.status}` : "", res.error ?? ""]
          .filter((s) => String(s).trim())
          .join(": ")
          .trim();
        const recovered = await recoverPdfKnowledgeItemAfterMinerUDispatchFailure({
          jobId: job.id,
          userId,
          documentId: item.id,
          storagePath,
          originalFileName,
          fileMimeType,
          itemTitle: item.title,
          thumbnailStyle: effectiveThumbnailStyle,
          targetLanguage,
          mineruError: dispatchErr || "MinerU dispatch failed",
          contentType,
        });
        if (!recovered) {
          await markMinerUDispatchFailureAdmin({
            jobId: job.id,
            userId,
            documentId: item.id,
            jobErrorMessage: res.error ?? "dispatch_failed",
            itemErrorMessage: res.error ?? "MinerU dispatch failed",
          });
        }
      } else {
        const sb = await createServerSupabaseClient();
        const { data: jr } = await sb
          .from("document_extraction_jobs")
          .select(
            "id,status,progress,current_stage,parser,retry_count,max_retries,error_message,created_at",
          )
          .eq("id", job.id)
          .maybeSingle();
        if (jr && typeof jr === "object") {
          const { mapRowToDocumentBrainJob } = await import("@/lib/document-brain/map-extraction-job-row");
          documentBrainJob = mapRowToDocumentBrainJob(jr as Record<string, unknown>);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[document-brain] dispatch failed for ${item.id}`, msg);
      const recovered = await recoverPdfKnowledgeItemAfterMinerUDispatchFailure({
        jobId: job.id,
        userId,
        documentId: item.id,
        storagePath,
        originalFileName,
        fileMimeType,
        itemTitle: item.title,
        thumbnailStyle: effectiveThumbnailStyle,
        targetLanguage,
        mineruError: msg,
        contentType,
      });
      if (!recovered) {
        await markMinerUDispatchFailureAdmin({
          jobId: job.id,
          userId,
          documentId: item.id,
          jobErrorMessage: msg,
          itemErrorMessage: msg,
        });
      }
    }

    return {
      ...item,
      documentBrainJob,
    };
  }

  after(async () => {
    let rawText: string;
    try {
      rawText = await extractFileContent(storagePath, originalFileName, fileMimeType);
      const sb = await createServerSupabaseClient();
      await sb
        .from("knowledge_items")
        .update({
          raw_content: rawText.slice(0, 100000) || null,
          date_modified: new Date().toISOString(),
        })
        .eq("id", item.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[knowledge-ai] File extraction failed for ${item.id}:`, msg);
      await markError(item.id, "content_extraction", msg);
      return;
    }

    const syntheticIngest: NormalizedIngest = {
      sourceType: "file_upload",
      provider: "local",
      category: mapContentTypeToCategory(contentType),
      label: "File",
      title: item.title,
      titleSource: "extracted",
      rawContent: rawText,
      aiInputText: rawText,
      metadata: {},
      extractionStatus: "success",
      transcriptStatus: "not_applicable",
      askEnabled: true,
      contentType,
    };

    await runSourceAwareAIProcessing({
      itemId: item.id,
      userId,
      ingest: syntheticIngest,
      thumbnailStyle: effectiveThumbnailStyle,
      skipAiThumbnail: effectiveThumbnailStyle === "na",
      allowTitleSuggestion: effectiveThumbnailStyle === "na",
      targetLanguage,
    });
  });

  return item;
}

/**
 * Call after the binary is already in `knowledge-files` at `storagePath`
 * (e.g. client-side upload). Validates ownership, size limits, then inserts the row + AI pipeline.
 */
export async function finalizeKnowledgeFileUpload(input: {
  storagePath: string;
  originalFileName: string;
  mimeType?: string | null;
  thumbnailStyle?: string | null;
  language?: string | null;
  /** Client-reported size when Storage list metadata is missing (avoids downloading large binaries on the server). */
  byteSizeHint?: number | null;
  /** Compressed preview object path for photo cards (client-generated JPEG). */
  thumbnailStoragePath?: string | null;
}): Promise<KnowledgeItem> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  assertKnowledgeStoragePathForUser(input.storagePath, user.id);
  if (input.thumbnailStoragePath?.trim()) {
    assertKnowledgeStoragePathForUser(input.thumbnailStoragePath.trim(), user.id);
  }

  const style = parseThumbnailStyle(input.thumbnailStyle ?? null);
  const languageField = input.language;
  const targetLanguage =
    (typeof languageField === "string" && languageField.trim()
      ? parseAppLocale(languageField)
      : undefined) ?? (await loadProfileLanguage());

  const ext = input.originalFileName.split(".").pop()?.toLowerCase() ?? "";
  const resolvedMime =
    (typeof input.mimeType === "string" && input.mimeType.trim()
      ? input.mimeType
      : undefined) ?? guessMimeFromExtension(ext);

  let byteSize: number;
  try {
    byteSize = await getUploadedObjectByteSize(supabase, input.storagePath, input.byteSizeHint);
  } catch {
    throw new Error("KNOWLEDGE_FILE_NOT_IN_STORAGE");
  }

  const inferredContentType = inferContentType(ext);

  const treatAsVideo =
    isVideoExtension(ext) ||
    (resolvedMime ?? "").startsWith("video/");

  const thumbPath = input.thumbnailStoragePath?.trim();

  async function cleanupUploadedObjects(): Promise<void> {
    await supabase.storage.from("knowledge-files").remove([input.storagePath]);
    if (thumbPath) await supabase.storage.from("knowledge-files").remove([thumbPath]);
  }

  if (treatAsVideo && byteSize > KNOWLEDGE_VIDEO_MAX_BYTES) {
    await cleanupUploadedObjects();
    throw new Error("VIDEO_TOO_LARGE");
  }

  if (inferredContentType === "photo" && byteSize > KNOWLEDGE_PHOTO_MAX_BYTES) {
    await cleanupUploadedObjects();
    throw new Error("PHOTO_TOO_LARGE");
  }

  if (!treatAsVideo && inferredContentType !== "photo" && byteSize > KNOWLEDGE_FILE_MAX_BYTES) {
    await cleanupUploadedObjects();
    throw new Error("FILE_TOO_LARGE");
  }

  return insertKnowledgeFileAndQueueAiProcessing({
    userId: user.id,
    storagePath: input.storagePath,
    originalFileName: input.originalFileName,
    fileMimeType: resolvedMime,
    style,
    targetLanguage,
    thumbnailStoragePath: thumbPath ?? null,
  });
}

export async function addKnowledgeFromFile(
  formData: FormData,
): Promise<KnowledgeItem> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");

  const style = parseThumbnailStyle(formData.get("thumbnailStyle"));
  const languageField = formData.get("language");
  const targetLanguage =
    (typeof languageField === "string" && languageField.trim()
      ? parseAppLocale(languageField)
      : undefined) ?? (await loadProfileLanguage());
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const resolvedMime = file.type?.trim() || guessMimeFromExtension(ext) || "application/octet-stream";
  const treatAsVideo =
    isVideoExtension(ext) || resolvedMime.startsWith("video/");
  const inferredContentType = inferContentType(ext);
  if (treatAsVideo && file.size > KNOWLEDGE_VIDEO_MAX_BYTES) {
    throw new Error("VIDEO_TOO_LARGE");
  }
  if (inferredContentType === "photo" && file.size > KNOWLEDGE_PHOTO_MAX_BYTES) {
    throw new Error("PHOTO_TOO_LARGE");
  }
  if (!treatAsVideo && inferredContentType !== "photo" && file.size > KNOWLEDGE_FILE_MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const { error: uploadError } = await supabase.storage
    .from("knowledge-files")
    .upload(storagePath, file, {
      contentType: resolvedMime,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  return insertKnowledgeFileAndQueueAiProcessing({
    userId: user.id,
    storagePath,
    originalFileName: file.name,
    fileMimeType: file.type || guessMimeFromExtension(ext),
    style,
    targetLanguage,
    thumbnailStoragePath: null,
  });
}

export type AddKnowledgeFromTextOptions = {
  thumbnailStyle?: ThumbnailStyle;
  /** Fine-grained source type chosen by the classifier on the client. */
  sourceType?: SourceType;
  /** When the type supports both Preview and Source, which one the user chose. */
  displayModeDefault?: "preview" | "source";
  /** Rich-text HTML fallback (for classic paragraphs with formatting). */
  richHtml?: string;
  /** Plain-text / code source used as the AI input. */
  aiInputText?: string;
  /** UI language the AI output should be written in. */
  language?: AppLocale | string;
};

export async function addKnowledgeFromText(
  title: string,
  text: string,
  thumbnailStyleOrOptions: ThumbnailStyle | AddKnowledgeFromTextOptions = "minimal",
  legacyAiTextOverride?: string,
): Promise<KnowledgeItem> {
  const options: AddKnowledgeFromTextOptions =
    typeof thumbnailStyleOrOptions === "string"
      ? { thumbnailStyle: thumbnailStyleOrOptions }
      : (thumbnailStyleOrOptions ?? {});

  const thumbnailStyle: ThumbnailStyle = options.thumbnailStyle ?? "minimal";
  const targetLanguage =
    (options.language ? parseAppLocale(options.language) : undefined) ??
    (await loadProfileLanguage());

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const aiInput = (legacyAiTextOverride ?? options.aiInputText ?? text ?? "").toString();
  const classification =
    options.sourceType
      ? { sourceType: options.sourceType, category: undefined }
      : classifyKnowledgeInput(aiInput);

  const ingest = ingestMarkupInput({
    sourceType: (options.sourceType ?? classification.sourceType) as SourceType,
    richHtml: options.richHtml,
    plainText: aiInput,
    codeSource: text,
    title: title || "Untitled Note",
    displayModeDefault: options.displayModeDefault,
  });

  const insertPayload = buildInsertPayload({
    userId: user.id,
    ingest,
    thumbnailStyle,
    processingStep: "Starting AI processing…",
  });

  const { data, error } = await supabase
    .from("knowledge_items")
    .insert(insertPayload)
    .select()
    .single();
  if (error) throw error;
  const item = mapRowToItem(data as Record<string, unknown>);

  after(() =>
    runSourceAwareAIProcessing({
      itemId: item.id,
      userId: user.id,
      ingest,
      thumbnailStyle,
      skipAiThumbnail: thumbnailStyle === "na",
      allowTitleSuggestion: thumbnailStyle === "na",
      targetLanguage,
    }),
  );

  return item;
}

export async function suggestTitleForTextDraft(
  rawText: string,
  currentTitle = "",
): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const normalizedText = rawText.trim();
  if (!normalizedText) return null;

  try {
    const suggestion = await generateTitleSuggestion({
      rawText: normalizedText.slice(0, 12000),
      currentTitle: currentTitle.trim() || "Untitled Note",
      contentType: "note",
      summary: normalizedText.slice(0, 800),
    });
    return suggestion.trim() || null;
  } catch (err) {
    console.error("[knowledge-ai] Draft title suggestion failed:", err);
    return null;
  }
}

export async function addKnowledgeFromVoice(formData: FormData): Promise<KnowledgeItem> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const audio = formData.get("audio") as File | null;
  const transcript = (formData.get("transcript") as string) || "";
  const style = parseThumbnailStyle(formData.get("thumbnailStyle"));
  const languageField = formData.get("language");
  const targetLanguage =
    (typeof languageField === "string" && languageField.trim()
      ? parseAppLocale(languageField)
      : undefined) ?? (await loadProfileLanguage());

  let storagePath: string | null = null;
  const audioMimeType = audio?.type || "audio/webm";
  const audioFileName = audio?.name || "recording.webm";

  if (audio) {
    const extFromName = audioFileName.split(".").pop()?.toLowerCase();
    const extFromMime = audioMimeType.split("/")[1]?.split(";")[0]?.toLowerCase();
    const ext = extFromName || extFromMime || "webm";
    storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("knowledge-files")
      .upload(storagePath, audio);
    if (uploadError) throw uploadError;
  }

  const initialRawContent = transcript.trim();
  const { data, error } = await supabase
    .from("knowledge_items")
    .insert({
      user_id: user.id,
      title: initialRawContent.slice(0, 60) || "Voice Memo",
      content_type: "podcast",
      file_path: storagePath,
      raw_content: initialRawContent || null,
      thumbnail_style: style,
      status: "processing",
      processing_step: audio ? "Transcribing audio…" : "Starting AI processing…",
      source_type: "voice_memo",
      provider: "local",
      category: "audio",
      label: "Voice Memo",
      extraction_status: "success",
      transcript_status: "not_applicable",
      ask_enabled: true,
      title_source: "fallback",
    })
    .select()
    .single();

  if (error) throw error;
  const item = mapRowToItem(data as Record<string, unknown>);

  after(async () => {
    let rawText = initialRawContent;
    try {
      if (storagePath) {
        const extracted = await extractFileContent(storagePath, audioFileName, audioMimeType);
        if (extracted.trim()) {
          rawText = rawText ? `${rawText}\n\n${extracted.trim()}` : extracted.trim();
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[knowledge-ai] Voice transcription failed for ${item.id}:`, msg);
      await markError(item.id, "content_extraction", msg);
      return;
    }

    if (!rawText.trim()) {
      await markError(item.id, "content_extraction", "No transcript or audio content available");
      return;
    }

    const normalizedRawText = rawText.slice(0, 100000);
    const fallbackTitle = normalizedRawText.slice(0, 60) || "Voice Memo";
    const finalTitle = item.title === "Voice Memo" ? fallbackTitle : item.title;

    const sb = await createServerSupabaseClient();
    await sb
      .from("knowledge_items")
      .update({
        raw_content: normalizedRawText,
        title: finalTitle,
        processing_step: "Starting AI processing…",
        date_modified: new Date().toISOString(),
      })
      .eq("id", item.id);

    const syntheticIngest: NormalizedIngest = {
      sourceType: "voice_memo",
      provider: "local",
      category: "audio",
      label: "Voice Memo",
      title: finalTitle,
      titleSource: item.title === "Voice Memo" ? "fallback" : "extracted",
      rawContent: normalizedRawText,
      aiInputText: normalizedRawText,
      metadata: {},
      extractionStatus: "success",
      transcriptStatus: "not_applicable",
      askEnabled: true,
      contentType: "podcast",
    };

    await runSourceAwareAIProcessing({
      itemId: item.id,
      userId: user.id,
      ingest: syntheticIngest,
      thumbnailStyle: style,
      skipAiThumbnail: style === "na",
      allowTitleSuggestion: style === "na",
      targetLanguage,
    });
  });

  return item;
}

export async function transcribeVoiceMemo(formData: FormData): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const audio = formData.get("audio") as File | null;
  if (!audio) throw new Error("No audio provided");

  const bytes = new Uint8Array(await audio.arrayBuffer());
  const mimeType = audio.type || "audio/webm";
  const fileName = audio.name || "recording.webm";

  return extractFileTextViaGemini({
    bytes,
    mimeType,
    fileName,
    mode: "transcribe",
    multilingualSpeech: true,
  });
}

export async function refreshYoutubeThumbnail(itemId: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data: row, error: fetchError } = await supabase
    .from("knowledge_items")
    .select("source_url")
    .eq("id", itemId)
    .single();

  if (fetchError || !row?.source_url) throw new Error("Item or source URL not found");

  const thumb = youTubeThumbnailUrlFromPageUrl(row.source_url as string);
  if (!thumb) throw new Error("Source is not a YouTube URL");

  const { error } = await supabase
    .from("knowledge_items")
    .update({
      thumbnail_url: thumb,
      date_modified: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (error) throw error;
  return thumb;
}

export async function regenerateThumbnail(
  itemId: string,
  style: ThumbnailStyle,
): Promise<string> {
  const supabase = await createServerSupabaseClient();

  const { data: kindRow } = await supabase
    .from("knowledge_items")
    .select("category")
    .eq("id", itemId)
    .maybeSingle();
  if (kindRow && (kindRow as { category?: string }).category === "social_media") {
    throw new Error("Social posts use the embedded post preview instead of AI thumbnails.");
  }

  if (style === "na") {
    await supabase
      .from("knowledge_items")
      .update({
        thumbnail_url: null,
        thumbnail_style: style,
        date_modified: new Date().toISOString(),
      })
      .eq("id", itemId);
    return "";
  }

  const { data: item } = await supabase
    .from("knowledge_items")
    .select("title, ai_summary")
    .eq("id", itemId)
    .single();

  if (!item) throw new Error("Item not found");

  const result = await generateThumbnail({
    title: item.title,
    summary: item.ai_summary || "",
    style,
  });

  await supabase
    .from("knowledge_items")
    .update({
      thumbnail_url: result.url,
      thumbnail_style: style,
      date_modified: new Date().toISOString(),
    })
    .eq("id", itemId);

  return result.url;
}

export async function updateKnowledgeItem(
  id: string,
  updates: Record<string, unknown>,
): Promise<KnowledgeItem> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("knowledge_items")
    .update({ ...updates, date_modified: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapRowToItem(data as Record<string, unknown>);
}

export async function generateKnowledgeDeferredSection(
  itemId: string,
  section: KnowledgeDeferredDetailSection,
): Promise<KnowledgeItem> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: row, error } = await supabase
    .from("knowledge_items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .single();

  if (error || !row) throw new Error("Item not found");

  const sourceUrl = typeof row.source_url === "string" ? row.source_url : "";
  const title = typeof row.title === "string" ? row.title : "Untitled";
  const sourceType =
    (typeof row.source_type === "string" ? row.source_type : undefined) ??
    (sourceUrl ? classifyUrl(sourceUrl)?.sourceType : undefined) ??
    "plain_text";
  const contentType = typeof row.content_type === "string" ? row.content_type : "note";
  const transcript =
    typeof row.youtube_transcript === "string" ? row.youtube_transcript.trim() : "";
  const rawContent = typeof row.raw_content === "string" ? row.raw_content.trim() : "";

  let aiInputText = "";
  if (sourceUrl && parseGitHubRepoUrl(sourceUrl)) {
    const repo = await ingestGitHubRepo(sourceUrl).catch(() => null);
    aiInputText = (repo?.aiInputText ?? repo?.rawContent ?? "").trim();
  }

  if (!aiInputText) {
    const syntheticIngest: NormalizedIngest = {
      sourceType: sourceType as SourceType,
      provider: (row.provider as NormalizedIngest["provider"]) ?? "web",
      category:
        (row.category as NormalizedIngest["category"]) ??
        (sourceType.startsWith("social_") ? "social_media" : "article"),
      label: (row.label as string) ?? "Item",
      title,
      titleSource: ((row.title_source as string) ?? "extracted") as "extracted" | "fallback",
      sourceUrl: sourceUrl || undefined,
      sourceDomain: (row.source_domain as string) || undefined,
      rawContent: [rawContent, transcript ? `Transcript:\n${transcript}` : ""]
        .filter(Boolean)
        .join("\n\n"),
      aiInputText: [rawContent, transcript ? `Transcript:\n${transcript}` : ""]
        .filter(Boolean)
        .join("\n\n"),
      metadata: (row.source_metadata as NormalizedIngest["metadata"]) ?? {},
      extractionStatus:
        (row.extraction_status as NormalizedIngest["extractionStatus"]) ?? "success",
      transcriptStatus:
        (row.transcript_status as NormalizedIngest["transcriptStatus"]) ?? "not_applicable",
      askEnabled: (row.ask_enabled as boolean) ?? true,
      contentType: contentType as NormalizedIngest["contentType"],
    };
    aiInputText = await resolveAiInputTextForProcessing(syntheticIngest);
  }

  if (!aiInputText.trim()) {
    throw new Error("No content available for detail generation");
  }

  const targetLanguage = await loadProfileLanguage();
  const items = await generateDeferredKnowledgeDetail({
    section,
    title,
    contentType,
    aiInputText,
    tldr: typeof row.ai_tldr === "string" ? row.ai_tldr : null,
    summary: typeof row.ai_summary === "string" ? row.ai_summary : null,
    targetLanguage,
  });

  const update =
    section === "keyInsights"
      ? { ai_key_insights: items }
      : { ai_questions_answered: items };

  const { data: updated, error: updateError } = await supabase
    .from("knowledge_items")
    .update({ ...update, date_modified: new Date().toISOString() })
    .eq("id", itemId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError || !updated) throw updateError ?? new Error("Item update failed");
  return mapRowToItem(updated as Record<string, unknown>);
}

export async function deleteKnowledgeItem(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Remove AI graph edges where this item is source or target. Use two `.eq()` deletes
  // instead of `.or(...)` — PostgREST can mis-parse UUIDs inside OR filters (hyphens).
  const { error: connAsSourceErr } = await supabase
    .from("knowledge_connections")
    .delete()
    .eq("source_item_id", id);
  if (connAsSourceErr) throw connAsSourceErr;

  const { error: connAsTargetErr } = await supabase
    .from("knowledge_connections")
    .delete()
    .eq("target_item_id", id);
  if (connAsTargetErr) throw connAsTargetErr;

  const { data: deletedRows, error } = await supabase
    .from("knowledge_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) throw error;
  if (!deletedRows?.length) {
    throw new Error("Item not found or could not be deleted");
  }
}

export async function retryProcessing(itemId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: item, error } = await supabase
    .from("knowledge_items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .single();

  if (error || !item) throw new Error("Item not found");

  await supabase
    .from("knowledge_items")
    .update({
      status: "processing",
      processing_step: "Retrying…",
      error_details: null,
      date_modified: new Date().toISOString(),
    })
    .eq("id", itemId);

  const sourceUrl = typeof item.source_url === "string" ? item.source_url : "";
  const sourceType = (typeof item.source_type === "string" ? item.source_type : undefined) as
    | SourceType
    | undefined;

  let rawText = (item.raw_content as string) || "";
  const classification =
    sourceUrl && !sourceType ? classifyUrl(sourceUrl) : null;
  const effectiveSourceType =
    sourceType ??
    classification?.sourceType ??
    (sourceUrl ? "article_url" : "plain_text");

  // Re-run the provider extraction so social/article items pick up newer
  // adapter behaviour (e.g. iframe-based social embeds added later) instead
  // of being stuck with whatever was originally stored.
  let refreshedIngest: NormalizedIngest | null = null;
  const classificationForRetry = sourceUrl ? classifyUrl(sourceUrl) : null;

  if (isYouTubePageUrl(sourceUrl)) {
    const oembed = await fetchYouTubeOEmbed(sourceUrl);
    const oembedBlock = oembed ? buildYouTubeContextFromOEmbed(sourceUrl, oembed) : "";
    const tr =
      typeof item.youtube_transcript === "string" ? item.youtube_transcript.trim() : "";
    const trBlock = tr ? `Transcript:\n${tr.slice(0, 100_000)}` : "";
    rawText = [oembedBlock, trBlock, rawText]
      .filter((s) => s.trim().length > 0)
      .join("\n\n")
      .slice(0, 120_000);
  } else if (parseGitHubRepoUrl(sourceUrl)) {
    // GitHub repos — prefer re-fetching README as the AI input.
    const repo = await ingestGitHubRepo(sourceUrl).catch(() => null);
    if (repo?.aiInputText) rawText = repo.aiInputText.slice(0, 120_000);
  } else if (
    sourceUrl &&
    classificationForRetry?.category === "social_media"
  ) {
    refreshedIngest = await ingestSocialPost(sourceUrl, classificationForRetry).catch(
      () => null,
    );
  }

  const title = item.title as string;
  const contentType = item.content_type as string;
  const style = normalizeThumbnailStyle(item.thumbnail_style);

  const syntheticIngest: NormalizedIngest = refreshedIngest ?? {
    sourceType: effectiveSourceType as SourceType,
    provider: (item.provider as NormalizedIngest["provider"]) ?? "web",
    category:
      (item.category as NormalizedIngest["category"]) ??
      (effectiveSourceType.startsWith("social_") ? "social_media" : "article"),
    label: (item.label as string) ?? "Item",
    title,
    titleSource: ((item.title_source as string) ?? "extracted") as "extracted" | "fallback",
    sourceUrl: sourceUrl || undefined,
    sourceDomain: (item.source_domain as string) || undefined,
    rawContent: rawText || undefined,
    aiInputText: rawText || title,
    metadata: (item.source_metadata as NormalizedIngest["metadata"]) ?? {},
    extractionStatus:
      (item.extraction_status as NormalizedIngest["extractionStatus"]) ?? "success",
    transcriptStatus:
      (item.transcript_status as NormalizedIngest["transcriptStatus"]) ?? "not_applicable",
    askEnabled: (item.ask_enabled as boolean) ?? true,
    contentType: contentType as NormalizedIngest["contentType"],
  };

  // When the provider adapter produced fresh results, persist the new
  // embed_html / metadata / extraction_status before AI processing kicks in
  // so the UI shows the post embed immediately.
  if (refreshedIngest) {
    await supabase
      .from("knowledge_items")
      .update({
        embed_html: refreshedIngest.embedHtml ?? null,
        source_metadata: refreshedIngest.metadata ?? null,
        extraction_status: refreshedIngest.extractionStatus,
        thumbnail_url:
          refreshedIngest.thumbnailUrl ?? (item.thumbnail_url as string | null) ?? null,
        raw_content:
          refreshedIngest.rawContent ?? (item.raw_content as string | null) ?? null,
        provider: refreshedIngest.provider,
        category: refreshedIngest.category,
        label: refreshedIngest.label,
        source_type: refreshedIngest.sourceType,
        date_modified: new Date().toISOString(),
      })
      .eq("id", itemId);
  }

  const targetLanguage = await loadProfileLanguage();

  after(() =>
    runSourceAwareAIProcessing({
      itemId,
      userId: user.id,
      ingest: syntheticIngest,
      thumbnailStyle: style,
      skipAiThumbnail:
        style === "na" ||
        isYouTubePageUrl(sourceUrl) ||
        syntheticIngest.category === "social_media",
      allowTitleSuggestion:
        style === "na" || syntheticIngest.sourceType.startsWith("social_"),
      targetLanguage,
    }),
  );
}

export async function generateYouTubeKnowledgeTranscript(
  itemId: string,
): Promise<KnowledgeItem> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: row, error } = await supabase
    .from("knowledge_items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .single();

  if (error || !row) throw new Error("Item not found");

  const sourceUrl = typeof row.source_url === "string" ? row.source_url : "";
  if (!isYouTubePageUrl(sourceUrl)) {
    throw new Error("Not a YouTube knowledge item");
  }

  let transcript = await tryFetchYoutubeTranscriptText(sourceUrl);
  if (!transcript) {
    transcript = await tryGeminiYoutubeTranscript(sourceUrl);
  }

  if (!transcript?.trim()) {
    // Record the failure so the UI can show a friendly unavailable state.
    await supabase
      .from("knowledge_items")
      .update({
        transcript_status: "unavailable",
        date_modified: new Date().toISOString(),
      })
      .eq("id", itemId);
    throw new Error("Could not fetch or generate a transcript for this video");
  }

  const capped = transcript.trim().slice(0, 500_000);
  const { data: updated, error: upErr } = await supabase
    .from("knowledge_items")
    .update({
      youtube_transcript: capped,
      transcript_status: "generated",
      date_modified: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select()
    .single();

  if (upErr || !updated) throw upErr ?? new Error("Update failed");
  return mapRowToItem(updated as Record<string, unknown>);
}

/**
 * Overwrite the Storage object at this item's `file_path` (same knowledge path).
 * Re-extracts text so Ask-the-Document stays aligned with the saved bytes.
 */
export async function replaceKnowledgeUploadedFile(
  itemId: string,
  formData: FormData,
): Promise<KnowledgeItem> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file");

  const { data: row, error: fetchErr } = await supabase
    .from("knowledge_items")
    .select("user_id, file_path")
    .eq("id", itemId)
    .maybeSingle();

  if (fetchErr || !row) throw new Error("Item not found");

  const ownerId = (row as { user_id: string }).user_id;
  if (ownerId !== user.id) throw new Error("Forbidden");

  const storagePath = (row as { file_path: string | null }).file_path?.trim();
  if (!storagePath) throw new Error("No file attached to this item");

  assertKnowledgeStoragePathForUser(storagePath, user.id);

  if (file.size > KNOWLEDGE_FILE_MAX_BYTES) {
    throw new Error("KNOWLEDGE_FILE_TOO_LARGE");
  }

  const pathExt = storagePath.split("/").pop()?.split(".").pop()?.toLowerCase() ?? "";
  const nameExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (pathExt !== nameExt) {
    throw new Error("KNOWLEDGE_FILE_EXTENSION_MISMATCH");
  }

  const mime =
    file.type?.trim() || guessMimeFromExtension(pathExt) || "application/octet-stream";

  const { error: upErr } = await supabase.storage.from("knowledge-files").upload(storagePath, file, {
    upsert: true,
    contentType: mime,
  });

  if (upErr) throw upErr;

  const originalName = storagePath.split("/").pop() ?? "file";
  let rawText = "";
  try {
    rawText = await extractFileContent(storagePath, originalName, mime);
  } catch (e) {
    console.warn("[knowledge] replaceKnowledgeUploadedFile extract failed:", e);
  }

  const capped = rawText.slice(0, 100_000);

  const { data: updated, error: updErr } = await supabase
    .from("knowledge_items")
    .update({
      raw_content: capped || null,
      date_modified: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select()
    .single();

  if (updErr || !updated) throw updErr ?? new Error("Update failed");

  return mapRowToItem(updated as Record<string, unknown>);
}

// ── Helpers ──────────────────────────────────────────────────────────────

function inferContentType(ext: string): import("@/types/knowledge").ContentType {
  const map: Record<string, import("@/types/knowledge").ContentType> = {
    mp3: "podcast",
    wav: "podcast",
    ogg: "podcast",
    m4a: "podcast",
    flac: "podcast",
    aac: "podcast",
    mp4: "video",
    mov: "video",
    avi: "video",
    webm: "video",
    mkv: "video",
    m4v: "video",
    mpeg: "video",
    mpg: "video",
    jpg: "photo",
    jpeg: "photo",
    png: "photo",
    gif: "photo",
    webp: "photo",
    svg: "photo",
    heic: "photo",
    heif: "photo",
    pdf: "document",
    doc: "document",
    docx: "document",
    rtf: "document",
    txt: "document",
    md: "document",
    markdown: "document",
    epub: "book",
    mobi: "book",
    azw3: "book",
    csv: "dataset",
    tsv: "dataset",
    xls: "dataset",
    xlsx: "dataset",
    numbers: "dataset",
    ppt: "presentation",
    pptx: "presentation",
    key: "presentation",
    js: "code",
    jsx: "code",
    ts: "code",
    tsx: "code",
    py: "code",
    rb: "code",
    go: "code",
    rs: "code",
    java: "code",
    php: "code",
    css: "code",
    sql: "code",
    sh: "code",
    bash: "code",
    json: "code",
    yaml: "code",
    yml: "code",
  };
  return map[ext] ?? "file";
}

function mapContentTypeToCategory(
  contentType: import("@/types/knowledge").ContentType,
): import("@/types/knowledge-source").KnowledgeCategory {
  switch (contentType) {
    case "article":
    case "link":
    case "paper":
    case "book":
      return "article";
    case "video":
      return "video";
    case "social":
      return "social_media";
    case "podcast":
      return "audio";
    case "photo":
      return "image";
    case "code":
      return "code";
    case "repository":
      return "repository";
    case "document":
    case "dataset":
    case "presentation":
    case "file":
      return "file";
    case "quote":
    case "note":
    default:
      return "note";
  }
}
