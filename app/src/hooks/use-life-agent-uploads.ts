"use client";

import { useMutation } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app-store";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import type { LifeAgentActionPreviewCard } from "@/lib/life-agent/action-types";
import type {
  AnalyzeUploadResponse,
  RouteUploadIntentRequest,
  RouteUploadIntentResponse,
} from "@/lib/life-agent/upload-types";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";

export function useAnalyzeLifeAgentUpload() {
  const language = useAppStore((s) => s.language);

  return useMutation({
    mutationFn: async (file: File): Promise<AnalyzeUploadResponse> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("locale", parseAppLocale(language));

      const res = await fetch("/api/life-agent/uploads/analyze", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as AnalyzeUploadResponse & {
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        throw new Error(json.detail ?? json.error ?? "analyze_failed");
      }
      return json;
    },
  });
}

export function useRouteLifeAgentUploadIntent() {
  return useMutation({
    mutationFn: async (
      input: RouteUploadIntentRequest & {
        temporaryPermissions?: Partial<Record<LifeAgentPermissionDomain, boolean>>;
      },
    ): Promise<RouteUploadIntentResponse & { actionPreviews: LifeAgentActionPreviewCard[] }> => {
      const res = await fetch("/api/life-agent/uploads/route-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as RouteUploadIntentResponse & {
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        throw new Error(json.detail ?? json.error ?? "route_intent_failed");
      }
      return json;
    },
  });
}
