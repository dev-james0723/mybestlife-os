import type { SupabaseClient } from "@supabase/supabase-js";
import type { LifeAgentActionType } from "@/lib/life-agent/action-types";
import type { LifeAgentActionPreviewPayloadEnvelope } from "@/lib/life-agent/action-types";
import {
  CreateTaskPayloadSchema,
  CreateNotePayloadSchema,
  CreateProjectPayloadSchema,
  UpdateRelationshipPayloadSchema,
  SaveJournalPayloadSchema,
  CreateMemoryPayloadSchema,
  DraftMessagePayloadSchema,
} from "@/lib/life-agent/action-validator";

export type ActionExecutionResult = {
  ok: true;
  summary: string;
  resourceType: string;
  resourceId?: string;
};

export type ActionExecutionError = {
  ok: false;
  message: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function executeLifeAgentAction(
  supabase: SupabaseClient,
  userId: string,
  actionType: LifeAgentActionType,
  envelope: LifeAgentActionPreviewPayloadEnvelope,
): Promise<ActionExecutionResult | ActionExecutionError> {
  try {
    switch (actionType) {
      case "create_task": {
        const data = CreateTaskPayloadSchema.parse(envelope.data);
        const { data: row, error } = await supabase
          .from("tasks")
          .insert({
            user_id: userId,
            title: data.title,
            description: data.description ?? null,
            project_id: data.project_id ?? null,
            due_date: data.due_date ?? null,
            priority: data.priority ?? "medium",
            status: "todo",
            tags: [],
            source: "life_agent",
            ai_generated: true,
          })
          .select("id, title")
          .single();
        if (error) return { ok: false, message: error.message };
        return {
          ok: true,
          summary: `Created task “${row.title}”.`,
          resourceType: "task",
          resourceId: row.id,
        };
      }
      case "create_note": {
        const data = CreateNotePayloadSchema.parse(envelope.data);
        const { data: row, error } = await supabase
          .from("notes")
          .insert({
            user_id: userId,
            title: data.title,
            content: data.content ?? null,
            project_id: data.project_id ?? null,
            tags: [],
            is_favorite: false,
          })
          .select("id, title")
          .single();
        if (error) return { ok: false, message: error.message };
        return {
          ok: true,
          summary: `Created note “${row.title}”.`,
          resourceType: "note",
          resourceId: row.id,
        };
      }
      case "create_project": {
        const data = CreateProjectPayloadSchema.parse(envelope.data);
        const { data: row, error } = await supabase
          .from("projects")
          .insert({
            user_id: userId,
            name: data.name,
            description: data.description ?? null,
            status: "planning",
            priority: data.priority ?? "medium",
            tags: [],
          })
          .select("id, name")
          .single();
        if (error) return { ok: false, message: error.message };
        return {
          ok: true,
          summary: `Created project “${row.name}”.`,
          resourceType: "project",
          resourceId: row.id,
        };
      }
      case "update_relationship_next_action": {
        const data = UpdateRelationshipPayloadSchema.parse(envelope.data);
        const { data: row, error } = await supabase
          .from("relationships")
          .update({
            next_action: data.next_action,
            next_action_date: data.next_action_date ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.relationship_id)
          .eq("user_id", userId)
          .select("id, person_name")
          .single();
        if (error) return { ok: false, message: error.message };
        return {
          ok: true,
          summary: `Updated next action for ${row.person_name}.`,
          resourceType: "relationship",
          resourceId: row.id,
        };
      }
      case "save_journal_entry": {
        const data = SaveJournalPayloadSchema.parse(envelope.data);
        const entryDate = data.entryDate ?? todayIso();
        const bullets = data.bullets?.length
          ? { items: data.bullets }
          : { items: [envelope.description].filter(Boolean) };
        const { data: row, error } = await supabase
          .from("journal_entries")
          .insert({
            user_id: userId,
            entry_date: entryDate,
            topic: data.topic,
            quadrant: "GREEN",
            primary_emotion: data.primaryEmotion ?? "reflective",
            secondary_emotion: null,
            intensity: 5,
            target: null,
            bullets,
            self_story: null,
            needs: { items: [] },
            next_tiny_step: data.nextTinyStep ?? "",
            appreciation: null,
            topic_extras: null,
            context_factors: null,
            project_ids: [],
            task_ids: [],
            source: "life_agent",
          })
          .select("id, topic")
          .single();
        if (error) return { ok: false, message: error.message };
        return {
          ok: true,
          summary: `Saved journal entry “${row.topic}”.`,
          resourceType: "journal_entry",
          resourceId: row.id,
        };
      }
      case "create_life_agent_memory": {
        const data = CreateMemoryPayloadSchema.parse(envelope.data);
        const { data: row, error } = await supabase
          .from("life_agent_memories")
          .insert({
            user_id: userId,
            memory_type: data.memory_type ?? "preference",
            content: data.content,
            user_confirmed: true,
            visibility: "private",
            source_type: "life_agent",
          })
          .select("id")
          .single();
        if (error) return { ok: false, message: error.message };
        return {
          ok: true,
          summary: "Saved a companion memory for future context.",
          resourceType: "life_agent_memory",
          resourceId: row.id,
        };
      }
      case "draft_message": {
        const data = DraftMessagePayloadSchema.parse(envelope.data);
        const noteTitle = data.subject?.trim()
          ? `Draft: ${data.subject}`
          : `Draft message${data.recipient_hint ? ` — ${data.recipient_hint}` : ""}`;
        const content = [
          data.recipient_hint ? `To: ${data.recipient_hint}` : null,
          data.channel ? `Channel: ${data.channel}` : null,
          "",
          data.body,
        ]
          .filter((line) => line !== null)
          .join("\n");
        const { data: row, error } = await supabase
          .from("notes")
          .insert({
            user_id: userId,
            title: noteTitle.slice(0, 200),
            content,
            tags: ["draft", "life_agent"],
            is_favorite: false,
          })
          .select("id, title")
          .single();
        if (error) return { ok: false, message: error.message };
        return {
          ok: true,
          summary: `Saved message draft as note “${row.title}” (not sent).`,
          resourceType: "note",
          resourceId: row.id,
        };
      }
      default:
        return { ok: false, message: "Unsupported action type" };
    }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Execution failed",
    };
  }
}
