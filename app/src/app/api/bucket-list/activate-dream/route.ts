/**
 * POST /api/bucket-list/activate-dream
 *
 * Produces a structured activation PLAN (project, tasks, savings goal, calendar
 * placeholders, notes, knowledge resources) tuned to the chosen activation mode.
 *
 * This route NEVER writes Life-OS records. It only proposes a plan the user
 * reviews and confirms in the wizard; the confirmed writes happen client-side
 * through the existing repositories.
 *
 * Request body: { bucketItemId, activationMode, locale? }
 * Response (200): { plan: BucketDreamActivationPlan }
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assertBucketAiQuota,
  bucketAiError,
  getBucketAiKeyOrFail,
  recordBucketAiUsage,
  requireBucketAiContext,
} from "@/lib/ai/bucket-list/bucket-ai";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  BUCKET_ACTIVATION_MODES,
  type BucketActivationMode,
  type BucketDreamActivationPlan,
  type BucketItem,
} from "@/types/bucket-list";

export const runtime = "nodejs";
export const maxDuration = 60;

const PlanSchema = z.object({
  activationSummary: z.string().min(4).max(600),
  suggestedProject: z
    .object({
      name: z.string().min(2).max(160),
      description: z.string().max(800),
      status: z.string().max(40).optional().nullable(),
    })
    .optional()
    .nullable(),
  suggestedTasks: z
    .array(
      z.object({
        title: z.string().min(2).max(200),
        description: z.string().max(600).optional().nullable(),
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/u)
          .optional()
          .nullable(),
        priority: z.enum(["low", "medium", "high"]).optional().nullable(),
      }),
    )
    .max(12)
    .optional(),
  suggestedSavingsGoal: z
    .object({
      name: z.string().min(2).max(160),
      targetAmount: z.number().nonnegative(),
      currency: z.string().regex(/^[A-Z]{3}$/u),
      targetDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/u)
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
  suggestedCalendarPlaceholders: z
    .array(
      z.object({
        title: z.string().min(2).max(160),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}(-\d{2})?$/u)
          .optional()
          .nullable(),
        notes: z.string().max(400).optional().nullable(),
      }),
    )
    .max(8)
    .optional(),
  suggestedNotes: z
    .array(
      z.object({
        title: z.string().min(2).max(160),
        content: z.string().min(2).max(2000),
      }),
    )
    .max(6)
    .optional(),
  suggestedKnowledgeResources: z
    .array(
      z.object({
        title: z.string().min(2).max(200),
        url: z.string().max(500).optional().nullable(),
        notes: z.string().max(400).optional().nullable(),
      }),
    )
    .max(8)
    .optional(),
  warnings: z.array(z.string().min(1).max(240)).max(8).optional(),
});

const objArr = (props: Record<string, unknown>, required: string[]) => ({
  type: "array",
  items: { type: "object", required, properties: props },
});

const ACTIVATE_GEMINI_SCHEMA = {
  type: "object",
  required: ["activationSummary"],
  properties: {
    activationSummary: { type: "string" },
    suggestedProject: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        status: { type: "string" },
      },
    },
    suggestedTasks: objArr(
      {
        title: { type: "string" },
        description: { type: "string" },
        dueDate: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
      },
      ["title"],
    ),
    suggestedSavingsGoal: {
      type: "object",
      properties: {
        name: { type: "string" },
        targetAmount: { type: "number" },
        currency: { type: "string" },
        targetDate: { type: "string" },
      },
    },
    suggestedCalendarPlaceholders: objArr(
      {
        title: { type: "string" },
        date: { type: "string" },
        notes: { type: "string" },
      },
      ["title"],
    ),
    suggestedNotes: objArr(
      { title: { type: "string" }, content: { type: "string" } },
      ["title", "content"],
    ),
    suggestedKnowledgeResources: objArr(
      {
        title: { type: "string" },
        url: { type: "string" },
        notes: { type: "string" },
      },
      ["title"],
    ),
    warnings: { type: "array", items: { type: "string" } },
  },
};

const MODE_GUIDANCE: Record<BucketActivationMode, string> = {
  gentle:
    "GENTLE mode: low pressure. Suggest 1–3 small, kind first steps. No big project unless trivial. Savings goal only if a cost is known and modest. Keep it warm and unintimidating.",
  practical:
    "PRACTICAL mode: concrete planning. Suggest one focused project, 3–6 actionable tasks with sensible order, a savings goal if a cost is known, a calendar placeholder for the target, and 1–2 useful notes/resources.",
  ambitious:
    "AMBITIOUS mode: a fuller plan. Suggest a project with a short milestone timeline (tasks spread over time with dueDates), a savings goal, calendar placeholders for milestones, and helpful knowledge resources. Stay realistic — no fabricated facts.",
  minimal:
    "MINIMAL mode: exactly ONE tiny next action. Return a single task and nothing else (no project, savings, calendar, notes, or resources). Keep it ~20 minutes.",
};

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function buildUserText(item: BucketItem, mode: BucketActivationMode, language: string): string {
  const lines: string[] = [];
  lines.push(`Respond in language code: ${language}.`);
  lines.push(MODE_GUIDANCE[mode]);
  lines.push("");
  lines.push("DREAM:");
  lines.push(`- Title: ${item.title}`);
  lines.push(`- Type: ${item.type}; Status: ${item.status}; Priority: ${item.priority}`);
  if (item.description) lines.push(`- Description: ${item.description}`);
  if (item.why_this_matters) lines.push(`- Why it matters: ${item.why_this_matters}`);
  lines.push(
    `- Target: ${item.target_month || item.target_date || "none"}; Estimated cost: ${
      item.estimated_cost != null ? `${item.estimated_cost} ${item.cost_currency}` : "unknown"
    }`,
  );
  if (item.category_tags.length) lines.push(`- Tags: ${item.category_tags.join(", ")}`);
  if (item.type === "travel") {
    lines.push(
      `- Travel: ${item.destination_name ?? "?"} (${item.destination_country ?? "?"}); season ${
        item.best_season ?? "?"
      }; ${item.trip_length_days ?? "?"} days`,
    );
  }
  lines.push("");
  lines.push("Already connected:");
  lines.push(`- Project: ${item.linked_project_id ? "yes" : "no"}`);
  lines.push(`- Tasks: ${item.linked_task_ids.length}`);
  lines.push(`- Savings/budget: ${item.linked_savings_goal_id || item.linked_budget_id ? "yes" : "no"}`);
  lines.push("");
  lines.push(
    "Propose an activation plan. Currency for any savings goal should match the dream's currency. Use round, clearly-approximate amounts. Never invent verified prices or dates.",
  );
  return lines.join("\n");
}

export async function POST(request: Request) {
  const auth = await requireBucketAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const bucketItemId =
    typeof bodyJson.bucketItemId === "string" ? bodyJson.bucketItemId.trim() : "";
  const activationMode: BucketActivationMode = (
    BUCKET_ACTIVATION_MODES as readonly string[]
  ).includes(bodyJson.activationMode as string)
    ? (bodyJson.activationMode as BucketActivationMode)
    : "practical";

  if (!bucketItemId) {
    return NextResponse.json({ error: "missing_bucket_item_id" }, { status: 400 });
  }

  const { data: row } = await ctx.supabase
    .from("bucket_items")
    .select("*")
    .eq("id", bucketItemId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const item = {
    ...(row as BucketItem),
    category_tags: asArray((row as Record<string, unknown>).category_tags),
    linked_task_ids: asArray((row as Record<string, unknown>).linked_task_ids),
  } as BucketItem;

  const quota = await assertBucketAiQuota(ctx, "reframe");
  if (!quota.ok) return quota.response;

  const apiKeyRes = getBucketAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  const systemInstruction = [
    "You are an execution coach turning a personal life dream into a concrete, confirmable activation plan for a 'Life OS' app.",
    "The app can create: a project, tasks, a savings goal, calendar placeholders, notes, and knowledge resources.",
    "Only suggest what genuinely helps for the chosen mode. It is fine to omit sections.",
    "Never fabricate prices, dates, or external facts. Estimated amounts must be round and approximate.",
    "Everything you return is a SUGGESTION the user will review and confirm — write it as proposals.",
  ].join("\n");

  try {
    const { data } = await fetchGeminiStructured<unknown>({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction,
      userText: buildUserText(item, activationMode, ctx.language),
      responseSchema: ACTIVATE_GEMINI_SCHEMA,
      temperature: 0.5,
      maxOutputTokens: 2600,
      timeoutMs: 45_000,
    });

    const parsed = PlanSchema.parse(data);
    await recordBucketAiUsage(ctx, "reframe");

    // Minimal mode is a contract: exactly one task, nothing else.
    const isMinimal = activationMode === "minimal";

    const plan: BucketDreamActivationPlan = {
      activationSummary: parsed.activationSummary,
      suggestedProject: isMinimal ? null : (parsed.suggestedProject ?? null),
      suggestedTasks: (parsed.suggestedTasks ?? [])
        .slice(0, isMinimal ? 1 : 12)
        .map((t) => ({
          title: t.title,
          description: t.description ?? null,
          dueDate: t.dueDate ?? null,
          priority: t.priority ?? null,
        })),
      suggestedSavingsGoal: isMinimal ? null : (parsed.suggestedSavingsGoal ?? null),
      suggestedCalendarPlaceholders: isMinimal
        ? []
        : (parsed.suggestedCalendarPlaceholders ?? []).map((c) => ({
            title: c.title,
            date: c.date ?? null,
            notes: c.notes ?? null,
          })),
      suggestedNotes: isMinimal
        ? []
        : (parsed.suggestedNotes ?? []).map((n) => ({
            title: n.title,
            content: n.content,
          })),
      suggestedKnowledgeResources: isMinimal
        ? []
        : (parsed.suggestedKnowledgeResources ?? []).map((k) => ({
            title: k.title,
            url: k.url ?? null,
            notes: k.notes ?? null,
          })),
      warnings: parsed.warnings ?? [],
    };

    return NextResponse.json({ plan });
  } catch (err) {
    return bucketAiError(err);
  }
}
