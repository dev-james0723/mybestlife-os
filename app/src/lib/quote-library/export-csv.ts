/**
 * CSV export of the user's entire library.
 *
 * Writes all 16 spec fields + id / created_at / updated_at. Handles quotes,
 * commas, and newlines via RFC-4180 double-quote escaping. Runs on the
 * client — no server round-trip.
 */

import { saveAs } from "file-saver";
import type { Quote } from "@/types/quote";

const COLUMNS: (keyof Quote)[] = [
  "id",
  "quote_text",
  "source_author",
  "source_context",
  "source_url",
  "source_type",
  "source_module",
  "category",
  "tags",
  "emotion_tone",
  "personal_note",
  "is_favorite",
  "linked_goal_id",
  "language",
  "confidence_score",
  "is_ai_enriched",
  "is_seed",
  "last_surfaced_on",
  "created_at",
  "updated_at",
];

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return escapeCell(value.join("; "));
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportQuotesToCsv(quotes: Quote[]): void {
  const lines: string[] = [];
  lines.push(COLUMNS.join(","));
  for (const q of quotes) {
    const row = COLUMNS.map((col) => {
      if (col === "source_intelligence") return "";
      const value = q[col];
      return escapeCell(value);
    });
    lines.push(row.join(","));
  }
  const blob = new Blob([lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const filename = `quote-library-${new Date().toISOString().slice(0, 10)}.csv`;
  saveAs(blob, filename);
}
