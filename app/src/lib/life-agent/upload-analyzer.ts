import { randomUUID } from "crypto";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { extractFileTextViaGemini } from "@/lib/knowledge/ai/geminiExtractFileText";
import type { LifeAgentSuggestedAction } from "@/lib/life-agent/chat-types";
import { LIFE_AGENT_UPLOAD_ANALYSIS_SCHEMA } from "@/lib/life-agent/upload-analysis-schema";
import {
  guessExtractMode,
  isTextMime,
} from "@/lib/life-agent/upload-storage";
import type {
  LifeAgentUploadAnalysis,
  LifeAgentUploadDetectedType,
  SuggestedAsset,
  SuggestedDocument,
  SuggestedNote,
  SuggestedRelationshipUpdate,
  SuggestedTask,
} from "@/lib/life-agent/upload-types";
import { LIFE_AGENT_UPLOAD_DETECTED_TYPES } from "@/lib/life-agent/upload-types";

const UPLOAD_SAFETY_RULES = `Safety rules (mandatory):
- Do NOT identify or name unknown people in photos.
- Do NOT infer sensitive traits (health, religion, politics, etc.) from images.
- Do NOT claim product ownership or authenticity from a product photo alone.
- Do NOT store or suggest storing sensitive personal data without explicit user review.
- Extract only what is clearly visible or readable. Use warnings when uncertain.
- All outputs are previews for user confirmation — never imply data was saved.`;

type RawAnalysis = {
  detectedType?: string;
  summary?: string;
  confidence?: number;
  warnings?: unknown;
  extractedTasks?: unknown;
  extractedRelationshipUpdate?: unknown;
  extractedAsset?: unknown;
  extractedDocument?: unknown;
  extractedNote?: unknown;
  suggestedActions?: unknown;
};

function clampConfidence(n: unknown): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function normalizeDetectedType(raw: unknown): LifeAgentUploadDetectedType {
  if (typeof raw === "string" && (LIFE_AGENT_UPLOAD_DETECTED_TYPES as readonly string[]).includes(raw)) {
    return raw as LifeAgentUploadDetectedType;
  }
  return "unknown";
}

function normalizeTasks(raw: unknown): SuggestedTask[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: SuggestedTask[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) continue;
    out.push({
      title: title.slice(0, 200),
      description:
        typeof row.description === "string" ? row.description.slice(0, 2000) : undefined,
      due_date: typeof row.due_date === "string" ? row.due_date : undefined,
      priority:
        row.priority === "low" ||
        row.priority === "medium" ||
        row.priority === "high" ||
        row.priority === "urgent"
          ? row.priority
          : undefined,
    });
  }
  return out.length ? out.slice(0, 12) : undefined;
}

function normalizeRelationship(raw: unknown): SuggestedRelationshipUpdate | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const next_action =
    typeof row.next_action === "string" ? row.next_action.trim() : "";
  if (!next_action) return undefined;
  return {
    name_hint: typeof row.name_hint === "string" ? row.name_hint.slice(0, 120) : undefined,
    next_action: next_action.slice(0, 500),
    next_action_date:
      typeof row.next_action_date === "string" ? row.next_action_date : undefined,
    notes: typeof row.notes === "string" ? row.notes.slice(0, 2000) : undefined,
  };
}

function normalizeAsset(raw: unknown): SuggestedAsset | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!name) return undefined;
  return {
    name: name.slice(0, 200),
    category_hint:
      typeof row.category_hint === "string" ? row.category_hint.slice(0, 120) : undefined,
    value_hint: typeof row.value_hint === "string" ? row.value_hint.slice(0, 80) : undefined,
    notes: typeof row.notes === "string" ? row.notes.slice(0, 2000) : undefined,
  };
}

function normalizeDocument(raw: unknown): SuggestedDocument | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (!title) return undefined;
  return {
    title: title.slice(0, 200),
    document_type_hint:
      typeof row.document_type_hint === "string"
        ? row.document_type_hint.slice(0, 80)
        : undefined,
    summary: typeof row.summary === "string" ? row.summary.slice(0, 4000) : undefined,
    expiry_hint:
      typeof row.expiry_hint === "string" ? row.expiry_hint.slice(0, 80) : undefined,
  };
}

function normalizeNote(raw: unknown): SuggestedNote | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const content = typeof row.content === "string" ? row.content.trim() : "";
  if (!title && !content) return undefined;
  return {
    title: (title || "Captured note").slice(0, 200),
    content: content.slice(0, 16000),
  };
}

