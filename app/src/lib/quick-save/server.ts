import { createHash } from "node:crypto";
import { insertOrRecoverOwned } from "@/lib/repositories/insert-or-recover";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  addKnowledgeFromText,
  addKnowledgeFromUrl,
  finalizeKnowledgeFileUpload,
} from "@/lib/knowledge/mutations";
import { normalizeQuickSaveCapture, quickSaveFileRefsToJson, buildQuickSaveIdeaContent } from "./payload";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { QuickSaveCapture, QuickSaveFileRef } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export async function getQuickSaveCaptureForUser(
  supabase: SupabaseServerClient,
  userId: string,
  captureId: string,
): Promise<QuickSaveCapture | null> {
  const { data, error } = await supabase
    .from("quick_save_captures")
    .select("*")
    .eq("id", captureId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeQuickSaveCapture(data) : null;
}

export async function insertQuickSaveCapture(
  supabase: SupabaseServerClient,
  input: {
    id: string;
    userId: string;
    title: string | null;
    text: string | null;
    url: string | null;
    normalizedUrl: string | null;
    fileRefs: QuickSaveFileRef[];
  },
): Promise<QuickSaveCapture> {
  const { data, error } = await supabase
    .from("quick_save_captures")
    .insert({
      id: input.id,
      user_id: input.userId,
      title: input.title,
      text: input.text,
      url: input.url,
      normalized_url: input.normalizedUrl,
      file_refs: input.fileRefs,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return normalizeQuickSaveCapture(data);
}

export async function createIdeaFromQuickSave(input: {
  operationId?: string;
  userId: string;
  title: string | null;
  text: string | null;
  normalizedUrl: string | null;
  fileRefs: QuickSaveFileRef[];
}) {
  const supabase = await createServerSupabaseClient();
  const content = buildQuickSaveIdeaContent(input);
  const { data } = await insertOrRecoverOwned(supabase, "ideas", {
      user_id: input.userId,
      content,
      source_type: "share",
      capture_kind: "idea",
      voice_transcript: null,
      linked_project_ids: [],
      linked_task_ids: [],
      linked_goal_ids: [],
      linked_idea_ids: [],
      status: "captured",
      category: "random",
      title: input.title ?? input.normalizedUrl ?? "Quick Save",
      manual_tags: [],
      ai_tags: [],
      destinations: [],
      attachments: quickSaveFileRefsToJson(input.fileRefs),
      ai_suggestions: null,
      linked_knowledge_item_ids: [],
      linked_node_ids: [],
      related_resource_refs: [],
    }, input.userId, input.operationId);
  return data as { id: string };
}

async function markCaptureFailed(
  supabase: SupabaseServerClient,
  userId: string,
  captureId: string,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : String(error);
  await supabase
    .from("quick_save_captures")
    .update({
      status: "failed",
      error_message: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", captureId)
    .eq("user_id", userId);
}

export async function saveQuickSaveCaptureToKnowledge(input: {
  captureId: string;
  userId: string;
  language?: AppLocale | string | null;
  allowAi?: boolean;
}): Promise<{ itemId: string }> {
  const supabase = await createServerSupabaseClient();
  const capture = await getQuickSaveCaptureForUser(supabase, input.userId, input.captureId);
  if (!capture) throw new Error("QUICK_SAVE_CAPTURE_NOT_FOUND");
  if (capture.status !== "pending" && capture.status !== "failed") {
    throw new Error("QUICK_SAVE_CAPTURE_NOT_PENDING");
  }

  try {
    if ((capture.normalized_url || capture.file_refs.length > 0) && input.allowAi !== true) {
      throw new Error("QUICK_SAVE_AI_CONSENT_REQUIRED");
    }
    let itemId: string | null = null;
    if (capture.normalized_url) {
      const item = await addKnowledgeFromUrl(capture.normalized_url, {
        operationId: capture.id,
        thumbnailStyle: "na",
        language: input.language ?? undefined,
      });
      itemId = item.id;
    } else if (capture.file_refs.length > 0) {
      for (const [index, file] of capture.file_refs.entries()) {
        const hash = createHash("sha256").update(`${capture.id}:${file.storage_path}`).digest("hex");
        const operationId = index === 0 ? capture.id : `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
        const item = await finalizeKnowledgeFileUpload({
          operationId,
          storagePath: file.storage_path,
          originalFileName: file.name,
          mimeType: file.mime_type,
          thumbnailStyle: "na",
          language: input.language ?? null,
          byteSizeHint: file.size,
        });
        itemId ??= item.id;
      }
    } else if (capture.text || capture.title) {
      const item = await addKnowledgeFromText(
        capture.title ?? "Quick Save",
        capture.text ?? capture.title ?? "",
        {
          thumbnailStyle: "na",
          sourceType: "plain_text",
          analyze: false,
          operationId: capture.id,
          language: input.language ?? undefined,
        },
      );
      itemId = item.id;
    }

    if (!itemId) throw new Error("QUICK_SAVE_NO_KNOWLEDGE_CONTENT");

    const { error } = await supabase
      .from("quick_save_captures")
      .update({
        status: "saved",
        destination: "knowledge",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.captureId)
      .eq("user_id", input.userId);
    if (error) throw error;
    return { itemId };
  } catch (error) {
    await markCaptureFailed(supabase, input.userId, input.captureId, error);
    throw error;
  }
}

export async function saveQuickSaveCaptureToIdea(input: {
  captureId: string;
  userId: string;
}): Promise<{ ideaId: string }> {
  const supabase = await createServerSupabaseClient();
  const capture = await getQuickSaveCaptureForUser(supabase, input.userId, input.captureId);
  if (!capture) throw new Error("QUICK_SAVE_CAPTURE_NOT_FOUND");
  if (capture.status !== "pending" && capture.status !== "failed") {
    throw new Error("QUICK_SAVE_CAPTURE_NOT_PENDING");
  }

  try {
    const idea = await createIdeaFromQuickSave({
      operationId: capture.id,
      userId: input.userId,
      title: capture.title,
      text: capture.text,
      normalizedUrl: capture.normalized_url,
      fileRefs: capture.file_refs,
    });

    const { error } = await supabase
      .from("quick_save_captures")
      .update({
        status: "saved",
        destination: "idea",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.captureId)
      .eq("user_id", input.userId);
    if (error) throw error;
    return { ideaId: idea.id };
  } catch (error) {
    await markCaptureFailed(supabase, input.userId, input.captureId, error);
    throw error;
  }
}

export async function discardQuickSaveCapture(input: {
  captureId: string;
  userId: string;
}): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("quick_save_captures")
    .update({
      status: "discarded",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.captureId)
    .eq("user_id", input.userId);
  if (error) throw error;
}
