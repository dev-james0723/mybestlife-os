import type { LifeAgentActionPreviewCard } from "@/lib/life-agent/action-types";
import type { LifeAgentSuggestedAction } from "@/lib/life-agent/chat-types";
import type { LifeAgentMemoryUsedItem } from "@/lib/life-agent/context-types";

export const LIFE_AGENT_UPLOAD_DETECTED_TYPES = [
  "receipt",
  "business_card",
  "relationship_photo",
  "asset_photo",
  "document",
  "screenshot",
  "text",
  "unknown",
] as const;

export type LifeAgentUploadDetectedType = (typeof LIFE_AGENT_UPLOAD_DETECTED_TYPES)[number];

export const LIFE_AGENT_UPLOAD_INTENTS = [
  "extract_tasks",
  "save_as_note",
  "update_relationship",
  "create_asset",
  "summarize",
  "draft_message",
  "create_project",
  "create_document_record",
  "analyze_image_memory",
] as const;

export type LifeAgentUploadIntent = (typeof LIFE_AGENT_UPLOAD_INTENTS)[number];

export type SuggestedTask = {
  title: string;
  description?: string;
  due_date?: string;
  priority?: "low" | "medium" | "high" | "urgent";
};

export type SuggestedRelationshipUpdate = {
  name_hint?: string;
  next_action: string;
  next_action_date?: string;
  notes?: string;
};

export type SuggestedAsset = {
  name: string;
  category_hint?: string;
  value_hint?: string;
  notes?: string;
};

export type SuggestedDocument = {
  title: string;
  document_type_hint?: string;
  summary?: string;
  expiry_hint?: string;
};

export type SuggestedNote = {
  title: string;
  content: string;
};

export type LifeAgentUploadAnalysis = {
  detectedType: LifeAgentUploadDetectedType;
  summary: string;
  extractedTasks?: SuggestedTask[];
  extractedRelationshipUpdate?: SuggestedRelationshipUpdate;
  extractedAsset?: SuggestedAsset;
  extractedDocument?: SuggestedDocument;
  extractedNote?: SuggestedNote;
  suggestedActions: LifeAgentSuggestedAction[];
  confidence: number;
  warnings: string[];
};

export type LifeAgentUploadRecord = {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  upload_type: LifeAgentUploadDetectedType;
  analysis_json: LifeAgentUploadAnalysis | null;
  created_at: string;
  updated_at: string;
};

export type AnalyzeUploadResponse = {
  uploadId: string;
  fileName: string;
  mimeType: string;
  previewUrl?: string;
  analysis: LifeAgentUploadAnalysis;
};

export type RouteUploadIntentRequest = {
  uploadId: string;
  intent: LifeAgentUploadIntent;
  conversationId?: string;
  temporaryPermissions?: Partial<Record<string, boolean>>;
};

export type RouteUploadIntentResponse = {
  uploadId: string;
  intent: LifeAgentUploadIntent;
  actionPreviews: LifeAgentActionPreviewCard[];
  invalidCount: number;
  memoryUsed: LifeAgentMemoryUsedItem[];
  warnings: string[];
};
