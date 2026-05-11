import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";

export async function findConnections(
  itemId: string,
  userId: string,
): Promise<void> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) return;

  const supabase = await createServerSupabaseClient();

  const { data: currentItem } = await supabase
    .from("knowledge_items")
    .select("id, title, ai_summary, ai_tags")
    .eq("id", itemId)
    .single();

  if (!currentItem) return;

  const { data: otherItems } = await supabase
    .from("knowledge_items")
    .select("id, title, ai_summary, ai_tags")
    .eq("user_id", userId)
    .neq("id", itemId)
    .limit(50);

  if (!otherItems?.length) return;

  try {
    const { text } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction: `You are a knowledge graph builder. Given a source item and a list of other items, identify the most related ones.
Return JSON: { "connections": [{ "targetId": "uuid", "score": 0.0-1.0, "reason": "why related" }] }
Only include items with score >= 0.5. Maximum 5 connections.`,
      userText: `Source item:
Title: ${currentItem.title}
Summary: ${currentItem.ai_summary ?? ""}
Tags: ${(currentItem.ai_tags ?? []).join(", ")}

Other items:
${otherItems.map((i) => `- id:${i.id} title:${i.title} summary:${i.ai_summary ?? ""} tags:${(i.ai_tags ?? []).join(",")}`).join("\n")}`,
    });

    const parsed = JSON.parse(text) as {
      connections?: { targetId: string; score: number; reason: string }[];
    };

    for (const conn of parsed.connections ?? []) {
      await supabase.from("knowledge_connections").upsert(
        {
          source_item_id: itemId,
          target_item_id: conn.targetId,
          relevance_score: conn.score,
          reason: conn.reason,
        },
        { onConflict: "source_item_id,target_item_id" },
      );
    }
  } catch {
    // Connection finding is best-effort
  }
}
