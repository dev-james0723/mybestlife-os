type SectionForRelation = {
  id: string;
  title: string;
  page_start: number | null;
  page_end: number | null;
};

type VisualTitleInput = {
  title: string | null;
  source_page_number: number | null;
  semantic_category: string | null;
  type: string | null;
};

type VisualForRelation = VisualTitleInput & { related_sections: unknown };

const HASH_LIKE = /^[a-f0-9]{16,}[\w.-]*$/i;
const GENERIC_DESC = /extracted from the document|visual asset|mineru/i;

export function isLikelyMachineAssetTitle(title: string | null | undefined): boolean {
  if (!title || !title.trim()) return true;
  const t = title.trim();
  if (t.length > 48 && (HASH_LIKE.test(t.replace(/\.[a-z0-9]+$/i, "")) || /^img[_-]/i.test(t))) return true;
  if (/\.(png|jpg|jpeg|webp|gif)$/i.test(t) && (t.includes("_") || /\d{3,}/.test(t))) return true;
  return false;
}

export function fallbackVisualTitle(v: VisualTitleInput): string {
  const page = v.source_page_number;
  const cat = (v.semantic_category || v.type || "visual").toLowerCase();
  if (cat.includes("table")) return page != null ? `Table from page ${page}` : "Table from document";
  if (cat.includes("figure") || cat.includes("fig")) return page != null ? `Figure from page ${page}` : "Figure from document";
  if (cat.includes("chart")) return page != null ? `Chart from page ${page}` : "Chart from document";
  if (cat.includes("formula")) return page != null ? `Formula from page ${page}` : "Formula from document";
  if (cat.includes("diagram")) return page != null ? `Diagram from page ${page}` : "Diagram from document";
  return page != null ? `Extracted visual from page ${page}` : "Extracted visual from document";
}

export function displayVisualTitle(v: VisualTitleInput): string {
  const raw = v.title?.trim();
  if (raw && !isLikelyMachineAssetTitle(raw)) return raw;
  return fallbackVisualTitle(v);
}

export function displayVisualDescription(v: { description: string | null }): string {
  const d = v.description?.trim();
  if (d && !GENERIC_DESC.test(d)) return d;
  return "";
}

function parseRelatedSectionIds(v: VisualForRelation): string[] {
  const raw = v.related_sections;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.length > 0) out.push(x);
    else if (x && typeof x === "object" && "id" in x && typeof (x as { id: unknown }).id === "string") {
      out.push((x as { id: string }).id);
    }
  }
  return out.slice(0, 8);
}

export function getRelatedSectionTitleForVisual(
  v: VisualForRelation,
  sections: SectionForRelation[],
): string | null {
  for (const sid of parseRelatedSectionIds(v)) {
    const s = sections.find((x) => x.id === sid);
    if (s) return s.title;
  }
  const pg = v.source_page_number;
  if (pg != null) {
    const hit = sections.find(
      (s) =>
        s.page_start != null &&
        s.page_end != null &&
        pg >= s.page_start &&
        pg <= s.page_end,
    );
    if (hit) return hit.title;
  }
  return null;
}
