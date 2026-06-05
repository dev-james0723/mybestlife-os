"use client";

import {
  finalizeUploadedKnowledgeFile,
  uploadKnowledgeFileToStorage,
  type UploadedKnowledgeFileObject,
} from "@/lib/knowledge/client-file-upload";
import { ideasRepository } from "@/lib/repositories/ideas";
import {
  buildOSBuddyIdeaAttachment,
  buildOSBuddyIdeaContent,
  type OSBuddyDroppedFileItem,
} from "@/lib/os-buddy/os-buddy-file-drop";
import type { Idea } from "@/types/database";
import type { KnowledgeItem } from "@/types/knowledge";

export type OSBuddyFileRouteStage =
  | "uploading"
  | "saving-knowledge"
  | "saving-idea";

export type OSBuddyFileRouteResult = {
  knowledgeItem: KnowledgeItem | null;
  idea: Idea | null;
  upload: UploadedKnowledgeFileObject;
};

export async function routeOSBuddyDroppedFile(input: {
  item: OSBuddyDroppedFileItem;
  language?: string | null;
  onStage?: (stage: OSBuddyFileRouteStage) => void;
}): Promise<OSBuddyFileRouteResult> {
  const { item, language, onStage } = input;
  const needsKnowledge = item.destination === "knowledge" || item.destination === "both";
  const needsIdea = item.destination === "idea" || item.destination === "both";

  onStage?.("uploading");
  const upload = await uploadKnowledgeFileToStorage(item.file, {
    createPhotoThumbnail: needsKnowledge,
  });

  let knowledgeItem: KnowledgeItem | null = null;
  let idea: Idea | null = null;

  if (needsKnowledge) {
    onStage?.("saving-knowledge");
    knowledgeItem = await finalizeUploadedKnowledgeFile(item.file, upload, {
      thumbnailStyle: "na",
      language: language ?? null,
    });
  }

  if (needsIdea) {
    onStage?.("saving-idea");
    idea = await ideasRepository.create({
      content: buildOSBuddyIdeaContent({
        name: item.name,
        kind: item.kind,
        knowledgeItemId: knowledgeItem?.id ?? null,
      }),
      title: item.name,
      source_type: "share",
      capture_kind: "idea",
      status: "captured",
      category: "random",
      attachments: [
        buildOSBuddyIdeaAttachment({
          storagePath: upload.storagePath,
          name: item.name,
          mimeType: upload.contentType || item.mime,
          size: item.size,
          kind: item.kind,
        }),
      ],
      destinations: knowledgeItem ? ["kb"] : [],
      linked_knowledge_item_ids: knowledgeItem ? [knowledgeItem.id] : [],
    });
  }

  return { knowledgeItem, idea, upload };
}
