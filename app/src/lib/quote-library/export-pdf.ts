/**
 * PDF export of the user's library using `pdf-lib`.
 *
 * One quote per card, word-wrapped to the page width. Pagination is
 * automatic. Built for the standard Latin subset — CJK is laid out as best
 * the embedded Helvetica font allows (glyphs outside Latin-1 become "·").
 * A full CJK-capable PDF path would require embedding NotoSansCJK; kept out
 * of scope to stay within the 50KB per-export budget.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import type { Quote } from "@/types/quote";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const LINE_HEIGHT = 16;
const CARD_PADDING = 12;
const CARD_GAP = 16;

function sanitizeForHelvetica(input: string): string {
  // Replace any glyph outside WinAnsi with a neutral interpunct; avoids
  // pdf-lib throwing on CJK characters.
  return input.replace(/[^\x00-\xff]/g, "·");
}

function wrap(
  text: string,
  font: import("pdf-lib").PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\n+/);
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const w = font.widthOfTextAtSize(candidate, fontSize);
      if (w > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    lines.push("");
  }
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

export async function exportQuotesToPdf(
  quotes: Quote[],
  meta: { title: string },
): Promise<void> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - MARGIN;

  const drawTitle = () => {
    const titleText = sanitizeForHelvetica(meta.title);
    page.drawText(titleText, {
      x: MARGIN,
      y: cursorY,
      size: 22,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.12),
    });
    cursorY -= 30;
    page.drawText(
      `Exported ${new Date().toISOString().slice(0, 10)} · ${quotes.length} quotes`,
      {
        x: MARGIN,
        y: cursorY,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.55),
      },
    );
    cursorY -= 24;
  };
  drawTitle();

  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  for (const quote of quotes) {
    const body = sanitizeForHelvetica(quote.quote_text);
    const author = sanitizeForHelvetica(quote.source_author ?? "Unknown");
    const context = quote.source_context
      ? sanitizeForHelvetica(quote.source_context)
      : "";
    const category = quote.category
      ? sanitizeForHelvetica(quote.category)
      : "";
    const tags = (quote.tags || [])
      .map((t) => `#${sanitizeForHelvetica(t)}`)
      .join("  ");

    const bodyLines = wrap(`"${body}"`, fontItalic, 12, maxWidth - CARD_PADDING * 2);
    const metaLine = `${author}${context ? ` — ${context}` : ""}`;
    const metaLines = wrap(metaLine, font, 10, maxWidth - CARD_PADDING * 2);
    const tagLines = tags
      ? wrap(tags, font, 9, maxWidth - CARD_PADDING * 2)
      : [];

    const cardHeight =
      CARD_PADDING * 2 +
      bodyLines.length * 16 +
      metaLines.length * 13 +
      (tagLines.length ? tagLines.length * 12 + 6 : 0) +
      (category ? 18 : 0);

    if (cursorY - cardHeight < MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      cursorY = PAGE_HEIGHT - MARGIN;
    }

    const cardTop = cursorY;
    const cardBottom = cardTop - cardHeight;

    page.drawRectangle({
      x: MARGIN,
      y: cardBottom,
      width: maxWidth,
      height: cardHeight,
      color: rgb(0.98, 0.97, 0.96),
      borderColor: rgb(0.9, 0.9, 0.92),
      borderWidth: 0.5,
    });

    let innerY = cardTop - CARD_PADDING - 14;
    if (category) {
      page.drawText(category.toUpperCase(), {
        x: MARGIN + CARD_PADDING,
        y: innerY,
        size: 8,
        font: fontBold,
        color: rgb(0.45, 0.4, 0.55),
      });
      innerY -= 16;
    }
    for (const line of bodyLines) {
      page.drawText(line, {
        x: MARGIN + CARD_PADDING,
        y: innerY,
        size: 12,
        font: fontItalic,
        color: rgb(0.1, 0.1, 0.12),
      });
      innerY -= LINE_HEIGHT;
    }
    for (const line of metaLines) {
      page.drawText(`— ${line}`, {
        x: MARGIN + CARD_PADDING,
        y: innerY,
        size: 10,
        font,
        color: rgb(0.35, 0.35, 0.4),
      });
      innerY -= 13;
    }
    if (tagLines.length) {
      innerY -= 4;
      for (const line of tagLines) {
        page.drawText(line, {
          x: MARGIN + CARD_PADDING,
          y: innerY,
          size: 9,
          font,
          color: rgb(0.55, 0.55, 0.6),
        });
        innerY -= 12;
      }
    }

    cursorY = cardBottom - CARD_GAP;
  }

  const bytes = await pdf.save();
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  saveAs(blob, `quote-library-${new Date().toISOString().slice(0, 10)}.pdf`);
}
