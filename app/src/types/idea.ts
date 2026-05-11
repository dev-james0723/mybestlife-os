import type { CaptureKind } from "@/types/database";

// Where a captured idea can be routed after saving.
// 'timeline' requires no extra write — ideas surface there via created_at.
export type DestinationRoute = "task" | "kb" | "timeline" | "graph";

// Active input mode inside the composing canvas.
export type IdeaCaptureMode = "text" | "voice" | "image";

// Per-attachment state, held in memory during the capture session.
// `file` is stripped before localStorage persistence (non-serialisable).
// `preview_url` is an object URL created locally; it is also not persisted.
export type ImageAttachment = {
  id: string; // local uuid — stable React key before server id is known
  file?: File; // present client-side before upload completes
  preview_url: string; // object URL for inline preview (empty string when restored from localStorage)
  storage_path?: string; // set after successful Supabase Storage upload
  mime_type: string;
  size: number; // bytes
  alt_text?: string;
  upload_state: "pending" | "uploading" | "done" | "error";
  upload_progress?: number; // 0–100
  error?: string;
};

// Structured output from idea AI assist (Next.js API or legacy Edge Function).
export type AISuggestions = {
  title: string | null;
  ai_tags: string[];
  suggestedDestinations: DestinationRoute[];
  relatedNodeIds: string[];
  suggestedKind: CaptureKind | null;
};

// Local draft held in the Zustand store. Not yet persisted to Supabase.
export type DraftIdea = {
  content: string;
  title: string;
  captureKind: CaptureKind;
  destinations: DestinationRoute[];
  manualTags: string[];
  voiceTranscript: string | null;
  attachments: ImageAttachment[];
  sourceType: "text" | "voice";
};

// Shape that is safe to write to localStorage (no File / object URL).
export type PersistedDraft = Omit<DraftIdea, "attachments"> & {
  attachments: Omit<ImageAttachment, "file" | "preview_url">[];
};

export const DEFAULT_DRAFT: DraftIdea = {
  content: "",
  title: "",
  captureKind: "idea",
  destinations: [],
  manualTags: [],
  voiceTranscript: null,
  attachments: [],
  sourceType: "text",
};

// Returns true when a draft has capturable content (text, voice, or attachments).
export function hasDraft(draft: DraftIdea): boolean {
  return (
    draft.content.trim().length > 0 ||
    draft.voiceTranscript !== null ||
    draft.attachments.length > 0
  );
}
