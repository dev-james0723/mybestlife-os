/**
 * Backfill Idea Capture card thumbnails (SVG gradient placeholders).
 *
 *   npm run backfill:idea-card-visuals
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const STYLE_VERSION = "gradient-v1";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function previewTitle(idea: { title?: string | null; content: string }): string {
  const t = idea.title?.trim();
  if (t) return t.slice(0, 72);
  const line = stripHtml(idea.content).split("\n")[0]?.trim() ?? "";
  return line.slice(0, 72) || "Untitled idea";
}

function defaultPalette(seed: string): string[] {
  const palettes = [
    ["#7dd3fc", "#fdba74", "#6366f1"],
    ["#a5b4fc", "#fbcfe8", "#38bdf8"],
    ["#86efac", "#fde68a", "#60a5fa"],
    ["#c4b5fd", "#fda4af", "#7dd3fc"],
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length]!;
}

function buildPlaceholderSvg(title: string, palette: string[]): string {
  const [top, mid, bottom] = palette;
  const label = title.slice(0, 24).replace(/[<>&"]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${top}"/>
      <stop offset="55%" stop-color="${mid}"/>
      <stop offset="100%" stop-color="${bottom}"/>
    </linearGradient>
  </defs>
  <rect width="480" height="640" fill="url(#bg)"/>
  <path d="M 120 120 A 120 120 0 0 1 360 120" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>
  <text x="240" y="560" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="500" letter-spacing="0.2em" fill="rgba(255,255,255,0.72)">${label}</text>
</svg>`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !key?.trim()) {
    throw new Error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await supabase
    .from("ideas")
    .select("id,user_id,title,content,ai_suggestions")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const ideas = rows ?? [];
  console.log(`ideas total=${ideas.length}`);

  let ok = 0;
  let fail = 0;
  let skipped = 0;

  for (const idea of ideas) {
    const suggestions = (idea.ai_suggestions ?? {}) as Record<string, unknown>;
    const cardVisual = (suggestions.cardVisual ?? {}) as Record<string, unknown>;
    const imageUrl = typeof cardVisual.imageUrl === "string" ? cardVisual.imageUrl : "";
    const styleVersion = typeof cardVisual.styleVersion === "string" ? cardVisual.styleVersion : "";
    const hasError = typeof cardVisual.error === "string" && cardVisual.error.length > 0;

    if (imageUrl && styleVersion === STYLE_VERSION && !hasError) {
      skipped += 1;
      continue;
    }

    const title = previewTitle(idea);
    const palette = defaultPalette(title);
    const svg = buildPlaceholderSvg(title, palette);
    const storagePath = `${idea.user_id}/${idea.id}/${randomUUID()}.svg`;
    const bytes = Buffer.from(svg, "utf8");

    try {
      const { error: uploadError } = await supabase.storage
        .from("idea-card-icons")
        .upload(storagePath, bytes, { contentType: "image/svg+xml", upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage.from("idea-card-icons").getPublicUrl(storagePath);

      const { error: updateError } = await supabase
        .from("ideas")
        .update({
          ai_suggestions: {
            ...suggestions,
            cardVisual: {
              imageUrl: urlData.publicUrl,
              storagePath,
              model: "placeholder-svg",
              palette,
              styleVersion: STYLE_VERSION,
              generatedAt: new Date().toISOString(),
              error: undefined,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", idea.id);

      if (updateError) throw new Error(updateError.message);

      console.log(`ok ${idea.id.slice(0, 8)}… ${urlData.publicUrl.slice(0, 70)}…`);
      ok += 1;
    } catch (e) {
      console.error(`fail ${idea.id}:`, e instanceof Error ? e.message : String(e));
      fail += 1;
    }
  }

  console.log(`done ok=${ok} skipped=${skipped} fail=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
