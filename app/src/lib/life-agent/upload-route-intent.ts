import type { SupabaseClient } from "@supabase/supabase-js";
import { createPreviewsFromModelSuggestions } from "@/lib/life-agent/action-preview-service";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";
import type {
  LifeAgentUploadAnalysis,
  LifeAgentUploadIntent,
  RouteUploadIntentResponse,
} from "@/lib/life-agent/upload-types";

type ModelSuggestion = {
  type: string;
  title: string;
  description: string;
  payload?: Record<string, unknown>;
};

export function buildUploadSuggestionsForIntent(
  analysis: LifeAgentUploadAnalysis,
  intent: LifeAgentUploadIntent,
): ModelSuggestion[] {
  const base: ModelSuggestion[] = [];
  const summary = analysis.summary.slice(0, 4000);

  switch (intent) {
    case "extract_tasks": {
      const tasks = analysis.extractedTasks ?? [];
      if (tasks.length === 0 && analysis.suggestedActions.length) {
        return analysis.suggestedActions
          .filter((a) => a.type === "create_task")
          .map((a) => ({
            type: "create_task",
            title: a.title,
            description: a.description,
            payload: a.payload,
          }));
      }
      for (const t of tasks) {
        base.push({
          type: "create_task",
          title: t.title,
          description: t.description ?? "From upload",
          payload: {
            title: t.title,
            description: t.description,
            due_date: t.due_date,
            priority: t.priority,
          },
        });
      }
      if (!base.length) {
        base.push({
          type: "create_task",
          title: "Review upload for tasks",
          description: "Open the upload summary and add tasks manually if needed.",
          payload: { title: "Review upload", description: summary },
        });
      }
      break;
    }
    case "save_as_note": {
      const note = analysis.extractedNote;
      base.push({
        type: "create_note",
        title: note?.title ?? "Note from upload",
        description: "Save extracted content as a note (preview).",
        payload: {
          title: note?.title ?? "Note from upload",
          content: note?.content ?? summary,
        },
      });
      break;
    }
    case "update_relationship": {
      const rel = analysis.extractedRelationshipUpdate;
      if (rel?.next_action) {
        base.push({
          type: "create_note",
          title: rel.name_hint
            ? `Relationship follow-up: ${rel.name_hint}`
            : "Relationship follow-up from upload",
          description:
            "We could not link to an existing contact without your ID — saved as a note preview. Edit or create the relationship manually.",
          payload: {
            title: rel.name_hint
              ? `Follow up with ${rel.name_hint}`
              : "Relationship follow-up",
            content: [
              rel.next_action,
              rel.next_action_date ? `By: ${rel.next_action_date}` : null,
              rel.notes,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        });
      } else {
        base.push({
          type: "create_note",
          title: "Relationship notes from upload",
          description: "Capture relationship context from upload.",
          payload: { title: "Relationship notes", content: summary },
        });
      }
      break;
    }
    case "create_asset": {
      const asset = analysis.extractedAsset;
      base.push({
        type: "create_note",
        title: asset?.name ?? "Asset from upload",
        description: "Asset records are saved as a structured note preview until asset API is linked.",
        payload: {
          title: asset?.name ?? "Asset from upload",
          content: [
            asset?.category_hint ? `Category: ${asset.category_hint}` : null,
            asset?.value_hint ? `Value: ${asset.value_hint}` : null,
            asset?.notes,
            summary,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      });
      break;
    }
    case "summarize": {
      base.push({
        type: "create_note",
        title: "Upload summary",
        description: "Summary only — nothing saved until you confirm.",
        payload: { title: "Upload summary", content: summary },
      });
      break;
    }
    case "draft_message": {
      base.push({
        type: "draft_message",
        title: "Draft from upload",
        description: "Draft message saved as note — not sent.",
        payload: {
          body: summary,
          channel: "other",
        },
      });
      break;
    }
    case "create_project": {
      const title =
        analysis.extractedNote?.title ??
        analysis.extractedDocument?.title ??
        "Project from upload";
      base.push({
        type: "create_project",
        title,
        description: "Project created from upload content (preview).",
        payload: {
          name: title.slice(0, 200),
          description: summary,
        },
      });
      break;
    }
    case "create_document_record": {
      const doc = analysis.extractedDocument;
      base.push({
        type: "create_note",
        title: doc?.title ?? "Document record from upload",
        description: "Document metadata captured as note preview.",
        payload: {
          title: doc?.title ?? "Document record",
          content: [doc?.document_type_hint, doc?.summary, doc?.expiry_hint, summary]
            .filter(Boolean)
            .join("\n\n"),
        },
      });
      break;
    }
    case "analyze_image_memory": {
      base.push({
        type: "create_life_agent_memory",
        title: "Memory from upload",
        description: "Only saved after you confirm — not automatic.",
        payload: {
          content: summary.slice(0, 2000),
          memory_type: "other",
        },
      });
      break;
    }
    default:
      break;
  }

  if (!base.length && analysis.suggestedActions.length) {
    return analysis.suggestedActions.map((a) => ({
      type: a.type,
      title: a.title,
      description: a.description,
      payload: a.payload,
    }));
  }

  return base;
}

export async function routeUploadIntent(
  supabase: SupabaseClient,
  userId: string,
  uploadId: string,
  analysis: LifeAgentUploadAnalysis,
  intent: LifeAgentUploadIntent,
  conversationId: string | null,
  sessionGrants: LifeAgentPermissionDomain[] = [],
): Promise<RouteUploadIntentResponse> {
  const suggestions = buildUploadSuggestionsForIntent(analysis, intent);
  const { previews, invalidCount } = await createPreviewsFromModelSuggestions(
    supabase,
    userId,
    suggestions,
    conversationId,
    sessionGrants,
  );

  const warnings = [...analysis.warnings];
  if (invalidCount > 0) {
    warnings.push(`${invalidCount} action(s) could not be previewed — check permissions.`);
  }

  return {
    uploadId,
    intent,
    actionPreviews: previews,
    invalidCount,
    memoryUsed: [
      {
        sourceType: "upload",
        sourceId: uploadId,
        title: analysis.summary.slice(0, 80) || "Upload analysis",
        reason: `Routed upload as ${intent}`,
      },
    ],
    warnings,
  };
}
