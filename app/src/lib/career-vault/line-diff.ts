/**
 * Classic Myers-style LCS line-diff. Small footprint, no runtime deps, good
 * enough for resume / bio / plain-text diffs where files are typically
 * <2k lines. Returns a flat list of `DiffRow`s suitable for rendering two
 * panels side-by-side: `equal` rows contain both `left` and `right`; `add`
 * rows have only `right`, `remove` rows only `left`.
 */

export type DiffOp = "equal" | "add" | "remove";

export type DiffRow = {
  op: DiffOp;
  leftNo?: number;
  rightNo?: number;
  left?: string;
  right?: string;
};

export type DiffStats = {
  added: number;
  removed: number;
  unchanged: number;
};

function buildLcsTable(a: string[], b: string[]): number[][] {
  const n = a.length;
  const m = b.length;
  const table: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        table[i][j] = table[i + 1][j + 1] + 1;
      } else {
        table[i][j] = Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
  }
  return table;
}

export function diffLines(oldText: string, newText: string): {
  rows: DiffRow[];
  stats: DiffStats;
} {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);
  const table = buildLcsTable(oldLines, newLines);

  const rows: DiffRow[] = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  let i = 0;
  let j = 0;
  const n = oldLines.length;
  const m = newLines.length;

  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      rows.push({
        op: "equal",
        left: oldLines[i],
        right: newLines[j],
        leftNo: i + 1,
        rightNo: j + 1,
      });
      unchanged += 1;
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      rows.push({ op: "remove", left: oldLines[i], leftNo: i + 1 });
      removed += 1;
      i += 1;
    } else {
      rows.push({ op: "add", right: newLines[j], rightNo: j + 1 });
      added += 1;
      j += 1;
    }
  }

  while (i < n) {
    rows.push({ op: "remove", left: oldLines[i], leftNo: i + 1 });
    removed += 1;
    i += 1;
  }

  while (j < m) {
    rows.push({ op: "add", right: newLines[j], rightNo: j + 1 });
    added += 1;
    j += 1;
  }

  return { rows, stats: { added, removed, unchanged } };
}
