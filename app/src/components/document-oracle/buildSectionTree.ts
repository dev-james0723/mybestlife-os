/** Minimal section shape for tree building (structurally matches DocOracleSectionRow). */
export type SectionTreeSource = {
  id: string;
  title: string;
  level: number;
  parent_id: string | null;
  page_start: number | null;
  page_end: number | null;
  summary: string | null;
  keywords: unknown;
  representative_pages: unknown;
};

export type SectionTreeNode = SectionTreeSource & { children: SectionTreeNode[] };

function sortKey(s: SectionTreeSource): [number, string] {
  return [s.page_start ?? 999_999, s.title];
}

function cmpSection(a: SectionTreeSource, b: SectionTreeSource): number {
  const [ap, at] = sortKey(a);
  const [bp, bt] = sortKey(b);
  if (ap !== bp) return ap - bp;
  return at.localeCompare(bt, undefined, { sensitivity: "base" });
}

function sortTree(nodes: SectionTreeNode[]): void {
  nodes.sort((a, b) => cmpSection(a, b));
  for (const n of nodes) sortTree(n.children);
}

function wrap(s: SectionTreeSource): SectionTreeNode {
  return { ...s, children: [] };
}

/** Infer tree from heading levels when parent_id is unusable. */
function treeFromLevelStack(sorted: SectionTreeSource[]): SectionTreeNode[] {
  const roots: SectionTreeNode[] = [];
  const stack: SectionTreeNode[] = [];
  for (const s of sorted) {
    const node = wrap(s);
    while (stack.length > 0 && stack[stack.length - 1]!.level >= node.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1]!.children.push(node);
    }
    stack.push(node);
  }
  sortTree(roots);
  return roots;
}

/**
 * Build a section tree: parent_id first when the dataset uses it; otherwise level stack on sorted sections.
 */
export function buildSectionTree(sections: readonly SectionTreeSource[]): SectionTreeNode[] {
  if (sections.length === 0) return [];

  const sorted = [...sections].sort((a, b) => cmpSection(a, b));
  const idSet = new Set(sorted.map((s) => s.id));
  const nodes = new Map(sorted.map((s) => [s.id, wrap(s)]));

  const validEdges = sorted.filter((s) => s.parent_id && idSet.has(s.parent_id)).length;

  if (validEdges === 0) {
    return treeFromLevelStack(sorted);
  }

  const childIds = new Set<string>();
  for (const s of sorted) {
    if (s.parent_id && idSet.has(s.parent_id)) {
      nodes.get(s.parent_id)!.children.push(nodes.get(s.id)!);
      childIds.add(s.id);
    }
  }

  const roots: SectionTreeNode[] = [];
  for (const s of sorted) {
    if (!childIds.has(s.id)) {
      roots.push(nodes.get(s.id)!);
    }
  }

  sortTree(roots);
  return roots;
}

export function flattenSectionTree(
  nodes: SectionTreeNode[],
  depth = 0,
): Array<{ node: SectionTreeNode; depth: number }> {
  const out: Array<{ node: SectionTreeNode; depth: number }> = [];
  for (const n of nodes) {
    out.push({ node: n, depth });
    out.push(...flattenSectionTree(n.children, depth + 1));
  }
  return out;
}

export function countDescendants(n: SectionTreeNode): number {
  let c = n.children.length;
  for (const ch of n.children) c += countDescendants(ch);
  return c;
}
