/**
 * Stable evidence hashing for Brain edge suggestions.
 *
 * Why hashes? When a user rejects a suggested edge ("don't suggest this
 * connection again"), we persist the rejection. On the next graph build,
 * the same suggestion would be regenerated unless we can recognize it.
 * The hash combines:
 *   - sorted source/target ids
 *   - relationship type
 *   - canonical evidence string (sorted JSON)
 *
 * Two suggestions hash equal if and only if they assert the same
 * relationship for the same evidence — meaning if the user's content
 * changes (e.g. a new tag is added that produces a stronger suggestion
 * with extra evidence), the hash changes and the suggestion can resurface.
 *
 * Implementation uses Web Crypto's SHA-256 when available (browser +
 * Node 19+) and falls back to a simple djb2 hash for environments where
 * crypto isn't available (e.g. SSR with old Node — should never happen
 * in production but kept for safety).
 */

/** Stable-stringify a JSON value (keys sorted alphabetically). */
export function stableStringify(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const out: string[] = [];
    for (const k of keys) {
      out.push(
        `${JSON.stringify(k)}:${stableStringify(
          (value as Record<string, unknown>)[k],
        )}`,
      );
    }
    return `{${out.join(",")}}`;
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "undefined") return "null";
  return JSON.stringify(value);
}

/** Cheap deterministic non-crypto hash used as fallback. */
function djb2Hex(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = (h * 33) ^ text.charCodeAt(i);
  }
  // Cast to unsigned 32-bit, then to hex.
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** SHA-256 of a string, hex-encoded. */
async function sha256Hex(text: string): Promise<string> {
  const subtle = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
  if (!subtle) return djb2Hex(text);
  const buf = new TextEncoder().encode(text);
  const out = await subtle.digest("SHA-256", buf);
  return [...new Uint8Array(out)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Compute the canonical evidence hash for a Brain edge suggestion.
 * `sourceNodeId`/`targetNodeId` are sorted so undirected hashes match
 * regardless of which side was emitted first.
 */
export async function computeEvidenceHash(input: {
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string;
  evidence?: Record<string, unknown> | null;
}): Promise<string> {
  const [a, b] =
    input.sourceNodeId < input.targetNodeId
      ? [input.sourceNodeId, input.targetNodeId]
      : [input.targetNodeId, input.sourceNodeId];
  const text = stableStringify({
    a,
    b,
    t: input.relationshipType,
    e: input.evidence ?? null,
  });
  return sha256Hex(text);
}

/** Sync variant — used when async is awkward. Slightly weaker hash. */
export function computeEvidenceHashSync(input: {
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string;
  evidence?: Record<string, unknown> | null;
}): string {
  const [a, b] =
    input.sourceNodeId < input.targetNodeId
      ? [input.sourceNodeId, input.targetNodeId]
      : [input.targetNodeId, input.sourceNodeId];
  return djb2Hex(
    stableStringify({
      a,
      b,
      t: input.relationshipType,
      e: input.evidence ?? null,
    }),
  );
}
