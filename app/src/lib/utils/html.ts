/** Decode common HTML entities once (for stored rich text). */
export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/** True if string likely contains HTML tags (for choosing render path). */
export function htmlLooksLikeMarkup(html: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(html);
}

/** True if markup is entity-escaped rather than raw HTML. */
export function htmlLooksEscaped(html: string): boolean {
  return /&lt;\/?[a-z][^&]*&gt;/i.test(html);
}

/** Strip dangerous tags/attributes from rich HTML before rendering. */
export function sanitizeRichTextHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\sstyle=(["']).*?\1/gi, "");
}

/** Normalize stored rich text: decode escaped HTML once, then sanitize. */
export function normalizeStoredRichText(content: string | null | undefined): string {
  if (!content) return "";
  const decoded = htmlLooksEscaped(content) ? decodeHtmlEntities(content) : content;
  return htmlLooksLikeMarkup(decoded) ? sanitizeRichTextHtml(decoded) : decoded;
}

/** Plain-text preview for HTML stored in gratitude (or other) entries. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tailwind classes for read-only rich HTML (match editor output). */
export const RICH_TEXT_VIEW_CLASS =
  "max-w-full break-words [overflow-wrap:anywhere] text-sm leading-relaxed text-foreground [&_*]:max-w-full [&_a]:text-blue-600 [&_a]:underline dark:[&_a]:text-blue-400 [&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-medium [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-1 [&_pre]:my-2 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:bg-muted/40 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed [&_s]:line-through [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6";
