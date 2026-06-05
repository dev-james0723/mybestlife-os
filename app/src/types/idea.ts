import type { CaptureKind } from "@/types/database";
import { stripHtml } from "@/lib/utils/html";

export type IdeaRelatedScope =
  | "idea"
  | "project"
  | "goal"
  | "resource"
  | "task"
  | "knowledge"
  | "bucket"
  | "career";

export type IdeaResourceKind =
  | "project_resource"
  | "asset"
  | "document"
  | "software_vault";

export type IdeaRelatedResource = {
  scope: IdeaRelatedScope;
  id: string;
  title: string;
  subtitle?: string;
  percentage: number;
  explanation: string;
  url?: string;
  resourceKind?: IdeaResourceKind;
  source?: string;
};

export type IdeaCardVisual = {
  imageUrl?: string;
  storagePath?: string;
  prompt?: string;
  model?: string;
  palette?: string[];
  fallbackSeed?: string;
  generatedAt?: string;
  error?: string;
  /** Bumped when thumbnail art direction changes (triggers one-time regen). */
  styleVersion?: string;
};

export type IdeaAiSuggestions = {
  /** @deprecated overview now mirrors user content; kept for backward compat. */
  summary?: string;
  /** One short sentence: what this idea is really about. */
  coreInsight?: string;
  /** One concrete action the user can take next. */
  suggestedNextStep?: string;
  /** How this idea can be used inside My Best Life OS. */
  possibleUse?: string;
  /** One useful follow-up question (omitted when not helpful). */
  clarifyingQuestion?: string;
  ai_tags?: string[];
  relatedResources?: IdeaRelatedResource[];
  cardVisual?: IdeaCardVisual;
  generatedAt?: string;
  model?: string;
};

// Where a captured idea can be routed after saving.
// 'timeline' requires no extra write — ideas surface there via created_at.
export type DestinationRoute = "task" | "kb" | "timeline" | "graph";

// Active input mode inside the composing canvas.
export type IdeaCaptureMode = "text" | "voice" | "image";

// Per-attachment state, held in memory during the capture session.
// `file` is stripped before localStorage persistence (non-serialisable).
// `preview_url` is an object URL created locally; it is also not persisted.
// The historical name is image-specific; keep it for compatibility while
// `IdeaAttachment` is used by newer general file/media intake flows.
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

export type IdeaAttachment = ImageAttachment;

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
  const textContent = stripHtml(draft.content).trim();
  return (
    textContent.length > 0 ||
    /<img\b/i.test(draft.content) ||
    (draft.voiceTranscript?.trim().length ?? 0) > 0 ||
    draft.attachments.length > 0
  );
}
