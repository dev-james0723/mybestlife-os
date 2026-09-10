/** Accept only an internal path; never an origin, protocol-relative URL or auth loop. */
export function safeReturnPath(value: string | null | undefined, fallback: string): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded)) return fallback;
    const url = new URL(value, "https://mybestlife.invalid");
    if (url.origin !== "https://mybestlife.invalid" || /\/(login|callback)(\/|$)/.test(url.pathname)) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}
