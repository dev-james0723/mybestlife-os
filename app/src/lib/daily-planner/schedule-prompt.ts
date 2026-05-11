import type { DailyPlanTask } from "@/types/database";

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatClock(totalMin: number): string {
  const wrap = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrap / 60);
  const m = wrap % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type SchedulePromptRow = {
  title: string;
  start: string;
  end: string;
  blocks: number;
  minutes: number;
};

export function buildScheduleRows(
  startTime: string,
  tasks: DailyPlanTask[],
  blockMinutes: number,
): SchedulePromptRow[] {
  const startMin = parseTimeToMinutes(startTime);
  const rows: SchedulePromptRow[] = [];
  let cum = 0;
  for (const t of tasks) {
    const blocks = t.blocks ?? 1;
    const minutes = blocks * blockMinutes;
    const taskStart = startMin + cum;
    const taskEnd = taskStart + minutes;
    const title = (t.taskName ?? "").trim() || "Untitled";
    rows.push({
      title,
      start: formatClock(taskStart),
      end: formatClock(taskEnd),
      blocks,
      minutes,
    });
    cum += minutes;
  }
  return rows;
}

export function buildScheduleImagePrompt(args: {
  planDate: string;
  planDayWindow: string;
  /** Canonical dropdown name the user selected (fixed catalog). */
  styleCatalogLabel: string;
  /** Stable id aligned with the app catalog (helps the model treat the look as locked). */
  styleCatalogId: string;
  /** Long-form art direction for the image model (palette, type, texture, layout). */
  stylePromptDirective: string;
  rows: SchedulePromptRow[];
  blockMinutes?: number;
}): string {
  const lines = args.rows
    .map((r) => `- ${r.start}–${r.end} (${r.blocks} blocks, ${r.minutes} min): ${r.title}`)
    .join("\n");

  return `You are an award-winning editorial designer. Generate ONE high-resolution illustrative image: a single-day "Official Schedule" poster (shareable, print-ready).

The user selected this exact image style from a fixed product catalog — do not substitute a different aesthetic:
- Catalog label: ${args.styleCatalogLabel}
- Catalog id: ${args.styleCatalogId}

Art direction (follow literally; this expands the short catalog name into concrete visual instructions):
${args.stylePromptDirective}

Hard requirements:
- Output must be a polished poster / editorial layout (not a screenshot of app UI, not a stock photo collage).
- Include a clear title treatment for the document reading "Official Schedule" (English is fine) plus the plan date prominently: ${args.planDate}.
- Render the full ordered schedule with accurate time ranges and task titles as legible typography.
- The overall look must unmistakably match the selected catalog style above (typography, color, texture, composition).
- No watermarks, no logos, no "AI" disclaimers inside the artwork.

Context:
- Day window for reference only: ${args.planDayWindow}
- Each planning block = ${args.blockMinutes ?? 10} minutes unless noted.

Schedule (in order):
${lines}

Return a single clear image suitable for sharing or printing.`;
}
