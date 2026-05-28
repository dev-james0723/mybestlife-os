import { stripHtml } from "@/lib/utils/html";

/** Plain-text overview shown under the idea title (user-authored content). */
export function ideaOverviewFromContent(content: string, max = 600): string {
  const plain = stripHtml(content).replace(/\s+/g, " ").trim();
  if (!plain) return "";
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1)}…`;
}
