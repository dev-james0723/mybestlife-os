/**
 * Quote → shareable image card renderer.
 *
 * Uses the browser's canvas API directly so we don't need a
 * `html-to-image` dependency. Renders at 2x device pixel ratio for retina
 * sharpness. Three style variants: `ivory`, `dusk`, `sage`.
 */

import { saveAs } from "file-saver";
import type { Quote } from "@/types/quote";

export type ShareCardStyle = "ivory" | "dusk" | "sage";

type Palette = {
  background: string;
  gradient?: [string, string];
  accent: string;
  body: string;
  meta: string;
  cardFont: string;
};

const PALETTES: Record<ShareCardStyle, Palette> = {
  ivory: {
    background: "#FBF7F1",
    gradient: ["#FBF7F1", "#EFE3D1"],
    accent: "#8C6B3F",
    body: "#1F1A14",
    meta: "#5E544A",
    cardFont:
      '"Source Serif Pro", "Source Serif", Georgia, "Noto Serif", serif',
  },
  dusk: {
    background: "#1E1B2E",
    gradient: ["#221E34", "#3B3556"],
    accent: "#F2C14E",
    body: "#F5F1E8",
    meta: "#B3A8CC",
    cardFont:
      '"Source Serif Pro", "Source Serif", Georgia, "Noto Serif", serif',
  },
  sage: {
    background: "#E6EEE4",
    gradient: ["#EFF4EC", "#CEDFCC"],
    accent: "#38674A",
    body: "#1E2A22",
    meta: "#4C6455",
    cardFont:
      '"Source Serif Pro", "Source Serif", Georgia, "Noto Serif", serif',
  },
};

/** Simple greedy word-wrap for canvas. */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\n+/);
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const word = words[i];
      const candidate = `${current} ${word}`;
      if (ctx.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }
  return lines;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1080;
const SAFE_MARGIN = 96;

export async function renderQuoteCardToDataUrl(
  quote: Quote,
  style: ShareCardStyle,
): Promise<string> {
  const canvas = document.createElement("canvas");
  const ratio = window.devicePixelRatio >= 2 ? 2 : 1;
  canvas.width = CARD_WIDTH * ratio;
  canvas.height = CARD_HEIGHT * ratio;
  canvas.style.width = `${CARD_WIDTH}px`;
  canvas.style.height = `${CARD_HEIGHT}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_context_unavailable");
  ctx.scale(ratio, ratio);

  const palette = PALETTES[style];

  // Background
  if (palette.gradient) {
    const grad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    grad.addColorStop(0, palette.gradient[0]);
    grad.addColorStop(1, palette.gradient[1]);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = palette.background;
  }
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Accent rule
  ctx.fillStyle = palette.accent;
  ctx.fillRect(SAFE_MARGIN, SAFE_MARGIN, 64, 6);

  // Quote body
  ctx.fillStyle = palette.body;
  ctx.font = `italic 500 52px ${palette.cardFont}`;
  ctx.textBaseline = "top";
  const bodyLines = wrapCanvasText(
    ctx,
    `“${quote.quote_text}”`,
    CARD_WIDTH - SAFE_MARGIN * 2,
  );
  let cursorY = SAFE_MARGIN + 48;
  const lineHeight = 72;
  const maxVisibleLines = 9;
  const visibleLines = bodyLines.slice(0, maxVisibleLines);
  if (bodyLines.length > maxVisibleLines) {
    const last = visibleLines[maxVisibleLines - 1];
    visibleLines[maxVisibleLines - 1] = last.endsWith("")
      ? `${last}…`
      : `${last}…`;
  }
  for (const line of visibleLines) {
    ctx.fillText(line, SAFE_MARGIN, cursorY);
    cursorY += lineHeight;
  }

  // Meta line
  cursorY += 12;
  ctx.fillStyle = palette.meta;
  ctx.font = `500 26px ${palette.cardFont}`;
  const metaBits: string[] = [];
  if (quote.source_author) metaBits.push(quote.source_author);
  if (quote.source_context) metaBits.push(quote.source_context);
  const metaText = metaBits.join(" — ") || "";
  if (metaText) {
    ctx.fillText(`— ${metaText}`, SAFE_MARGIN, cursorY);
    cursorY += 36;
  }

  // Category badge
  if (quote.category) {
    const category = quote.category.toUpperCase();
    ctx.font = `700 18px "Helvetica Neue", Arial, sans-serif`;
    const catWidth = ctx.measureText(category).width + 28;
    const badgeY = CARD_HEIGHT - SAFE_MARGIN - 40;
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    const radius = 20;
    ctx.moveTo(SAFE_MARGIN + radius, badgeY);
    ctx.arcTo(SAFE_MARGIN + catWidth, badgeY, SAFE_MARGIN + catWidth, badgeY + 40, radius);
    ctx.arcTo(SAFE_MARGIN + catWidth, badgeY + 40, SAFE_MARGIN, badgeY + 40, radius);
    ctx.arcTo(SAFE_MARGIN, badgeY + 40, SAFE_MARGIN, badgeY, radius);
    ctx.arcTo(SAFE_MARGIN, badgeY, SAFE_MARGIN + catWidth, badgeY, radius);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle =
      style === "dusk" ? "#1E1B2E" : style === "sage" ? "#EFF4EC" : "#FBF7F1";
    ctx.fillText(category, SAFE_MARGIN + 14, badgeY + 10);
  }

  // Watermark
  ctx.fillStyle = palette.meta;
  ctx.font = `500 18px "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(
    "my life os · quote library",
    CARD_WIDTH - SAFE_MARGIN,
    CARD_HEIGHT - SAFE_MARGIN,
  );
  ctx.textAlign = "start";

  return canvas.toDataURL("image/png");
}

export async function downloadQuoteCard(
  quote: Quote,
  style: ShareCardStyle,
): Promise<void> {
  const dataUrl = await renderQuoteCardToDataUrl(quote, style);
  const blob = await (await fetch(dataUrl)).blob();
  const slug = quote.quote_text
    .slice(0, 40)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  saveAs(blob, `quote-${slug || "card"}.png`);
}

export function getShareCardStyles(): ShareCardStyle[] {
  return ["ivory", "dusk", "sage"];
}
