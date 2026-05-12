import { z } from "zod";
import { fetchGeminiPlannerJsonText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import type { DraftMindMapEdge, DraftMindMapNode } from "@/lib/document-brain/mind-map/mindMapTypes";
import { MIND_MAP_MAX_NODES } from "@/lib/document-brain/mind-map/mindMapTypes";

const geminiNodeZ = z.object({
  node_key: z.string().min(1).max(240),
  label: z.string().min(1).max(400),
  node_type: z.enum([
    "concept",
    "person",
    "organization",
    "date",
    "fee",
    "requirement",
    "question",
  ]),
  description: z.string().max(1200).optional().nullable(),
  importance_score: z.number().min(0).max(1).optional().nullable(),
  page_numbers: z.array(z.number().int().positive()).max(40).optional(),
  keywords: z.array(z.string().max(80)).max(24).optional(),
  source_chunk_ids: z.array(z.string().uuid()).max(40).optional(),
});

const geminiEdgeZ = z.object({
  source_key: z.string().min(1).max(240),
  target_key: z.string().min(1).max(240),
  relationship_type: z.string().max(80).optional().nullable(),
  label: z.string().max(200).optional().nullable(),
  description: z.string().max(800).optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
});

const geminiOutZ = z.object({
  nodes: z.array(geminiNodeZ).max(20),
  edges: z.array(geminiEdgeZ).max(80),
});

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function stripJsonFence(t: string): string {
  let s = t.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return s.trim();
}

function dominantLanguageHint(language: string | null, summary: string | null): string {
  const l = (language || "").toLowerCase();
  if (l.startsWith("zh") || /[\u4e00-\u9fff]/.test(summary || "")) {
    return "Use Traditional Chinese (zh-TW) for labels and descriptions when the document is primarily Chinese.";
  }
  if (l.startsWith("en") || l === "english") return "Use English for labels and descriptions.";
  if (summary && /[\u4e00-\u9fff]/.test(summary)) {
    return "The document appears Chinese-heavy: use Traditional Chinese for labels and descriptions.";
  }
  return "Match the dominant language of the document for labels and descriptions.";
}

/**
 * Optional Gemini enrichment: adds concept / entity nodes and edges.
 * Returns merged drafts; on failure returns the original drafts unchanged.
 */
export async function enrichMindMapWithGemini(params: {
  language: string | null;
  summary: string | null;
  sectionDigest: string;
  glossaryDigest: string;
  chunkDigest: string;
  existingKeys: Set<string>;
  nodes: DraftMindMapNode[];
  edges: DraftMindMapEdge[];
}): Promise<{ nodes: DraftMindMapNode[]; edges: DraftMindMapEdge[]; gemini_used: boolean; gemini_error?: string }> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return { nodes: params.nodes, edges: params.edges, gemini_used: false };
  }

  const langRule = dominantLanguageHint(params.language, params.summary);

  const systemInstruction =
    "You enrich a structured document mind map. Output STRICT JSON only.\n" +
    "Rules:\n" +
    "- Do NOT invent entities unsupported by the supplied digests.\n" +
    "- Every concept MUST cite at least one page number from the digest OR reference existing section/glossary keys in edges.\n" +
    "- Prefer 6–12 high-value concept nodes.\n" +
    "- node_key must be unique, lowercase slug with prefix, e.g. concept:energy-rebate.\n" +
    "- Edges may connect to existing keys provided in CONTEXT (e.g. document:root, section:UUID, glossary:UUID).\n" +
    "- relationship_type examples: contains, explains, supports, references, part_of, defines, related_to_visual, contrasts_with.\n" +
    `${langRule}\n` +
    'Return JSON shape: {"nodes":[...],"edges":[...]} matching the user schema.';

  const userText = [
    "CONTEXT — sections (id:title:pages:summary excerpt):\n",
    params.sectionDigest.slice(0, 14_000),
    "\n\nCONTEXT — glossary (id:term:pages):\n",
    params.glossaryDigest.slice(0, 8000),
    "\n\nCONTEXT — chunk excerpts (id:page:snippet):\n",
    params.chunkDigest.slice(0, 14_000),
    "\n\nExisting node keys you may target in edges:\n",
    [...params.existingKeys].slice(0, 200).join("\n"),
    '\n\nReturn {"nodes":[],"edges":[]} as specified.',
  ].join("");

  let raw: string;
  try {
    const out = await fetchGeminiPlannerJsonText({ apiKey, systemInstruction, userText });
    raw = out.text;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { nodes: params.nodes, edges: params.edges, gemini_used: false, gemini_error: msg.slice(0, 400) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw)) as unknown;
  } catch {
    return { nodes: params.nodes, edges: params.edges, gemini_used: false, gemini_error: "invalid_json" };
  }

  const g = geminiOutZ.safeParse(parsed);
  if (!g.success) {
    return { nodes: params.nodes, edges: params.edges, gemini_used: false, gemini_error: "schema_reject" };
  }

  const keyToId = new Map<string, string>();
  for (const n of params.nodes) keyToId.set(n.node_key, n.id);

  const extraNodes: DraftMindMapNode[] = [];
  const extraEdges: DraftMindMapEdge[] = [];

  for (const gn of g.data.nodes) {
    if (params.nodes.length + extraNodes.length >= MIND_MAP_MAX_NODES - 4) break;
    if (keyToId.has(gn.node_key)) continue;
    const id = newId();
    keyToId.set(gn.node_key, id);
    const pages = (gn.page_numbers ?? []).map((p) => Math.floor(p)).filter((p) => p > 0);
    const evidence =
      pages.length > 0
        ? pages.slice(0, 4).map((p) => ({ page: p, quote: (gn.description || "").slice(0, 120) || "…" }))
        : [];
    extraNodes.push({
      id,
      node_key: gn.node_key,
      label: gn.label,
      node_type: gn.node_type,
      description: gn.description ?? null,
      importance_score: gn.importance_score ?? null,
      page_numbers: pages,
      section_ids: [],
      visual_asset_ids: [],
      glossary_term_ids: [],
      source_chunk_ids: (gn.source_chunk_ids ?? []).slice(0, 40),
      keywords: (gn.keywords ?? []).slice(0, 24),
      position_x: null,
      position_y: null,
      collapsed: false,
      metadata: { evidence, default_hidden: false },
    });
  }

  for (const ge of g.data.edges) {
    const sid = keyToId.get(ge.source_key);
    const tid = keyToId.get(ge.target_key);
    if (!sid || !tid) continue;
    extraEdges.push({
      id: newId(),
      source_node_id: sid,
      target_node_id: tid,
      relationship_type: ge.relationship_type ?? "related_to",
      label: ge.label ?? null,
      description: ge.description ?? null,
      confidence: ge.confidence ?? null,
      metadata: {},
    });
  }

  const rootKey = "document:root";
  for (const n of extraNodes) {
    const hasIncoming = extraEdges.some((e) => e.target_node_id === n.id);
    const hasAnyIncoming = [...params.edges, ...extraEdges].some((e) => e.target_node_id === n.id);
    if (!hasIncoming && !hasAnyIncoming) {
      const rootId = keyToId.get(rootKey);
      if (rootId) {
        extraEdges.push({
          id: newId(),
          source_node_id: rootId,
          target_node_id: n.id,
          relationship_type: "contains",
          label: "topic",
          description: null,
          confidence: 0.75,
          metadata: {},
        });
      }
    }
  }

  return {
    nodes: [...params.nodes, ...extraNodes],
    edges: [...params.edges, ...extraEdges],
    gemini_used: extraNodes.length > 0,
  };
}

