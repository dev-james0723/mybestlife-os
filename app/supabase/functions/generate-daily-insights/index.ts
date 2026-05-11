// Supabase Edge Function — `generate-daily-insights`
//
// Generates up to 3 short, actionable suggestions for the authenticated user
// based on their profile, recent opportunities and recent file uploads. The
// function is idempotent per (user, date): if a `daily_insights` row already
// exists for today, it is returned without contacting Claude unless
// `force: true` is passed.
//
// Request body (all optional):
//   { "force": boolean }
//
// Response body:
//   { "insights": DailyInsights, "cached": boolean }
//
// Required env:
//   ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — Supabase Edge runtime; not the Next.js TS project.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_PRIORITIES = new Set(["high", "medium", "low"]);
const ALLOWED_CATEGORIES = new Set([
  "application",
  "skill",
  "network",
  "reflection",
]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function coerceSuggestions(raw: any): Array<any> {
  if (!raw || typeof raw !== "object") return [];
  const arr = Array.isArray(raw.suggestions) ? raw.suggestions : [];
  const out: Array<any> = [];
  for (const s of arr.slice(0, 3)) {
    if (!s || typeof s !== "object") continue;
    const title =
      typeof s.title === "string" ? s.title.trim().slice(0, 120) : "";
    const rationale =
      typeof s.rationale === "string" ? s.rationale.trim().slice(0, 240) : "";
    const action =
      typeof s.action === "string" ? s.action.trim().slice(0, 240) : "";
    const priority =
      typeof s.priority === "string" && ALLOWED_PRIORITIES.has(s.priority)
        ? s.priority
        : "medium";
    const category =
      typeof s.category === "string" && ALLOWED_CATEGORIES.has(s.category)
        ? s.category
        : "reflection";
    if (!title) continue;
    out.push({ title, rationale, action, priority, category });
  }
  return out;
}

function summarizeProfile(p: any): string {
  if (!p) return "(no profile yet)";
  const lines: string[] = [];
  if (p.current_role) lines.push(`Current role: ${p.current_role}`);
  if (p.current_company) lines.push(`At: ${p.current_company}`);
  if (p.industry) lines.push(`Industry: ${p.industry}`);
  if (p.location) lines.push(`Location: ${p.location}`);
  if (p.years_experience) lines.push(`Years experience: ${p.years_experience}`);
  if (Array.isArray(p.top_skills) && p.top_skills.length)
    lines.push(`Top skills: ${p.top_skills.slice(0, 10).join(", ")}`);
  if (Array.isArray(p.target_roles) && p.target_roles.length)
    lines.push(`Target roles: ${p.target_roles.slice(0, 6).join(", ")}`);
  if (p.transition_goal) lines.push(`Transition goal: ${p.transition_goal}`);
  if (p.twelve_month_goals)
    lines.push(`12-month goals: ${String(p.twelve_month_goals).slice(0, 240)}`);
  if (p.pain_points)
    lines.push(`Pain points: ${String(p.pain_points).slice(0, 240)}`);
  if (p.blockers) lines.push(`Blockers: ${String(p.blockers).slice(0, 240)}`);
  return lines.join("\n") || "(minimal profile)";
}

function summarizeOpportunities(opps: any[]): string {
  if (!opps?.length) return "(no opportunities tracked recently)";
  return opps
    .slice(0, 10)
    .map(
      (o) =>
        `• [${o.stage}] ${o.role_title} — ${o.company_name}${
          o.next_action_date ? ` (next: ${o.next_action_date})` : ""
        }`,
    )
    .join("\n");
}

function summarizeFiles(files: any[]): string {
  if (!files?.length) return "(no recent uploads)";
  return files
    .slice(0, 10)
    .map(
      (f) =>
        `• ${f.filename} [${f.category}${f.is_master ? ", master" : ""}]`,
    )
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "Missing bearer token" });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(500, { error: "Supabase env not configured" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult?.user) {
    return json(401, { error: "Not authenticated" });
  }
  const userId = userResult.user.id;
  const today = todayIso();

  let payload: { force?: boolean } = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }
  const force = !!payload.force;

  // Return cached row unless forced.
  if (!force) {
    const { data: existing, error: exErr } = await supabase
      .from("daily_insights")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();
    if (exErr) {
      return json(500, { error: exErr.message });
    }
    if (existing) {
      return json(200, { insights: existing, cached: true });
    }
  }

  if (!ANTHROPIC_API_KEY) {
    return json(500, { error: "ANTHROPIC_API_KEY is not configured" });
  }

  const [profileR, oppsR, filesR] = await Promise.all([
    supabase
      .from("career_profile")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("career_opportunities")
      .select(
        "id, company_name, role_title, stage, next_action_date, applied_date, created_at",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("career_vault_files")
      .select("id, filename, category, is_master, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const profile = profileR.data ?? null;
  const opps = oppsR.data ?? [];
  const files = filesR.data ?? [];

  const instructions = `You are a career strategist analyzing a user's career snapshot.

## Profile Summary
${summarizeProfile(profile)}

## Recent opportunities (last 30 days)
${summarizeOpportunities(opps)}

## Recent file uploads
${summarizeFiles(files)}

## Task
Generate 3 actionable suggestions for the next 7 days. Each should be:
- Specific and concrete
- Achievable in <= 1 hour
- Tied to a career outcome

Return ONLY valid JSON with this shape:
{
  "suggestions": [
    {
      "title": "Short action title",
      "rationale": "Why this matters (1 sentence)",
      "action": "What to do",
      "priority": "high" | "medium" | "low",
      "category": "application" | "skill" | "network" | "reflection"
    }
  ]
}
No fencing, no preamble.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let suggestions: Array<any> = [];
  try {
    const anth = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        messages: [{ role: "user", content: instructions }],
      }),
      signal: controller.signal,
    });

    if (!anth.ok) {
      const errText = await anth.text();
      return json(502, {
        error: "LLM upstream error",
        detail: errText.slice(0, 400),
      });
    }
    const llm = await anth.json();
    const textBlock = Array.isArray(llm?.content)
      ? llm.content.find((b: any) => b?.type === "text")?.text ?? ""
      : "";
    const trimmed = String(textBlock).trim();
    let parsed: unknown = null;
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = null;
      }
    }
    suggestions = coerceSuggestions(parsed);
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return json(aborted ? 504 : 500, {
      error: aborted ? "Upstream timeout" : "Unexpected failure",
    });
  } finally {
    clearTimeout(timeout);
  }

  if (suggestions.length === 0) {
    // Fallback: a safe, non-hallucinated nudge.
    suggestions = [
      {
        title: "Log one career interaction today",
        rationale: "Keeps the network warm without much effort.",
        action:
          "Pick a contact you haven't reached out to in 90+ days and send a 2-line hello.",
        priority: "medium",
        category: "network",
      },
    ];
  }

  const id = crypto.randomUUID();
  const row = {
    id,
    user_id: userId,
    date: today,
    suggestions,
    interactions: {},
  };

  const { data: saved, error: upsertErr } = await supabase
    .from("daily_insights")
    .upsert(row, { onConflict: "user_id,date" })
    .select()
    .single();

  if (upsertErr) {
    return json(500, { error: upsertErr.message });
  }

  return json(200, { insights: saved, cached: false });
});
