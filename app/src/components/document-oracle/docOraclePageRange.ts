export type DocOraclePageRangeLike = {
  page_start: number | null;
  page_end: number | null;
};

export function formatDocOraclePageRange(range: DocOraclePageRangeLike): string {
  const start = range.page_start;
  const end = range.page_end;

  if (start == null && end == null) return "";
  if (start != null && (end == null || end === start)) return `P.${start}`;
  if (start == null && end != null) return `P.${end}`;
  return `P.${start}-P.${end}`;
}

export function formatDocOraclePageRangeWithLabel(range: DocOraclePageRangeLike): string {
  const value = formatDocOraclePageRange(range);
  if (!value) return "Pages n/a";
  if (range.page_start != null && (range.page_end == null || range.page_end === range.page_start)) {
    return `Page ${value}`;
  }
  return `Pages ${value}`;
}