export function buildGeminiDigests(params: {
  sections: { id: string; title: string; page_start: number | null; page_end: number | null; summary: string | null }[];
  glossary: { id: string; term: string; pages: unknown }[];
  chunks: { id: string; page_number: number | null; chunk_text: string }[];
}): { sectionDigest: string; glossaryDigest: string; chunkDigest: string } {
  const sectionDigest = params.sections
    .slice(0, 80)
    .map((s) => {
      const sum = (s.summary || "").replace(/\s+/g, " ").slice(0, 220);
      return `${s.id}:${s.title}:p${s.page_start ?? "?"}-${s.page_end ?? "?"}:${sum}`;
    })
    .join("\n");

  const glossaryDigest = params.glossary
    .slice(0, 60)
    .map((g) => {
      const p = Array.isArray(g.pages) ? JSON.stringify(g.pages).slice(0, 80) : "[]";
      return `${g.id}:${g.term}:${p}`;
    })
    .join("\n");

  const chunkDigest = params.chunks
    .slice(0, 40)
    .map((c) => {
      const t = c.chunk_text.replace(/\s+/g, " ").slice(0, 320);
      return `${c.id}:${c.page_number ?? "?"}:${t}`;
    })
    .join("\n");

  return { sectionDigest, glossaryDigest, chunkDigest };
}
