import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import {
  buildIdeaCardIconPrompt,
  generateIdeaCardThumbnail,
  IDEA_CARD_VISUAL_STYLE_VERSION,
} from "@/lib/ideas/generate-idea-card-icon";
import { ideaAiSuggestions, previewIdeaTitle } from "@/lib/ideas/idea-helpers";
import { stripHtml } from "@/lib/utils/html";
import type { Idea, Json } from "@/types/database";
import type { IdeaAiSuggestions, IdeaCardVisual } from "@/types/idea";

export async function ensureIdeaCardVisual(params: {
  supabase: SupabaseClient;
  userId: string;
  idea: Idea;
  force?: boolean;
}): Promise<{ idea: Idea; cardVisual: IdeaCardVisual }> {
  const existing = ideaAiSuggestions(params.idea).cardVisual;
  const hasCurrent =
    !params.force &&
    existing?.imageUrl &&
    existing.styleVersion === IDEA_CARD_VISUAL_STYLE_VERSION &&
    !existing.error;

  if (hasCurrent && existing) {
    return { idea: params.idea, cardVisual: existing };
  }

  const plain = stripHtml(params.idea.content).replace(/\s+/g, " ").trim();
  const title = params.idea.title?.trim() || previewIdeaTitle(params.idea, 72);
  const tags = params.idea.ai_tags ?? [];
  const palette = existing?.palette?.length ? existing.palette : ["#7dd3fc", "#fdba74", "#6366f1"];

  const prompt = buildIdeaCardIconPrompt({
    ideaContent: plain,
    title,
    tags,
    palette,
  });

  const apiKey = getGeminiServerApiKey() ?? null;
  const image = await generateIdeaCardThumbnail({
    apiKey,
    prompt,
    title,
    palette,
  });

  const ext = image.mimeType.includes("svg")
    ? "svg"
    : image.mimeType.includes("jpeg") || image.mimeType.includes("jpg")
      ? "jpg"
      : image.mimeType.includes("webp")
        ? "webp"
        : "png";

  const storagePath = `${params.userId}/${params.idea.id}/${randomUUID()}.${ext}`;
  // Service role avoids storage RLS edge cases; DB update still scoped by user_id.
  let storageClient: SupabaseClient;
  try {
    storageClient = createServiceRoleSupabaseClient();
  } catch {
    storageClient = params.supabase;
  }
  const { error: uploadError } = await storageClient.storage
    .from("idea-card-icons")
    .upload(storagePath, image.imageBytes, {
      contentType: image.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`card_visual_upload: ${uploadError.message}`);
  }

  const { data: urlData } = storageClient.storage.from("idea-card-icons").getPublicUrl(storagePath);

  const cardVisual: IdeaCardVisual = {
    imageUrl: urlData.publicUrl,
    storagePath,
    prompt: image.promptUsed,
    model: image.modelUsed,
    palette,
    styleVersion: IDEA_CARD_VISUAL_STYLE_VERSION,
    generatedAt: new Date().toISOString(),
    error: undefined,
  };

  const aiSuggestions: IdeaAiSuggestions = {
    ...ideaAiSuggestions(params.idea),
    cardVisual,
  };

  const { data: updated, error: updateError } = await params.supabase
    .from("ideas")
    .update({
      ai_suggestions: aiSuggestions as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.idea.id)
    .eq("user_id", params.userId)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message ?? "card_visual_update_failed");
  }

  return { idea: updated as Idea, cardVisual };
}
