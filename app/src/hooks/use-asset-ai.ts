"use client";

/**
 * Client hooks that call the Asset Intelligence Hub AI routes. These are thin
 * fetch wrappers returning typed results; the heavy lifting (validation,
 * caching) happens server-side.
 */

import { useMutation } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app-store";
import type {
  AssetAutofillResponse,
  AssetAutofillAttachment,
  GenerateAssetImageResponse,
  AnalyzeAssetResponse,
  AnalyzePotentialAssetResponse,
  AssetInsightContextPayload,
  AssetVisualStyle,
} from "@/types/asset-intelligence";
import type { AssetCategoryKey } from "@/types/assets";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { error?: string; detail?: string };
      detail = j.detail || j.error || "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `request_failed_${res.status}`);
  }
  return (await res.json()) as T;
}

export function useAssetAutofill() {
  const language = useAppStore((s) => s.language);
  return useMutation({
    mutationFn: (input: { text?: string; attachments?: AssetAutofillAttachment[] }) =>
      postJson<AssetAutofillResponse>("/api/ai/assets/autofill", {
        ...input,
        language,
      }),
  });
}

export function useGenerateAssetImage() {
  const language = useAppStore((s) => s.language);
  return useMutation({
    mutationFn: (input: {
      assetName: string;
      brand?: string | null;
      model?: string | null;
      category_key?: AssetCategoryKey | null;
      visualStyle?: AssetVisualStyle;
      assetId?: string;
    }) =>
      postJson<GenerateAssetImageResponse>("/api/ai/assets/generate-image", {
        ...input,
        language,
      }),
  });
}

export function useAnalyzeAsset() {
  const language = useAppStore((s) => s.language);
  return useMutation({
    mutationFn: (input: {
      assetId: string;
      context: AssetInsightContextPayload;
      forceRefresh?: boolean;
    }) =>
      postJson<AnalyzeAssetResponse>("/api/ai/assets/analyze", {
        ...input,
        language,
      }),
  });
}

export function useAnalyzePotentialAsset() {
  const language = useAppStore((s) => s.language);
  return useMutation({
    mutationFn: (input: {
      itemName: string;
      notes?: string;
      context?: Partial<AssetInsightContextPayload>;
    }) =>
      postJson<AnalyzePotentialAssetResponse>("/api/ai/assets/potential", {
        ...input,
        language,
      }),
  });
}
