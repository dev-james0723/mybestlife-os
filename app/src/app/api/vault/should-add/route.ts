import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { consumeVaultAutofillQuota } from "@/lib/vault/rate-limit";
import { resolveCandidates } from "@/lib/vault/identity-resolver";
import { isValidPublicUrl } from "@/lib/vault/safe-fetch";
import {
  detectShouldAddInputKind,
  shouldAddRequestSchema,
  shouldAddResponseSchema,
  type ShouldAddFieldsToSave,
  type ShouldAddOverlap,
  type ShouldAddProjectRelevance,
  type ShouldAddResponse,
} from "@/lib/vault/intelligence-schemas";
import type { SoftwareVaultEntry, Project, Task, Goal } from "@/types/database";

export const runtime = "nodejs";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function canonicalUrl(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const u = new URL(value.startsWith("http") ? value : `https://${value}`);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return normalizeText(value);
  }
}

function estimateMonthlyCost(entry: SoftwareVaultEntry): number {
  if (entry.cost_amount == null) return 0;
  const amount = Number(entry.cost_amount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const period = (entry.cost_period ?? "").toLowerCase();
  if (/(year|yr|annual)/.test(period)) return amount / 12;
  if (/(week|wk)/.test(period)) return (amount * 52) / 12;
  if (/(day|daily)/.test(period)) return (amount * 365) / 12;
  if (/quarter/.test(period)) return amount / 3;
  return amount;
}

function entryBlob(entry: SoftwareVaultEntry): string {
  return normalizeText(
    [
      entry.app_name,
      entry.website_url,
      entry.category,
      entry.platforms,
      entry.use_cases,
      entry.default_tool_for,
      entry.tags,
      entry.summary,
      entry.replaces,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function overlapForTool(params: {
  entries: SoftwareVaultEntry[];
  query: string;
  appName: string;
  targetUrl?: string | null;
  category?: string | null;
  useCases?: string | null;
}): ShouldAddOverlap[] {
  const qTokens = new Set(tokenize(`${params.query} ${params.category ?? ""} ${params.useCases ?? ""}`));
  const targetName = normalizeText(params.appName);
  const targetUrl = canonicalUrl(params.targetUrl);
  const overlaps: ShouldAddOverlap[] = [];

  for (const entry of params.entries) {
    const name = normalizeText(entry.app_name);
    const url = canonicalUrl(entry.website_url);
    const blob = entryBlob(entry);
    const exactName = targetName && name === targetName;
    const exactUrl = targetUrl && url && (url === targetUrl || url.endsWith(targetUrl) || targetUrl.endsWith(url));
    const categoryMatch =
      params.category &&
      entry.category &&
      normalizeText(params.category) === normalizeText(entry.category);
    const sharedTokens = [...qTokens].filter((t) => blob.includes(t));
    const strongTokenOverlap = sharedTokens.length >= 3;

    if (exactName || exactUrl) {
      overlaps.push({
        entry_id: entry.id,
        app_name: entry.app_name,
        severity: "warning",
        reason: exactName
          ? "Existing vault entry has the same product name."
          : "Existing vault entry appears to use the same website.",
      });
      continue;
    }

    if (categoryMatch || strongTokenOverlap) {
      overlaps.push({
        entry_id: entry.id,
        app_name: entry.app_name,
        severity: categoryMatch ? "notice" : "info",
        reason: categoryMatch
          ? `Same category: ${entry.category}.`
          : `Shares workflow terms: ${sharedTokens.slice(0, 4).join(", ")}.`,
      });
    }
  }

  return overlaps.slice(0, 8);
}

function relevanceFromLifeContext(params: {
  query: string;
  projects: Project[];
  tasks: Task[];
  goals: Goal[];
}): ShouldAddProjectRelevance[] {
  const q = normalizeText(params.query);
  const qTokens = new Set(tokenize(params.query));
  const out: ShouldAddProjectRelevance[] = [];

  const score = (text: string): number => {
    const blob = normalizeText(text);
    let n = 0;
    for (const token of qTokens) if (blob.includes(token)) n += 1;
    if (blob && q.includes(blob)) n += 2;
    return n;
  };

  for (const project of params.projects.filter((p) => p.status === "active" || p.status === "planning")) {
    const s = score([project.name, project.description, ...(project.tags ?? [])].filter(Boolean).join(" "));
    if (s > 0) {
      out.push({
        target_type: "project",
        target_id: project.id,
        label: project.name,
        reason: "The query shares terms with this active/planning project.",
        confidence: s >= 3 ? "high" : "medium",
      });
    }
  }

  for (const task of params.tasks.filter((t) => t.status === "todo" || t.status === "in-progress").slice(0, 80)) {
    const s = score([task.title, task.description, task.category, ...(task.tags ?? [])].filter(Boolean).join(" "));
    if (s > 1) {
      out.push({
        target_type: "task",
        target_id: task.id,
        label: task.title,
        reason: "The query appears related to an open task.",
        confidence: s >= 3 ? "high" : "medium",
      });
    }
  }

  for (const goal of params.goals.filter((g) => g.status === "active")) {
    const s = score([goal.name, goal.description, goal.category].filter(Boolean).join(" "));
    if (s > 0) {
      out.push({
        target_type: "goal",
        target_id: goal.id,
        label: goal.name,
        reason: "The query shares terms with an active goal.",
        confidence: s >= 3 ? "high" : "medium",
      });
    }
  }

  return out.slice(0, 8);
}

function buildFieldsToSave(params: {
  query: string;
  appName: string;
  officialUrl?: string | null;
  iconUrl?: string | null;
  description?: string | null;
  inputKind: string;
}): ShouldAddFieldsToSave {
  const workflowNeed = params.inputKind === "workflow_need" || params.inputKind === "question";
  const name = params.appName.trim() || params.query.trim().slice(0, 80);
  return {
    app_name: name,
    website_url: params.officialUrl ?? undefined,
    icon_url: params.iconUrl ?? undefined,
    summary:
      params.description?.slice(0, 280) ??
      (workflowNeed ? `Potential tool for: ${params.query.trim().slice(0, 220)}` : undefined),
    category: workflowNeed ? "Workflow tool" : undefined,
    platforms: params.officialUrl ? "Web" : undefined,
    use_cases: workflowNeed ? params.query.trim().slice(0, 600) : params.description?.slice(0, 600),
    status: "Testing",
    priority: "Nice-to-have",
    cost_type: "Freemium",
    cost_period: "unknown",
    why_i_use_it: workflowNeed ? `Evaluate whether this solves: ${params.query.trim().slice(0, 680)}` : undefined,
    biggest_downside: "Verify pricing, fit, and overlap before committing.",
    tags: workflowNeed ? ["workflow-need", "review-before-buying"] : ["review-before-buying"],
    default_tool_for: workflowNeed ? params.query.trim().slice(0, 200) : undefined,
  };
}

async function selectVaultContext(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const [vault, projects, tasks, goals] = await Promise.all([
    supabase.from("software_vault").select("*").order("app_name", { ascending: true }),
    supabase.from("projects").select("id,user_id,name,description,status,priority,tags,created_at,updated_at").limit(80),
    supabase.from("tasks").select("id,user_id,project_id,title,description,status,priority,due_date,completed_at,estimated_blocks,tags,source,source_url,reminder_date,category,ai_generated,ai_metadata,sort_order,scheduled_date,calendar_event_id,calendar_provider,created_at,updated_at").limit(160),
    supabase.from("goals").select("*").limit(80),
  ]);

  if (vault.error) throw vault.error;
  return {
    entries: (vault.data ?? []) as SoftwareVaultEntry[],
    projects: projects.error ? [] : ((projects.data ?? []) as Project[]),
    tasks: tasks.error ? [] : ((tasks.data ?? []) as Task[]),
    goals: goals.error ? [] : ((goals.data ?? []) as Goal[]),
  };
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = shouldAddRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const quota = await consumeVaultAutofillQuota({ supabase, userId: user.id, cost: 1 });
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "rate_limited", reset: quota.reset.toISOString() },
      { status: 429 },
    );
  }

  const req = parsed.data;
  const inputKind = req.inputKind ?? detectShouldAddInputKind(req.targetUrl ?? req.query);
  const context = await selectVaultContext(supabase);
  const candidates = await resolveCandidates(req.targetUrl ?? req.query).catch(() => null);
  const selected = req.candidate ?? candidates?.autoSelect ?? candidates?.candidates[0] ?? null;
  const appName =
    selected?.name?.trim() ||
    (inputKind === "workflow_need" || inputKind === "question" ? req.query.trim().slice(0, 80) : req.query.trim());
  const officialUrl =
    req.targetUrl ??
    selected?.official_url ??
    selected?.github_url ??
    (isValidPublicUrl(req.query) ? req.query : null);

  const fields = buildFieldsToSave({
    query: req.query,
    appName,
    officialUrl,
    iconUrl: selected?.icon_url,
    description: selected?.description,
    inputKind,
  });

  const overlaps = overlapForTool({
    entries: context.entries,
    query: req.query,
    appName,
    targetUrl: officialUrl,
    category: fields.category,
    useCases: fields.use_cases,
  });
  const projectRelevance = relevanceFromLifeContext({
    query: req.query,
    projects: context.projects,
    tasks: context.tasks,
    goals: context.goals,
  });
  const activePaidOverlap = overlaps
    .map((o) => context.entries.find((e) => e.id === o.entry_id))
    .filter((e): e is SoftwareVaultEntry => Boolean(e && e.status === "Active" && estimateMonthlyCost(e) > 0));
  const exactOverlap = overlaps.some((o) => o.severity === "warning");
  const paidOverlap = activePaidOverlap.length > 0;

  const recommendation: ShouldAddResponse["recommendation"] = exactOverlap
    ? "skip"
    : paidOverlap
      ? "trial_first"
      : inputKind === "workflow_need" || inputKind === "question"
        ? "trial_first"
        : projectRelevance.length > 0
          ? "add"
          : "wait";

  const reason =
    recommendation === "skip"
      ? "A likely matching tool already exists in your vault. Review the existing entry before adding another copy."
      : recommendation === "add"
        ? "The tool appears relevant to current Life OS context and no strong duplicate was detected."
        : recommendation === "trial_first"
          ? "There is some fit, but overlap or uncertainty means a short trial is safer than committing immediately."
          : "The vault context does not show a strong current need yet, so waiting is safer than adding another tool.";

  const response: ShouldAddResponse = {
    recommendation,
    reason,
    overlap_with_existing_tools: overlaps,
    tools_it_might_replace: paidOverlap ? overlaps.filter((o) => activePaidOverlap.some((e) => e.id === o.entry_id)) : [],
    project_relevance: projectRelevance,
    cost_warning: paidOverlap
      ? `Potential paid overlap with ${activePaidOverlap.map((e) => e.app_name).join(", ")}. Verify pricing before subscribing.`
      : "Pricing is not verified in this review. Check the official pricing page before committing.",
    learning_curve:
      inputKind === "workflow_need" || inputKind === "question"
        ? "Unknown until the actual product is selected; start with a small workflow trial."
        : "Unknown from vault context; validate with one real task before adopting broadly.",
    suggested_trial_period: recommendation === "add" ? "7 days" : "14 days",
    fields_to_save_if_user_confirms: fields,
    sources: [
      {
        title: "Existing Software Vault",
        sourceType: "vault",
        usedFor: ["overlap", "replacement review", "cost warning"],
      },
      ...(projectRelevance.length
        ? [
            {
              title: "Life OS project/task/goal context",
              sourceType: "project" as const,
              usedFor: ["project relevance"],
            },
          ]
        : []),
      ...(officialUrl
        ? [
            {
              title: `${appName} target`,
              url: officialUrl,
              sourceType: selected?.github_url ? ("github" as const) : ("official_site" as const),
              usedFor: ["candidate identity"],
            },
          ]
        : []),
    ],
    unknowns: [
      "Current subscription price unless verified in Smart Add/Product Research.",
      "Actual usage ROI until the user tries it in a real workflow.",
    ],
    warnings: [
      "This review does not change billing, subscriptions, or existing vault entries.",
      "All suggested fields require review before saving.",
    ],
    generatedAt: new Date().toISOString(),
  };

  const safe = shouldAddResponseSchema.parse(response);
  return NextResponse.json(safe);
}

