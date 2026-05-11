import { saveAs } from "file-saver";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type {
  CareerDecision,
  CareerEvent,
  CareerOpportunity,
  CareerVaultFile,
} from "@/types/database";
import { computeFunnel } from "@/lib/analytics/funnel";
import { countFilesByCategory } from "@/lib/dashboard/aggregators";

export type QuarterLabel = { year: number; quarter: 1 | 2 | 3 | 4 };

export function currentQuarter(date: Date = new Date()): QuarterLabel {
  const q = (Math.floor(date.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  return { year: date.getFullYear(), quarter: q };
}

export function formatQuarter(q: QuarterLabel): string {
  return `Q${q.quarter} ${q.year}`;
}

function quarterRange(q: QuarterLabel): { start: Date; end: Date } {
  const startMonth = (q.quarter - 1) * 3;
  const start = new Date(q.year, startMonth, 1);
  const end = new Date(q.year, startMonth + 3, 0, 23, 59, 59);
  return { start, end };
}

function inRange(iso: string | null | undefined, range: { start: Date; end: Date }) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d >= range.start && d <= range.end;
}

export type QuarterlyReportSource = {
  files: CareerVaultFile[];
  opportunities: CareerOpportunity[];
  events: CareerEvent[];
  decisions: CareerDecision[];
  quarter: QuarterLabel;
  aiNarrative?: string | null;
};

/**
 * Generate a multi-page PDF summarising a user's quarter and trigger a
 * browser download. No external AI calls are made here; if the caller wants
 * an AI narrative paragraph, they should pass it in via `aiNarrative`.
 */
export async function generateQuarterlyReport(
  src: QuarterlyReportSource,
): Promise<void> {
  const { quarter } = src;
  const label = formatQuarter(quarter);
  const range = quarterRange(quarter);

  const filesThisQ = src.files.filter((f) => inRange(f.created_at, range));
  const appsThisQ = src.opportunities.filter(
    (o) => inRange(o.applied_date, range) || inRange(o.created_at, range),
  );
  const offersThisQ = src.opportunities.filter(
    (o) =>
      (o.stage === "offer" || o.stage === "accepted") &&
      (inRange(o.updated_at, range) ||
        Object.entries(o.stage_history ?? {}).some(
          ([st, when]) =>
            (st === "offer" || st === "accepted") && inRange(when, range),
        )),
  );
  const eventsThisQ = src.events.filter((e) => inRange(e.start_date, range));
  const decisionsThisQ = src.decisions.filter((d) =>
    inRange(d.decided_at, range),
  );

  const funnel = computeFunnel(appsThisQ);
  const fileBreakdown = countFilesByCategory(filesThisQ);

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 56;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let cursor = pageHeight - margin;

  const newPage = () => {
    page = doc.addPage([pageWidth, pageHeight]);
    cursor = pageHeight - margin;
  };

  const ensureRoom = (needed: number) => {
    if (cursor - needed < margin) newPage();
  };

  const drawText = (
    text: string,
    opts: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      gap?: number;
    } = {},
  ) => {
    const size = opts.size ?? 11;
    const gap = opts.gap ?? 4;
    ensureRoom(size + gap);
    page.drawText(text.slice(0, 600), {
      x: margin,
      y: cursor - size,
      size,
      font: opts.bold ? bold : font,
      color: opts.color ?? rgb(0.1, 0.1, 0.12),
      maxWidth,
    });
    cursor -= size + gap;
  };

  const section = (title: string) => {
    cursor -= 6;
    ensureRoom(28);
    drawText(title, { size: 14, bold: true, gap: 8 });
  };

  drawText(`${label} Career Report`, { size: 26, bold: true, gap: 10 });
  drawText(
    `Generated ${new Date().toLocaleDateString()} — auto-summary of your activity this quarter.`,
    { size: 10, color: rgb(0.4, 0.4, 0.45), gap: 12 },
  );

  // Activity summary
  section("Activity summary");
  drawText(`Files uploaded: ${filesThisQ.length}`);
  drawText(`Applications started: ${appsThisQ.length}`);
  drawText(`Offers received/accepted: ${offersThisQ.length}`);
  drawText(`Timeline events: ${eventsThisQ.length}`);
  drawText(`Decisions recorded: ${decisionsThisQ.length}`);

  // Funnel snapshot
  section("Application funnel");
  for (const entry of funnel) {
    drawText(`${entry.stage.padEnd(16, " ")}  ${entry.count}`);
  }

  // Wins
  section("Wins");
  if (offersThisQ.length === 0) {
    drawText("— No offers closed this quarter yet. Keep going.", {
      color: rgb(0.35, 0.35, 0.4),
    });
  } else {
    for (const o of offersThisQ.slice(0, 10)) {
      drawText(`• ${o.role_title} — ${o.company_name} (${o.stage})`);
    }
  }

  // Key learnings
  section("Key learnings");
  if (decisionsThisQ.length === 0) {
    drawText("— No decisions logged this quarter.", {
      color: rgb(0.35, 0.35, 0.4),
    });
  } else {
    for (const d of decisionsThisQ.slice(0, 10)) {
      drawText(`• ${d.title}`);
      if (d.lessons_learned) {
        drawText(`  ${d.lessons_learned.slice(0, 140)}`, {
          size: 10,
          color: rgb(0.4, 0.4, 0.45),
        });
      }
    }
  }

  // File breakdown
  section("Files added, by category");
  const fileEntries = Object.entries(fileBreakdown);
  if (fileEntries.length === 0) {
    drawText("— No files uploaded.", { color: rgb(0.35, 0.35, 0.4) });
  } else {
    for (const [cat, count] of fileEntries) {
      drawText(`${cat.padEnd(16, " ")}  ${count}`);
    }
  }

  // Narrative (optional)
  if (src.aiNarrative) {
    section("Reflection");
    const lines = wrapText(src.aiNarrative, 90);
    for (const line of lines) drawText(line, { size: 11 });
  }

  // Footer
  cursor = margin;
  page.drawText(label, {
    x: margin,
    y: margin - 10,
    size: 9,
    font,
    color: rgb(0.55, 0.55, 0.6),
  });

  const bytes = await doc.save();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: "application/pdf" });
  saveAs(blob, `career-report-${label.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

function wrapText(s: string, cols: number): string[] {
  const out: string[] = [];
  const words = s.split(/\s+/);
  let line = "";
  for (const w of words) {
    if (line.length + w.length + 1 > cols) {
      if (line) out.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) out.push(line);
  return out;
}
