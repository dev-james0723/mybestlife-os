/**
 * Seed script for the AI Knowledge prompt library.
 *
 * Imports every prompt from `ai-boost/awesome-prompts` (all files under
 * `/prompts`), normalizes each into the `ai_prompt_library` schema, attaches
 * provenance (source_repo, source_url, source_path, license, attribution),
 * maps the file into the 2-level category taxonomy (top-level curated bucket
 * + source-derived subcategory), and upserts idempotently on `slug`.
 *
 * Usage (from app/):
 *   npm run seed:prompt-library   (loads .env.local via Node --env-file; needs SUPABASE_SERVICE_ROLE_KEY)
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-prompt-library.ts
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-prompt-library.ts --dry-run
 *   node scripts/seed-prompt-library.ts --export-sql supabase/migrations/YYYYMMDDHHMMSS_seed_ai_boost_awesome_prompts.sql
 *   GITHUB_TOKEN=ghp_... (optional, higher rate limit when listing)
 *
 * Node 22+ runs `.ts` files directly via the built-in strip-types loader.
 *
 * Idempotency:
 *   - `ai_prompt_categories` uses ON CONFLICT(slug) DO UPDATE (upsert).
 *   - `ai_prompt_library` uses ON CONFLICT(slug) DO UPDATE (upsert). Re-running
 *     the script refreshes title/description/body for any already-seeded row.
 */

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SOURCE_REPO = "ai-boost/awesome-prompts";
const SOURCE_BRANCH = "main";
const SOURCE_DIR = "prompts";
const LICENSE = "Apache-2.0";
const ATTRIBUTION = "ai-boost/awesome-prompts contributors";

const GITHUB_API = `https://api.github.com/repos/${SOURCE_REPO}/contents/${SOURCE_DIR}?ref=${SOURCE_BRANCH}`;

type TopCategory =
  | "writing_content"
  | "productivity_planning"
  | "coding_development"
  | "research_analysis"
  | "business_strategy"
  | "learning_education"
  | "career_professional"
  | "life_personal_growth"
  | "arts_creative"
  | "language_learning"
  | "expert_personas"
  | "meta_prompt_engineering";

type SubCategory = {
  slug: string;
  top: TopCategory;
  name: string;
  description?: string;
};

/**
 * Source-derived subcategories. Each file in awesome-prompts maps to exactly
 * one entry here (default fallback at the end of `deriveCategory`). Keeping
 * this set small and stable is intentional: we want Phase 1 filters to show
 * meaningful groupings without an explosion of near-duplicate buckets.
 */
