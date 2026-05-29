/**
 * Signals → Brain write-path (MVP, §13).
 *
 * Brain has no standalone "create node" API — it is a read-only projection over
 * domain tables. The cleanest real write-path is therefore `notesRepository`: a
 * saved note is normalized into a Brain `memory` node, then participates in the
 * existing relationship engine. So this is a REAL save, not a fake placeholder.
 *
 * Embedding is opt-in in this codebase (POST /api/brain/embeddings), so we fire
 * it best-effort after the note persists; an embedding failure does not undo a
 * successful save (the node still exists, just without a vector yet).
 *
 * TODO(v2): when a dedicated Brain ingest endpoint exists, route through it so
 * source URL / content-type become first-class node metadata instead of being
 * embedded in the note body.
 */

import { notesRepository, type CreateNoteInput } from "@/lib/repositories/notes";
import type { SignalItem } from "./types";

export type SaveSignalToBrainResult =
  | { status: "saved"; noteId: string; embedded: boolean }
  | { status: "error"; message: string };

/** Pure builder (unit-testable): turns a signal into a Note insert payload. */
export function buildSignalNoteInput(signal: SignalItem): CreateNoteInput {
  const lines = [
    signal.summary,
    "",
    `Source: ${signal.source.name} — ${signal.sourceUrl}`,
    `Topic: ${signal.topic}`,
    signal.whyItMatters ? `Why it matters: ${signal.whyItMatters}` : null,
    "",
    "Saved from Signals.",
  ].filter((l): l is string => l !== null);

  const tags = Array.from(new Set([...signal.tags, signal.topic, "signal"]));

  return {
    title: signal.headline,
    content: lines.join("\n"),
    category: "Signal",
    tags,
  };
}

/**
 * Persist a signal as a Brain node (via Notes). Returns a truthful result — the
 * caller must NOT claim success unless `status === "saved"`.
 */
export async function saveSignalToBrain(
  signal: SignalItem,
): Promise<SaveSignalToBrainResult> {
  if (signal.isDemo) {
    return {
      status: "error",
      message: "This is a demo signal — connect a live source before saving.",
    };
  }

  try {
    const note = await notesRepository.create(buildSignalNoteInput(signal));
    let embedded = false;
    try {
      const res = await fetch("/api/brain/embeddings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              node_id: `memory::${note.id}`,
              node_type: "memory",
              source_id: note.id,
              source_type: "notes",
              title: signal.headline,
              content: `${signal.headline}\n${signal.summary}`,
            },
          ],
        }),
      });
      embedded = res.ok;
    } catch {
      embedded = false; // best-effort; the note still persisted.
    }
    return { status: "saved", noteId: note.id, embedded };
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error ? err.message : "Could not save to Brain. Please try again.",
    };
  }
}