function normalizeSuggestedActions(raw: unknown): LifeAgentSuggestedAction[] {
  if (!Array.isArray(raw)) return [];
  const out: LifeAgentSuggestedAction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const type = typeof row.type === "string" ? row.type : "";
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const description = typeof row.description === "string" ? row.description.trim() : "";
    if (!type || !title) continue;
    out.push({
      id: randomUUID(),
      type: type as LifeAgentSuggestedAction["type"],
      title: title.slice(0, 120),
      description: description.slice(0, 400),
      payload:
        row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
          ? (row.payload as Record<string, unknown>)
          : undefined,
      status: "preview",
    });
  }
  return out.slice(0, 8);
}

function normalizeAnalysis(raw: RawAnalysis): LifeAgentUploadAnalysis {
  const warnings: string[] = Array.isArray(raw.warnings)
    ? raw.warnings
        .filter((w): w is string => typeof w === "string" && w.trim().length > 0)
        .slice(0, 8)
    : [];

  return {
    detectedType: normalizeDetectedType(raw.detectedType),
    summary: typeof raw.summary === "string" ? raw.summary.trim().slice(0, 4000) : "",
    confidence: clampConfidence(raw.confidence),
    warnings,
    extractedTasks: normalizeTasks(raw.extractedTasks),
    extractedRelationshipUpdate: normalizeRelationship(raw.extractedRelationshipUpdate),
    extractedAsset: normalizeAsset(raw.extractedAsset),
    extractedDocument: normalizeDocument(raw.extractedDocument),
    extractedNote: normalizeNote(raw.extractedNote),
    suggestedActions: normalizeSuggestedActions(raw.suggestedActions),
  };
}

async function extractReadableContent(
  bytes: Uint8Array,
  mimeType: string,
  fileName: string,
): Promise<string> {
  if (isTextMime(mimeType)) {
    return new TextDecoder().decode(bytes).slice(0, 120_000);
  }
  const mode = guessExtractMode(mimeType);
  return extractFileTextViaGemini({
    bytes,
    mimeType,
    fileName,
    mode,
  });
}

export async function analyzeLifeAgentUpload(params: {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
  locale?: string;
}): Promise<LifeAgentUploadAnalysis> {
  const { bytes, mimeType, fileName, locale = "en" } = params;
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    throw new Error("gemini_api_key_missing");
  }

  let extractedText = "";
  try {
    extractedText = await extractReadableContent(bytes, mimeType, fileName);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      detectedType: "unknown",
      summary: `Could not read this file automatically (${msg}). You can still choose what to do with it.`,
      confidence: 0.2,
      warnings: [msg],
      suggestedActions: [],
    };
  }

  const userText = `File name: ${fileName}
MIME type: ${mimeType}
Locale: ${locale}

## Extracted content
${extractedText.slice(0, 80_000) || "(no readable text extracted)"}

Classify this upload and extract structured fields for Life OS routing.
Return conservative suggestions only.`;

  const { data } = await fetchGeminiStructured<RawAnalysis>({
    apiKey,
    model:
      process.env.GEMINI_LIFE_AGENT_MODEL?.trim() ||
      process.env.GEMINI_COMPANION_MODEL?.trim() ||
      getGeminiHabitsFlashModel(),
    systemInstruction: `You analyze uploads for a personal Life OS assistant.
${UPLOAD_SAFETY_RULES}

Detected types: receipt, business_card, relationship_photo, asset_photo, document, screenshot, text, unknown.
For business cards: suggest relationship update fields, not identity claims.
For receipts: suggest asset/document hints and tasks if amounts or deadlines appear.
For meeting notes: tasks, relationship follow-ups, promises.
For schedule screenshots: tasks with due dates when visible.
For idea dumps: note + optional project/tasks.
Never include suggestedActions that claim data was saved.`,
    userText,
    responseSchema: LIFE_AGENT_UPLOAD_ANALYSIS_SCHEMA,
    temperature: 0.35,
    maxOutputTokens: 4096,
    timeoutMs: 90_000,
  });

  const analysis = normalizeAnalysis(data);
  if (!analysis.summary) {
    analysis.summary = extractedText.slice(0, 500) || "Upload received — review suggested actions below.";
  }
  if (analysis.confidence < 0.35 && !analysis.warnings.length) {
    analysis.warnings.push("Low confidence — please verify extracted details before confirming.");
  }
  return analysis;
}
