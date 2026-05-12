import type { LoadedDocumentOracleContext } from "@/lib/document-brain/loadDocumentOracleContext";

/** Compact, non-secret digest for Gemini planning JSON (focus options, scripts). */
export function buildDocumentOracleDigestForAi(ctx: LoadedDocumentOracleContext, maxChars: number): string {
  const lines: string[] = [];
  lines.push(`DOCUMENT_TITLE: ${ctx.documentTitle ?? ""}`);
  lines.push(`DOCUMENT_TYPE_FIELD: ${ctx.documentType ?? ""}`);
  lines.push(`LANGUAGE_FIELD: ${ctx.language ?? ""}`);
  if (ctx.summary?.trim()) {
    lines.push(`ANALYSIS_SUMMARY:\n${ctx.summary.trim().slice(0, 3200)}`);
  }

  const sec = ctx.sections.slice(0, 60).map((s) => {
    const pg =
      s.page_start != null
        ? `p.${s.page_start}${s.page_end != null && s.page_end !== s.page_start ? `-${s.page_end}` : ""}`
        : "";
    return `- ${pg} ${s.title}: ${(s.summary || "").trim().slice(0, 220)}`;
  });
  if (sec.length) lines.push(`SECTIONS:\n${sec.join("\n")}`);

  const ch = ctx.chunks.slice(0, 90).map((c) => {
    const pg = c.page_number != null ? `p.${c.page_number}` : "p.?";
    return `- ${pg} ${(c.chunk_text || "").trim().replace(/\s+/g, " ").slice(0, 360)}`;
  });
  if (ch.length) lines.push(`CHUNKS:\n${ch.join("\n")}`);

  const gl = ctx.glossary.slice(0, 40).map((g) => `- ${g.term}: ${(g.definition || "").trim().slice(0, 200)}`);
  if (gl.length) lines.push(`GLOSSARY:\n${gl.join("\n")}`);

  const pg = ctx.pages.slice(0, 40).map(
    (p) => `- p.${p.page_number} ${(p.page_summary || "").trim().slice(0, 240)}`,
  );
  if (pg.length) lines.push(`PAGE_SUMMARIES:\n${pg.join("\n")}`);

  const vis = ctx.visuals.slice(0, 30).map((v) => {
    const p = v.source_page_number != null ? `p.${v.source_page_number}` : "";
    return `- ${p} ${(v.title || "").trim()}: ${(v.description || "").trim().slice(0, 160)}`;
  });
  if (vis.length) lines.push(`VISUALS:\n${vis.join("\n")}`);

  if (ctx.mindMapNodes.length) {
    const mm = ctx.mindMapNodes
      .slice(0, 40)
      .map((n) => `- (${n.node_type}) ${n.label}: ${(n.description || "").trim().slice(0, 140)}`);
    lines.push(`MIND_MAP_NODES:\n${mm.join("\n")}`);
  }

  return lines.join("\n\n").slice(0, maxChars);
}