const SUBCATEGORIES: SubCategory[] = [
  // coding_development
  { slug: "agents_orchestration", top: "coding_development", name: "Agents & Orchestration" },
  { slug: "coding_languages", top: "coding_development", name: "Coding & Languages" },
  { slug: "devops_sre", top: "coding_development", name: "DevOps & SRE" },
  { slug: "security_compliance", top: "coding_development", name: "Security & Compliance" },
  { slug: "data_databases", top: "coding_development", name: "Data & Databases" },
  { slug: "ml_llm_systems", top: "coding_development", name: "ML & LLM Systems" },

  // business_strategy
  { slug: "marketing_growth", top: "business_strategy", name: "Marketing & Growth" },
  { slug: "sales_customer", top: "business_strategy", name: "Sales & Customer Success" },
  { slug: "product_operations", top: "business_strategy", name: "Product & Operations" },
  { slug: "finance_investment", top: "business_strategy", name: "Finance & Investment" },
  { slug: "legal_risk", top: "business_strategy", name: "Legal & Risk" },

  // research_analysis
  { slug: "research_deep_dive", top: "research_analysis", name: "Deep Research" },
  { slug: "market_user_research", top: "research_analysis", name: "Market & User Research" },

  // writing_content
  { slug: "technical_writing", top: "writing_content", name: "Technical Writing" },
  { slug: "academic_writing", top: "writing_content", name: "Academic Writing" },
  { slug: "general_writing", top: "writing_content", name: "General Writing" },

  // arts_creative
  { slug: "image_visual", top: "arts_creative", name: "Image & Visual Generation" },
  { slug: "video_media", top: "arts_creative", name: "Video & Media" },
  { slug: "game_story", top: "arts_creative", name: "Game & Story Design" },

  // learning_education
  { slug: "tutoring_coaching", top: "learning_education", name: "Tutoring & Coaching" },
  { slug: "academic_help", top: "learning_education", name: "Academic Help" },

  // career_professional
  { slug: "career_hr", top: "career_professional", name: "Career & HR" },

  // life_personal_growth
  { slug: "productivity_habits", top: "life_personal_growth", name: "Productivity & Habits" },
  { slug: "health_wellness", top: "life_personal_growth", name: "Health & Wellness" },

  // expert_personas
  { slug: "expert_roles", top: "expert_personas", name: "Expert Roles" },
  { slug: "roleplay_fiction", top: "expert_personas", name: "Roleplay & Fiction" },

  // meta_prompt_engineering
  { slug: "meta_prompts", top: "meta_prompt_engineering", name: "Meta Prompts" },
  { slug: "reasoning_patterns", top: "meta_prompt_engineering", name: "Reasoning Patterns" },
  { slug: "prompt_engineering_craft", top: "meta_prompt_engineering", name: "Prompt Engineering Craft" },

  // productivity_planning
  { slug: "planning_workflows", top: "productivity_planning", name: "Planning & Workflows" },
];

// ---------------------------------------------------------------------------
// Keyword-based category derivation
// ---------------------------------------------------------------------------

/**
 * File-name keyword → subcategory map. Evaluated top-to-bottom; first match
 * wins. Falls back to "expert_roles" under expert_personas for anything left
 * (which covers generic "X_specialist" / "X_advisor" persona prompts).
 */
