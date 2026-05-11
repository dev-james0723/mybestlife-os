/**
 * Coerce unknown values to Error so devtools (e.g. Next.js overlay) never show "[object Object]".
 */
export function ensureError(err: unknown, fallbackMessage = "Something went wrong"): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const msg = o.message;
    if (typeof msg === "string" && msg.trim()) {
      const e = new Error(msg);
      const code = o.code;
      if (typeof code === "string") (e as Error & { code?: string }).code = code;
      return e;
    }
  }
  if (typeof err === "string" && err.trim()) return new Error(err);
  try {
    const serialized = JSON.stringify(err);
    if (serialized && serialized !== "{}") return new Error(serialized);
  } catch {
    /* ignore */
  }
  return new Error(fallbackMessage);
}
