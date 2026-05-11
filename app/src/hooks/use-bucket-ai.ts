"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { bucketQueryKeys } from "@/hooks/use-bucket-list";
import { useAppStore } from "@/stores/app-store";
import type {
  BucketDestinationBrief,
  BucketItem,
  BucketReframeResponse,
  BucketTripPlan,
} from "@/types/bucket-list";

type AiErrorPayload = {
  error?: string;
  detail?: string;
};

async function callBucketAi<T>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let payload: AiErrorPayload = {};
    try {
      payload = (await res.json()) as AiErrorPayload;
    } catch {
      // ignore
    }
    if (res.status === 429) {
      throw new Error("quota_exceeded");
    }
    throw new Error(payload.detail || payload.error || `ai_http_${res.status}`);
  }
  return (await res.json()) as T;
}

// ─── Destination Brief ────────────────────────────────────────────────────────

export function useGenerateDestinationBrief() {
  const qc = useQueryClient();
  const language = useAppStore((s) => s.language);
  return useMutation({
    mutationFn: async (input: {
      bucket: BucketItem;
    }): Promise<{ brief: BucketDestinationBrief }> => {
      return callBucketAi<{ brief: BucketDestinationBrief }>(
        "/api/bucket-list/destination-brief",
        {
          language,
          bucket_item_id: input.bucket.id,
          destination_name: input.bucket.destination_name,
          destination_country: input.bucket.destination_country,
          destination_city: input.bucket.destination_city,
          best_season: input.bucket.best_season,
          travel_style: input.bucket.travel_style,
        },
      );
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: bucketQueryKeys.item(variables.bucket.id),
      });
      qc.invalidateQueries({ queryKey: bucketQueryKeys.items() });
      toast.success("Destination brief ready");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "quota_exceeded") {
        toast.error("Daily AI cap reached. Try again tomorrow.");
      } else {
        toast.error("Could not generate brief — please retry.");
      }
    },
  });
}

// ─── Trip plan ────────────────────────────────────────────────────────────────

export function useGenerateTripPlan() {
  const qc = useQueryClient();
  const language = useAppStore((s) => s.language);
  return useMutation({
    mutationFn: async (input: {
      bucket: BucketItem;
      priorities?: string;
      tripLength?: number;
    }): Promise<{ plan: BucketTripPlan }> => {
      return callBucketAi<{ plan: BucketTripPlan }>(
        "/api/bucket-list/trip-plan",
        {
          language,
          bucket_item_id: input.bucket.id,
          destination_name: input.bucket.destination_name,
          destination_country: input.bucket.destination_country,
          destination_city: input.bucket.destination_city,
          travel_style: input.bucket.travel_style,
          travel_budget_level: input.bucket.travel_budget_level,
          trip_length_days:
            input.tripLength ?? input.bucket.trip_length_days ?? 5,
          priorities: input.priorities,
        },
      );
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: bucketQueryKeys.item(variables.bucket.id),
      });
      qc.invalidateQueries({ queryKey: bucketQueryKeys.items() });
      toast.success("Trip plan drafted");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "quota_exceeded") {
        toast.error("Daily AI cap reached. Try again tomorrow.");
      } else {
        toast.error("Could not draft a trip plan — please retry.");
      }
    },
  });
}

// ─── Reframe ──────────────────────────────────────────────────────────────────

export function useReframeDream() {
  const qc = useQueryClient();
  const language = useAppStore((s) => s.language);
  return useMutation({
    mutationFn: async (input: {
      bucket: BucketItem;
    }): Promise<{ response: BucketReframeResponse }> => {
      return callBucketAi<{ response: BucketReframeResponse }>(
        "/api/bucket-list/reframe",
        {
          language,
          bucket_item_id: input.bucket.id,
          title: input.bucket.title,
          description: input.bucket.description,
          why_this_matters: input.bucket.why_this_matters,
          type: input.bucket.type,
          estimated_cost: input.bucket.estimated_cost,
        },
      );
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: bucketQueryKeys.item(variables.bucket.id),
      });
      toast.success("Smaller versions generated");
    },
    onError: () => {
      toast.error("Could not reframe dream.");
    },
  });
}

// ─── Reflection summary ──────────────────────────────────────────────────────

export function useReflectionSummary() {
  const language = useAppStore((s) => s.language);
  return useMutation({
    mutationFn: async (input: {
      dreamTitle: string;
      reflection: string;
      mood?: string | null;
    }): Promise<{ summary: string; title_suggestion: string | null }> => {
      return callBucketAi<{
        summary: string;
        title_suggestion: string | null;
      }>("/api/bucket-list/reflection-summary", {
        language,
        dream_title: input.dreamTitle,
        reflection_text: input.reflection,
        mood: input.mood ?? null,
      });
    },
  });
}
