import type { DocOracleGlossaryRow, DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";

export function kwList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 12) : [];
}

function normKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Prefer exact title/term match, then substring match either direction. */
export function findSectionForTopic(sections: DocOracleSectionRow[], topic: string): DocOracleSectionRow | undefined {
  const t = normKey(topic);
  if (!t) return undefined;
  const exact = sections.find((s) => normKey(s.title) === t);
  if (exact) return exact;
  return sections.find((s) => {
    const st = normKey(s.title);
    return st.includes(t) || t.includes(st);
  });
}

export function findGlossaryForTopic(glossary: DocOracleGlossaryRow[], topic: string): DocOracleGlossaryRow | undefined {
  const t = normKey(topic);
  if (!t) return undefined;
  const exact = glossary.find((g) => normKey(g.term) === t);
  if (exact) return exact;
  return glossary.find((g) => {
    const gt = normKey(g.term);
    return gt.includes(t) || t.includes(gt);
  });
}
