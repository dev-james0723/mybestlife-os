import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { HEALTH_METRIC_TYPES, type HealthMetricType } from "@/types/database";

/**
 * POST /api/health/import
 *
 * Accepts either:
 *   - text/csv body with columns: metric_type, value, unit, recorded_at
 *     (header row required; any extra columns stored in metadata JSON)
 *   - application/json with { rows: Array<{metric_type, value, unit, recorded_at, metadata?}> }
 *
 * Authenticated via session cookie. Idempotent thanks to the natural-key
 * unique index on (user_id, metric_type, recorded_at, value).
 */
export const runtime = "nodejs";

const MAX_ROWS = 50000;
const VALID_TYPES = new Set<string>(HEALTH_METRIC_TYPES);

type ImportRow = {
  metric_type: string;
  value: number;
  unit: string;
  recorded_at: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let rows: ImportRow[];

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { rows?: ImportRow[] };
      rows = body.rows ?? [];
    } else if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      const text = await request.text();
      rows = parseCsv(text);
    } else {
      return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "parse_error" }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ inserted: 0, skipped: 0 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: "too_many_rows", max: MAX_ROWS }, { status: 413 });
  }

  const validRows: ImportRow[] = [];
  let skipped = 0;
  for (const r of rows) {
    if (
      typeof r.metric_type === "string" &&
      VALID_TYPES.has(r.metric_type) &&
      typeof r.value === "number" &&
      Number.isFinite(r.value) &&
      typeof r.unit === "string" &&
      typeof r.recorded_at === "string" &&
      !Number.isNaN(Date.parse(r.recorded_at))
    ) {
      validRows.push(r);
    } else {
      skipped += 1;
    }
  }

  if (validRows.length === 0) {
    return NextResponse.json({ inserted: 0, skipped });
  }

  const payload = validRows.map((r) => ({
    user_id: userData.user!.id,
    metric_type: r.metric_type as HealthMetricType,
    value: r.value,
    unit: r.unit,
    recorded_at: new Date(r.recorded_at).toISOString(),
    source: "import",
    metadata: r.metadata ?? null,
  }));

  // Batch in chunks so a very large CSV doesn't exceed Supabase payload limits.
  const CHUNK = 1000;
  let inserted = 0;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const chunk = payload.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("health_metrics")
      .upsert(chunk, {
        onConflict: "user_id,metric_type,recorded_at,value",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) {
      return NextResponse.json({ error: error.message, inserted }, { status: 500 });
    }
    inserted += data?.length ?? 0;
  }

  return NextResponse.json({ inserted, skipped });
}

/**
 * Minimal RFC 4180 CSV parser. Quoted fields with embedded commas are
 * supported; quoted newlines are not (rare in health exports, and keeps
 * the parser small and dependency-free).
 */
function parseCsv(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const required = ["metric_type", "value", "unit", "recorded_at"];
  for (const key of required) {
    if (!header.includes(key)) {
      throw new Error(`csv_missing_column:${key}`);
    }
  }
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const metric_type = cells[idx.metric_type] ?? "";
    const valueRaw = cells[idx.value] ?? "";
    const unit = cells[idx.unit] ?? "";
    const recorded_at = cells[idx.recorded_at] ?? "";
    const value = Number(valueRaw);
    const extras: Record<string, unknown> = {};
    for (const key of header) {
      if (required.includes(key)) continue;
      if (cells[idx[key]] !== undefined) extras[key] = cells[idx[key]];
    }
    rows.push({
      metric_type,
      value,
      unit,
      recorded_at,
      metadata: Object.keys(extras).length > 0 ? extras : undefined,
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === ",") {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}
