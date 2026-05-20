"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type KnowledgePickRow = {
  id: string;
  title: string;
  status: string | null;
};

export function useKnowledgeItemsPickList() {
  return useQuery({
    queryKey: ["knowledge_items", "pick-list"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("knowledge_items")
        .select("id, title, status")
        .order("date_added", { ascending: false })
        .limit(400);
      if (error) throw error;
      return (data ?? []) as KnowledgePickRow[];
    },
    staleTime: 60_000,
  });
}
