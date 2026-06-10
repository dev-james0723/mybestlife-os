"use client";

import { addKnowledgeFromText, addKnowledgeFromUrl } from "@/lib/knowledge/mutations";
import {
  finalizeUploadedKnowledgeFile,
  uploadKnowledgeFileToStorage,
} from "@/lib/knowledge/client-file-upload";
import { fetchIdeaAutoEnrich } from "@/lib/ideas/fetchIdeaAutoEnrich";
import { fetchIdeaCardVisual } from "@/lib/ideas/fetchIdeaCardVisual";
import { ideasRepository } from "@/lib/repositories/ideas";
import {
  buildOSBuddyIdeaAttachment,
  OS_BUDDY_FILE_KIND_LABELS,
} from "@/lib/os-buddy/os-buddy-file-drop";
import {
  quickSnapEntryText,
  type OSBuddyQuickSnapDestination,
  type OSBuddyQuickSnapEntry,
  type OSBuddyQuickSnapPayload,
  type OSBuddyQuickSnapRouteResult,
} from "@/lib/os-buddy/os-buddy-quick-snap";
import type { Idea } from "@/types/database";
import type { KnowledgeItem } from "@/types/knowledge";

export type RouteOSBuddyQuickSnapPayloadInput = {
  payload: OSBuddyQuickSnapPayload;
  destination: OSBuddyQuickSnapDestination;
  language?: string | null;
  onIdeaUpdated?: (idea: Idea) => void;
};

function titleFromPayload(payload: OSBuddyQuickSnapPayload) {
  const label = payload.previewLabel.trim();
  if (!label) return "Quick Snap";
  return label.length > 120 ? `${label.slice(0, 117)}...` : label;
}

function knowledgeTitleFromEntry(entry: OSBuddyQuickSnapEntry) {
  if (entry.kind === "url") return entry.label || "Quick Snap Link";
  if (entry.kind === "file") return entry.name || "Quick Snap File";
  return entry.label || "Quick Snap";
}

function buildIdeaContent(payload: OSBuddyQuickSnapPayload) {
  const lines = [
    `Quick Snap captured by OS Buddy: ${payload.previewLabel}`,
    "",
  ];

  for (const entry of payload.entries) {
    if (entry.kind === "file") {
      lines.push(
        `File: ${entry.name}`,
        `Type: ${OS_BUDDY_FILE_KIND_LABELS[entry.fileKind]}`,
        "",
      );
      continue;
    }

    if (entry.kind === "url") {
      lines.push(`Link: ${entry.url}`, "");
      continue;
    }

    if (entry.kind === "html") {
      lines.push("HTML selection:", entry.text, "");
      continue;
    }

    lines.push(entry.text, "");
  }

  return lines.join("\n").trim();
}

async function uploadIdeaAttachments(entries: OSBuddyQuickSnapEntry[]) {
  const attachments = [];

  for (const entry of entries) {
    if (entry.kind !== "file") continue;
    const upload = await uploadKnowledgeFileToStorage(entry.file, {
      createPhotoThumbnail: false,
    });
    attachments.push(
      buildOSBuddyIdeaAttachment({
        storagePath: upload.storagePath,
        name: entry.name,
        mimeType: upload.contentType || entry.mime,
        size: entry.size,
        kind: entry.fileKind,
      }),
    );
  }

  return attachments;
}

function kickOffIdeaEnrichment(idea: Idea, onIdeaUpdated?: (idea: Idea) => void) {
  void fetchIdeaAutoEnrich({ ideaId: idea.id, includeVisual: true })
    .then((enriched) => {
      onIdeaUpdated?.(enriched);
    })
    .catch((err) => {
      console.warn(
        "[os-buddy-quick-snap] idea auto-enrich failed:",
        err instanceof Error ? err.message : String(err),
      );
      void fetchIdeaCardVisual({ ideaId: idea.id })
        .then((visual) => {
          onIdeaUpdated?.(visual);
        })
        .catch((visualErr) => {
          console.warn(
            "[os-buddy-quick-snap] idea visual fallback failed:",
            visualErr instanceof Error ? visualErr.message : String(visualErr),
          );
        });
    });
}

async function routeQuickSnapToIdea(
  input: RouteOSBuddyQuickSnapPayloadInput,
): Promise<{ ideas: Idea[]; knowledgeItems: KnowledgeItem[] }> {
  const attachments = await uploadIdeaAttachments(input.payload.entries);
  const idea = await ideasRepository.create({
    content: buildIdeaContent(input.payload),
    title: titleFromPayload(input.payload),
    source_type: "share",
    capture_kind: "idea",
    status: "captured",
    category: "random",
    attachments,
    destinations: [],
    linked_knowledge_item_ids: [],
  });

  kickOffIdeaEnrichment(idea, input.onIdeaUpdated);

  return { ideas: [idea], knowledgeItems: [] };
}

async function routeKnowledgeEntry(
  entry: OSBuddyQuickSnapEntry,
  language?: string | null,
) {
  if (entry.kind === "url") {
    return addKnowledgeFromUrl(entry.url, {
      thumbnailStyle: "na",
      language: language ?? undefined,
    });
  }

  if (entry.kind === "file") {
    const upload = await uploadKnowledgeFileToStorage(entry.file, {
      createPhotoThumbnail: true,
    });
    return finalizeUploadedKnowledgeFile(entry.file, upload, {
      thumbnailStyle: "na",
      language: language ?? null,
    });
  }

  if (entry.kind === "html") {
    return addKnowledgeFromText(knowledgeTitleFromEntry(entry), entry.text, {
      thumbnailStyle: "na",
      richHtml: entry.html,
      aiInputText: entry.text,
      language: language ?? undefined,
    });
  }

  return addKnowledgeFromText(knowledgeTitleFromEntry(entry), entry.text, {
    thumbnailStyle: "na",
    aiInputText: quickSnapEntryText(entry),
    language: language ?? undefined,
  });
}

async function routeQuickSnapToKnowledge(
  input: RouteOSBuddyQuickSnapPayloadInput,
): Promise<{ ideas: Idea[]; knowledgeItems: KnowledgeItem[] }> {
  const knowledgeItems: KnowledgeItem[] = [];

  for (const entry of input.payload.entries) {
    knowledgeItems.push(await routeKnowledgeEntry(entry, input.language));
  }

  return { ideas: [], knowledgeItems };
}

export async function routeOSBuddyQuickSnapPayload(
  input: RouteOSBuddyQuickSnapPayloadInput,
): Promise<OSBuddyQuickSnapRouteResult> {
  const result =
    input.destination === "idea"
      ? await routeQuickSnapToIdea(input)
      : await routeQuickSnapToKnowledge(input);

  const savedCount =
    input.destination === "idea"
      ? result.ideas.length
      : result.knowledgeItems.length;

  return {
    ...result,
    savedCount,
    ackContext: {
      destination: input.destination,
      primaryKind: input.payload.primaryKind,
      previewLabel: input.payload.previewLabel,
      savedCount,
      labels: input.payload.entries.map((entry) => entry.label).slice(0, 5),
    },
  };
}
