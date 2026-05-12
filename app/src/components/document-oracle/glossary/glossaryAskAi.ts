import type { DocOracleGlossaryRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import { normalizeGlossaryPages } from "@/components/document-oracle/glossary/glossaryNormalize";
import { isGenericGlossaryDefinition } from "@/components/document-oracle/glossary/glossaryCategoryInference";

export function buildGlossaryTermAskPrompt(term: DocOracleGlossaryRow): string {
  const pages = normalizeGlossaryPages(term.pages);
  let prompt = `Please explain the glossary term "${term.term}" in this document. Include:
1. A simple definition
2. Where it appears
3. Why it matters in this document
4. Related terms
5. Page citations`;
  if (pages.length > 0) {
    prompt += `\n\nReference pages: ${pages.map((p) => `p.${p}`).join(", ")}`;
  }
  const def = term.definition?.trim();
  if (def && !isGenericGlossaryDefinition(def)) {
    prompt += `\n\nExisting glossary note (may be incomplete): ${def}`;
  }
  return prompt;
}