const KEYWORD_RULES: Array<{ test: RegExp; subSlug: string }> = [
  // Meta / prompt engineering (check first so "prompt_injection" -> security, not meta)
  { test: /prompt_engineer(?!_ing_guardian)/i, subSlug: "prompt_engineering_craft" },
  { test: /meta_prompt|SuperPrompt|Prompt\s*Creater|chain_of_draft/i, subSlug: "meta_prompts" },
  { test: /reasoning_|reasoning_specialist|reasoning_model/i, subSlug: "reasoning_patterns" },

  // Agents & orchestration
  { test: /\b(multi_agent|managed_agent|agentic|agent_|autonomous_web_agent|interruptible_agent|goal_drift|skill_self_evolution|tool_schema|computer_use|adk_skilltoolset|llm_architect|mcp_server|realtime_voice_agent|trustworthy_agent|multimodal_agent|generative_ui|AutoGPT)\b/i, subSlug: "agents_orchestration" },

  // Security & compliance
  { test: /security_researcher|prompt_injection_guardian|threat_detection|compliance_auditor|content_moderator|computer_use_safety/i, subSlug: "security_compliance" },

  // Data & databases
  { test: /data_analysis|data_analyst|analytics_engineer|database_schema|sql_assistant|structured_output_extractor|data_engineer/i, subSlug: "data_databases" },

  // DevOps & SRE
  { test: /\bsre\b|incident_response|cloud_architect|kubernetes|performance_profiler|api_integration_architect|mcp_server/i, subSlug: "devops_sre" },

  // ML & LLM systems
  { test: /ml_systems|llm_architect|eval_benchmark|agent_eval_designer|agent_protocol_advisor|multi_agent_rag/i, subSlug: "ml_llm_systems" },

  // Coding
  { test: /frontend_developer|mobile_app_builder|code_reviewer|debugging_agent|refactoring_coach|solidity_smart_contract|qa_agent|test_strategy|game_designer|Professional\s*Coder|accessibility_auditor|api_integration/i, subSlug: "coding_languages" },

  // Career & HR
  { test: /hr_talent|recruitment_strategist|customer_support_agent|developer_advocate/i, subSlug: "career_hr" },

  // Sales / customer
  { test: /sales_strategist|customer_success/i, subSlug: "sales_customer" },

  // Marketing / growth
  { test: /brand_strategist|growth_hacker|seo_specialist|community_manager|market_research/i, subSlug: "marketing_growth" },

  // Product & operations
  { test: /product_manager|scrum_master|operations_manager|change_management|knowledge_management_architect|ai_native_product/i, subSlug: "product_operations" },

  // Finance & investment
  { test: /cfo_financial|financial_advisor|investment_research/i, subSlug: "finance_investment" },

  // Legal
  { test: /legal_analyst/i, subSlug: "legal_risk" },

  // Research
  { test: /deep_research|ux_research/i, subSlug: "research_deep_dive" },
  { test: /multimodal_analyst|clinical_assistant/i, subSlug: "market_user_research" },

  // Writing / content
  { test: /technical_writer/i, subSlug: "technical_writing" },
  { test: /Academic\s*Assistant|Literature_Professor/i, subSlug: "academic_writing" },
  { test: /All-around\s*Writer|All-around\s*Teacher/i, subSlug: "general_writing" },
  { test: /pdf_translator/i, subSlug: "general_writing" },

  // Creative / arts
  { test: /flux_image_gen|Meta\s*MJ/i, subSlug: "image_visual" },
  { test: /video_gen_prompting/i, subSlug: "video_media" },
  { test: /game_designer|Vampire\s*The\s*Masquerade|Beauty_DND/i, subSlug: "game_story" },

  // Learning / education
  { test: /socratic_tutor|LearnOS_PRO|Mr_Ranedeer/i, subSlug: "tutoring_coaching" },

  // Productivity / habits
  { test: /productivity_assistant|QuickSilver|luna_prompt|claude_artifacts/i, subSlug: "productivity_habits" },
];

function deriveCategory(filename: string): { top: TopCategory; subSlug: string } {
  for (const rule of KEYWORD_RULES) {
    if (rule.test.test(filename)) {
      const sub = SUBCATEGORIES.find((s) => s.slug === rule.subSlug);
      if (sub) return { top: sub.top, subSlug: sub.slug };
    }
  }
  // Fallback: generic expert persona.
  return { top: "expert_personas", subSlug: "expert_roles" };
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function slugify(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  return base
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
}

function prettyTitleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pulls a human title and a short description out of a prompt file. The
 * heuristic is: first markdown H1 if present; otherwise first non-empty line;
 * otherwise fall back to the filename.
 */
function parseTitleAndDescription(
  filename: string,
  raw: string,
): { title: string; description: string } {
  const lines = raw.split(/\r?\n/);
  let title = prettyTitleFromFilename(filename);
  let description = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#\s+/.test(trimmed)) {
      title = trimmed.replace(/^#\s+/, "").replace(/^#+\s*/, "").trim();
      break;
    }
    title = trimmed.replace(/^#+\s*/, "").trim();
    break;
  }

  // Description: first paragraph that isn't the title line and isn't a comment
  let inBody = false;
  const descChunks: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!inBody) {
      if (/^#\s+/.test(t) || (!t && descChunks.length === 0)) {
        inBody = true;
        continue;
      }
      inBody = true;
    }
    if (!t) {
      if (descChunks.length > 0) break;
      continue;
    }
    if (t.startsWith("#")) continue; // skip headings inside body
    if (t.startsWith("<!--") || t.startsWith("-->")) continue;
    descChunks.push(t);
    if (descChunks.join(" ").length > 240) break;
  }
  description = descChunks.join(" ").slice(0, 240).trim();
  if (!description) {
    description = `${title} — prompt from ${SOURCE_REPO}`;
  }

  return { title, description };
}

