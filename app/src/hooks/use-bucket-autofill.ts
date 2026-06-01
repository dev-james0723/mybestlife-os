"use client";

import { useMutation } from "@tanstack/react-query";

import { useAppStore } from "@/stores/app-store";
import type {
  BucketDreamAutofillResult,
  BucketItemSummary,
} from "@/types/bucket-list";

export type DreamAutofillInput = {
  text?: string;
  /** A `data:` URL (from a file picker) or an http(s) URL. */
  imageUrl?: string;
  currentBucketItems?: BucketItemSummary[];
};

/** Maps a non-OK autofill response to a stable error code the UI can branch on. */
async function postAutofill(
  body: Record<string, unknown>,
): Promise<BucketDreamAutofillResult> {
  const res = await fetch("/api/bucket-list/autofill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `ai_http_${res.status}`;
    try {
      const payload = (await res.json()) as { error?: string; detail?: string };
      if (res.status === 429) throw new Error("quota_exceeded");
      detail = payload.detail || payload.error || detail;
    } catch (e) {
      if (e instanceof Error && e.message === "quota_exceeded") throw e;
    }
    throw new Error(detail);
  }
  const json = (await res.json()) as { result: BucketDreamAutofillResult };
  return json.result;
}

/**
 * Calls `POST /api/bucket-list/autofill` to turn raw text / an inspiration
 * image into an editable dream draft. Does NOT persist anything — the wizard
 * lets the user review and confirm before creating a dream.
 */
export function useDreamAutofill() {
  const language = useAppStore((s) => s.language);
  return useMutation({
    mutationFn: (input: DreamAutofillInput) =>
      postAutofill({
        language,
        text: input.text,
        imageUrl: input.imageUrl,
        currentBucketItems: input.currentBucketItems,
      }),
  });
}
