"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import {
  selectDailyKnowledgePick,
  type DailyKnowledgeCandidate,
} from "@/lib/dashboard/daily-knowledge-pick";
import { rewriteStoredKnowledgeThumbnailUrl } from "@/lib/knowledge/storage-thumbnail-url";
import { normalizeContentType, type ContentType } from "@/types/knowledge";

export type TodaysKnowledgePick = DailyKnowledgeCandidate & {
  contentType: ContentType;
  sourceUrl?: string;
  sourceDomain?: string;
  thumbnailUrl?: string;
  summary?: string;
  dateAdded: string;
};

type KnowledgePickRow = {
  id: string;
  title: string;
  status: string | null;
  content_type: string | null;
  source_url: string | null;
  source_domain: string | null;
  thumbnail_url: string | null;
  ai_tldr: string | null;
  ai_summary: string | null;
  ai_key_insights: unknown;
  date_added: string;
};

type KnowledgePickCandidateRow = Pick<KnowledgePickRow, "id" | "title" | "status">;

function firstNonEmpty(values: Array<string | null | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

function mapKnowledgePickRow(row: KnowledgePickRow): TodaysKnowledgePick {
  const firstInsight = Array.isArray(row.ai_key_insights)
    ? row.ai_key_insights.find(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : undefined;

  return {
    id: row.id,
    title: row.title.trim(),
    status: row.status,
    contentType: normalizeContentType(row.content_type),
    sourceUrl: row.source_url?.trim() || undefined,
    sourceDomain: row.source_domain?.trim() || undefined,
    thumbnailUrl: rewriteStoredKnowledgeThumbnailUrl(row.thumbnail_url),
    summary: firstNonEmpty([row.ai_tldr, firstInsight, row.ai_summary]),
    dateAdded: row.date_added,
  };
}

export function useTodaysKnowledgePick({
  userId,
  dayKey,
}: {
  userId?: string;
  dayKey: string;
}) {
  return useQuery({
    queryKey: ["dashboard", "knowledge-pick", userId, dayKey],
    enabled: Boolean(userId),
    queryFn: async (): Promise<TodaysKnowledgePick | null> => {
      if (!userId) return null;

      const supabase = createClient();
      const { data: candidateRows, error: candidateError } = await supabase
        .from("knowledge_items")
        .select("id, title, status")
        .eq("user_id", userId)
        .eq("status", "ready")
        .order("id", { ascending: true })
        .limit(1_000);

      if (candidateError) throw candidateError;

      const selected = selectDailyKnowledgePick(
        (candidateRows ?? []) as KnowledgePickCandidateRow[],
        { userId, dayKey },
      );
      if (!selected) return null;

      const { data: detailRow, error: detailError } = await supabase
        .from("knowledge_items")
        .select(
          "id, title, status, content_type, source_url, source_domain, thumbnail_url, ai_tldr, ai_summary, ai_key_insights, date_added",
        )
        .eq("id", selected.id)
        .eq("user_id", userId)
        .eq("status", "ready")
        .maybeSingle();

      if (detailError) throw detailError;
      if (!detailRow) return null;

      return mapKnowledgePickRow(detailRow as KnowledgePickRow);
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