/**
 * Extract `{variable}` occurrences so the prompt card can tell the user what
 * inputs are expected. Names are unique, preserve first-seen order.
 */
function extractVariables(body: string): Array<{ name: string; label: string | null; description: null; required: boolean; example: null }> {
  const re = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
  const seen = new Set<string>();
  const out: Array<{ name: string; label: string | null; description: null; required: boolean; example: null }> = [];
  for (const m of body.matchAll(re)) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      out.push({
        name,
        label: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: null,
        required: true,
        example: null,
      });
    }
  }
  return out;
}

function tagsFromFilename(filename: string): string[] {
  const base = filename.replace(/\.[^.]+$/, "");
  const parts = base
    .replace(/[_\-]+/g, " ")
    .split(/\s+/)
    .map((p) => p.toLowerCase())
    .filter((p) => p && p.length <= 20)
    .slice(0, 5);
  return Array.from(new Set(parts));
}

// ---------------------------------------------------------------------------
// GitHub listing + raw fetch
// ---------------------------------------------------------------------------

type GhEntry = {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
  html_url: string;
};

async function ghFetch<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {
    "User-Agent": "mylifeos-seed-prompt-library",
    Accept: "application/vnd.github+json",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status} ${res.statusText}: ${body.slice(0, 240)}`);
  }
  return (await res.json()) as T;
}

async function fetchRawText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "mylifeos-seed-prompt-library" },
  });
  if (!res.ok) {
    throw new Error(`Raw fetch failed: ${res.status} ${res.statusText} for ${url}`);
  }
  return await res.text();
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

type PromptRow = {
  slug: string;
  title_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  body: string;
  body_locale: string;
  top_category: TopCategory;
  sub_category_slug: string | null;
  tags: string[];
  variables: ReturnType<typeof extractVariables>;
  icon: null;
  is_featured: boolean;
  sort_order: number;
  source_repo: string;
  source_url: string | null;
  source_path: string | null;
  license: string | null;
  attribution: string | null;
};

function sqlStringLiteral(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlJsonb(value: unknown): string {
  return `${sqlStringLiteral(JSON.stringify(value))}::jsonb`;
}

function sqlTextArray(tags: string[]): string {
  if (tags.length === 0) return "ARRAY[]::text[]";
  const parts = tags.map((t) => sqlStringLiteral(t));
  return `ARRAY[${parts.join(", ")}]::text[]`;
}

/**
 * Dollar-quote prompt bodies for SQL. Tag includes a content hash so the closing
 * delimiter cannot appear inside the body (unless hash collision + substring).
 */
function dollarQuoteBody(content: string, rowIndex: number): string {
  const digest = createHash("sha256")
    .update(content)
    .digest("hex")
    .slice(0, 20);
  const tag = `awb_${rowIndex}_${digest}`;
  const mark = `$${tag}$`;
  if (content.includes(mark)) {
    const tag2 = `${tag}_x`;
    const mark2 = `$${tag2}$`;
    if (content.includes(mark2)) {
      throw new Error(`Could not dollar-quote body for row ${rowIndex}`);
    }
    return `${mark2}${content}${mark2}`;
  }
  return `${mark}${content}${mark}`;
}

/**
 * Writes a Supabase migration that upserts awesome-prompts subcategories + library rows.
 * Regenerate when upstream adds/changes files: re-run with --export-sql.
 */
function buildAwesomePromptsMigrationSql(rows: PromptRow[]): string {
  const subValues = SUBCATEGORIES.map((s, i) => {
    const nameJson = sqlJsonb({ en: s.name });
    const desc =
      s.description != null
        ? sqlJsonb({ en: s.description })
        : "NULL::jsonb";
    return `(${sqlStringLiteral(s.slug)}, NULL, ${sqlStringLiteral(s.top)}, ${nameJson}, ${desc}, NULL, ${100 + i})`;
  }).join(",\n  ");

  const libraryValues = rows
    .map((row, i) => {
      const bodyQ = dollarQuoteBody(row.body, i);
      return `(
  ${sqlStringLiteral(row.slug)},
  ${sqlJsonb(row.title_i18n)},
  ${sqlJsonb(row.description_i18n)},
  ${bodyQ},
  ${sqlStringLiteral(row.body_locale)},
  ${sqlStringLiteral(row.top_category)},
  ${row.sub_category_slug ? sqlStringLiteral(row.sub_category_slug) : "NULL"},
  ${sqlTextArray(row.tags)},
  ${sqlJsonb(row.variables)},
  NULL,
  ${row.is_featured ? "true" : "false"},
  ${row.sort_order},
  ${sqlStringLiteral(row.source_repo)},
  ${row.source_url ? sqlStringLiteral(row.source_url) : "NULL"},
  ${row.source_path ? sqlStringLiteral(row.source_path) : "NULL"},
  ${row.license ? sqlStringLiteral(row.license) : "NULL"},
  ${row.attribution ? sqlStringLiteral(row.attribution) : "NULL"}
)`;
    })
    .join(",\n");

  return `-- =============================================================================
