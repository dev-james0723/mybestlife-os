"use client";

import { createClient } from "@/lib/supabase/client";
import { ideasRepository } from "@/lib/repositories/ideas";
import { addKnowledgeFromText } from "@/lib/knowledge/mutations";
import { fetchIdeaAutoEnrich } from "@/lib/ideas/fetchIdeaAutoEnrich";
import { stripHtml } from "@/lib/utils/html";
import type { DraftIdea, ImageAttachment } from "@/types/idea";
import type { Idea } from "@/types/database";

export type RouteResult = {
  idea: Idea;
  taskIds: string[];
  nodeIds: string[];
  knowledgeItemId: string | null;
  // Destinations that failed partway through; the idea row is still created.
  partialErrors: Array<{ destination: string; message: string }>;
};

function deriveTitle(draft: DraftIdea): string | null {
  if (draft.title.trim()) return draft.title.trim().slice(0, 120);
  const plain = stripHtml(draft.content);
  const firstLine = plain.split(/\r?\n/)[0]?.trim() ?? "";
  if (firstLine.length >= 3) return firstLine.slice(0, 120);
  return null;
}

function serialisableAttachments(attachments: ImageAttachment[]) {
  return attachments
    .filter((a) => a.upload_state === "done" && a.storage_path)
    .map((attachment) => {
      const { file, preview_url, ...rest } = attachment;
      void file;
      void preview_url;
      return rest;
    });
}

export async function routeIdea(draft: DraftIdea): Promise<RouteResult> {
  const title = deriveTitle(draft);
  const content = draft.content.trim() || draft.voiceTranscript?.trim() || "";

  // 1) Create the idea row first — it's the anchor for every other write.
  const idea = await ideasRepository.create({
    content,
    title,
    capture_kind: draft.captureKind,
    source_type: draft.sourceType,
    voice_transcript: draft.voiceTranscript,
    manual_tags: [],
    destinations: draft.destinations,
    attachments: serialisableAttachments(draft.attachments),
  });

  const partialErrors: RouteResult["partialErrors"] = [];
  let knowledgeItemId: string | null = null;
  let taskIds: string[] = [];
  let nodeIds: string[] = [];

  // 2) KB route — must run client-side to preserve the `after()` Gemini pipeline.
  if (draft.destinations.includes("kb") && content) {
    try {
      const item = await addKnowledgeFromText(title ?? "Idea", content);
      knowledgeItemId = item.id;
    } catch (err) {
      partialErrors.push({
        destination: "kb",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 3) Task / graph routes — atomic via RPC.
  const rpcDestinations = draft.destinations.filter(
    (d) => d === "task" || d === "graph",
  );
  if (rpcDestinations.length > 0) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("route_captured_idea", {
      p_idea_id: idea.id,
      p_destinations: rpcDestinations,
    });
    if (error) {
      partialErrors.push({ destination: rpcDestinations.join(","), message: error.message });
    } else if (data && typeof data === "object") {
      const payload = data as { task_ids?: string[]; node_ids?: string[] };
      taskIds = Array.isArray(payload.task_ids) ? payload.task_ids : [];
      nodeIds = Array.isArray(payload.node_ids) ? payload.node_ids : [];
    }
  }

  // 4) Persist linked_knowledge_item_ids on the idea if KB succeeded.
  // (Task/graph link-backs are already written by the RPC.)
  if (knowledgeItemId) {
    try {
      await ideasRepository.update(idea.id, {
        linked_knowledge_item_ids: [knowledgeItemId],
      });
    } catch (err) {
      partialErrors.push({
        destination: "kb-link",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  void fetchIdeaAutoEnrich({ ideaId: idea.id, includeVisual: true }).catch((err) => {
    console.warn("[idea-capture] auto-enrich failed:", err instanceof Error ? err.message : String(err));
  });

  return { idea, taskIds, nodeIds, knowledgeItemId, partialErrors };
}
