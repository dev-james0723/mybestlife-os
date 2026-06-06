import type { CaptureKind, Idea } from "@/types/database";
import type { DestinationRoute } from "@/types/idea";

export type IdeaDraftMetadataResult = {
  category?: string;
  captureKind?: CaptureKind;
  sourceType?: Idea["source_type"];
  destinations: DestinationRoute[];
  linkedProjectIds: string[];
  linkedTaskIds: string[];
  linkedKnowledgeIds: string[];
};

export async function fetchIdeaDraftMetadata(params: {
  contentHtml: string;
  existingKind: CaptureKind;
  existingSourceType: Idea["source_type"];
  signal?: AbortSignal;
}): Promise<IdeaDraftMetadataResult> {
  const res = await fetch("/api/ideas/draft-metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      contentHtml: params.contentHtml,
      existingKind: params.existingKind,
      existingSourceType: params.existingSourceType,
    }),
    signal: params.signal,
  });

  if (!res.ok) {
    throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  }

  const data = (await res.json()) as Record<string, unknown>;
  const destinations = Array.isArray(data.destinations)
    ? data.destinations.filter(isDestinationRoute)
    : [];
  const linkedProjectIds = Array.isArray(data.linkedProjectIds)
    ? data.linkedProjectIds.filter(isString)
    : [];
  const linkedTaskIds = Array.isArray(data.linkedTaskIds)
    ? data.linkedTaskIds.filter(isString)
    : [];
  const linkedKnowledgeIds = Array.isArray(data.linkedKnowledgeIds)
    ? data.linkedKnowledgeIds.filter(isString)
    : [];

  return {
    category: typeof data.category === "string" ? data.category : undefined,
    captureKind: isCaptureKind(data.captureKind) ? data.captureKind : undefined,
    sourceType: isSourceType(data.sourceType) ? data.sourceType : undefined,
    destinations,
    linkedProjectIds,
    linkedTaskIds,
    linkedKnowledgeIds,
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDestinationRoute(value: unknown): value is DestinationRoute {
  return value === "task" || value === "kb" || value === "timeline" || value === "graph";
}

function isCaptureKind(value: unknown): value is CaptureKind {
  return value === "idea" || value === "task" || value === "note" || value === "goal";
}

function isSourceType(value: unknown): value is Idea["source_type"] {
  return value === "text" || value === "voice" || value === "share";
}