-- ai-boost/awesome-prompts — full library snapshot (prompts/*.md, *.txt)
-- Source: https://github.com/ai-boost/awesome-prompts
-- Regenerate: cd app && node --experimental-strip-types scripts/seed-prompt-library.ts --export-sql supabase/migrations/<this-file>
-- =============================================================================

INSERT INTO public.ai_prompt_categories (slug, parent_slug, top_category, name_i18n, description_i18n, icon, sort_order)
VALUES
  ${subValues}
ON CONFLICT (slug) DO UPDATE SET
  top_category = EXCLUDED.top_category,
  name_i18n = EXCLUDED.name_i18n,
  description_i18n = EXCLUDED.description_i18n,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.ai_prompt_library (
  slug,
  title_i18n,
  description_i18n,
  body,
  body_locale,
  top_category,
  sub_category_slug,
  tags,
  variables,
  icon,
  is_featured,
  sort_order,
  source_repo,
  source_url,
  source_path,
  license,
  attribution
)
VALUES
${libraryValues}
ON CONFLICT (slug) DO UPDATE SET
  title_i18n = EXCLUDED.title_i18n,
  description_i18n = EXCLUDED.description_i18n,
  body = EXCLUDED.body,
  body_locale = EXCLUDED.body_locale,
  top_category = EXCLUDED.top_category,
  sub_category_slug = EXCLUDED.sub_category_slug,
  tags = EXCLUDED.tags,
  variables = EXCLUDED.variables,
  icon = EXCLUDED.icon,
  is_featured = EXCLUDED.is_featured,
  sort_order = EXCLUDED.sort_order,
  source_repo = EXCLUDED.source_repo,
  source_url = EXCLUDED.source_url,
  source_path = EXCLUDED.source_path,
  license = EXCLUDED.license,
  attribution = EXCLUDED.attribution,
  updated_at = now();
`;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const exportIdx = process.argv.indexOf("--export-sql");
  const exportSqlPath = exportIdx >= 0 ? process.argv[exportIdx + 1] : null;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!dryRun && !exportSqlPath && (!supabaseUrl || !serviceKey)) {
    const parts: string[] = [];
    if (!supabaseUrl) {
      parts.push("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
    }
    if (!serviceKey) {
      parts.push(
        "SUPABASE_SERVICE_ROLE_KEY (Dashboard → Project Settings → API → service_role; add to .env.local for npm run seed:prompt-library)",
      );
    }
    console.error(`Missing: ${parts.join("; ")}. Use --dry-run or --export-sql to skip DB.`);
    process.exit(1);
  }

  if (exportSqlPath && !exportSqlPath.endsWith(".sql")) {
    console.error("--export-sql must be followed by a path ending in .sql");
    process.exit(1);
  }

  console.log(`[seed] Listing ${SOURCE_REPO}/${SOURCE_DIR}@${SOURCE_BRANCH}`);
  const listing = await ghFetch<GhEntry[]>(GITHUB_API);
  const files = listing.filter(
    (entry) => entry.type === "file" && /\.(md|txt)$/i.test(entry.name),
  );
  console.log(`[seed] Found ${files.length} files`);

  console.log("[seed] Fetching file contents (concurrency=6)");
  const rawContents = await mapWithConcurrency(files, 6, async (file) => {
    if (!file.download_url) throw new Error(`No download_url for ${file.path}`);
    const raw = await fetchRawText(file.download_url);
    return { file, raw };
  });

  const rows: PromptRow[] = rawContents.map(({ file, raw }, index) => {
    const { top, subSlug } = deriveCategory(file.name);
    const { title, description } = parseTitleAndDescription(file.name, raw);
    const body = raw.trim();
    return {
      slug: `aw_${slugify(file.name)}`,
      title_i18n: { en: title },
      description_i18n: { en: description },
      body,
      body_locale: "en",
      top_category: top,
      sub_category_slug: subSlug,
      tags: tagsFromFilename(file.name),
      variables: extractVariables(body),
      icon: null,
      is_featured: false,
      sort_order: 1000 + index,
      source_repo: SOURCE_REPO,
      source_url: file.html_url,
      source_path: file.path,
      license: LICENSE,
      attribution: ATTRIBUTION,
    };
  });

  const byTop = new Map<TopCategory, number>();
  const bySub = new Map<string, number>();
  for (const row of rows) {
    byTop.set(row.top_category, (byTop.get(row.top_category) ?? 0) + 1);
    if (row.sub_category_slug) {
      bySub.set(row.sub_category_slug, (bySub.get(row.sub_category_slug) ?? 0) + 1);
    }
  }

  console.log("\n[seed] Per-top-category counts:");
  for (const cat of byTop.keys()) {
    console.log(`  ${cat.padEnd(28)} ${byTop.get(cat)}`);
  }
  console.log("\n[seed] Per-subcategory counts:");
  for (const slug of bySub.keys()) {
    console.log(`  ${slug.padEnd(28)} ${bySub.get(slug)}`);
  }
  console.log(`\n[seed] Total prompts: ${rows.length}`);

  if (exportSqlPath) {
    const sql = buildAwesomePromptsMigrationSql(rows);
    writeFileSync(exportSqlPath, sql, "utf8");
    console.log(`[seed] Wrote SQL migration (${rows.length} prompts) → ${exportSqlPath}`);
    return;
  }

  if (dryRun) {
    console.log("[seed] Dry run. No database writes performed.");
    return;
  }

  const client = createClient(supabaseUrl!, serviceKey!, {
    auth: { persistSession: false },
  });

  console.log("\n[seed] Upserting subcategories…");
  const subRows = SUBCATEGORIES.map((s, i) => ({
    slug: s.slug,
    parent_slug: null,
    top_category: s.top,
    name_i18n: { en: s.name },
    description_i18n: s.description ? { en: s.description } : null,
    icon: null,
    sort_order: 100 + i,
  }));
  const { error: subErr } = await client
    .from("ai_prompt_categories")
    .upsert(subRows, { onConflict: "slug" });
  if (subErr) {
    throw new Error(`Failed to upsert subcategories: ${subErr.message}`);
  }

  console.log(`[seed] Upserting ${rows.length} prompts (chunks of 50)…`);
  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await client
      .from("ai_prompt_library")
      .upsert(chunk, { onConflict: "slug" });
    if (error) {
      throw new Error(`Upsert chunk ${i / chunkSize} failed: ${error.message}`);
    }
    process.stdout.write(".");
  }
  console.log("\n[seed] Done.");
}

main().catch((err) => {
  console.error("[seed] Failed:", err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
