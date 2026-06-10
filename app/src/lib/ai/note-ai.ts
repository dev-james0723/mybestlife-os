import type { AppLocale } from "@/lib/i18n/app-locale";
import type {
  NoteAiMode,
  NoteAiResultByMode,
  NoteAiSource,
} from "@/lib/ai/schemas/notes";

export type { NoteAiSource };

export type NoteAiResponse<M extends NoteAiMode> = NoteAiResultByMode[M] & {
  source: NoteAiSource;
};

export type NoteAiPayload = {
  locale: AppLocale;
  noteId?: string;
  noteTitle?: string;
  noteContent: string;
  question?: string;
  scope?: "current-note" | "current-project-notes" | "all-notes";
  activeProjectId?: string | null;
  activeProjectName?: string | null;
};

export class NoteAiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "NoteAiError";
    this.code = code;
  }
}

export async function postNoteAi<M extends NoteAiMode>(
  mode: M,
  payload: NoteAiPayload,
): Promise<NoteAiResponse<M>> {
  const res = await fetch("/api/ai/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, ...payload }),
  });
  if (res.status === 401) {
    throw new NoteAiError("unauthorized", "unauthorized");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new NoteAiError(text || "request_failed");
  }
  return (await res.json()) as NoteAiResponse<M>;
}
