/**
 * Bio Lab API routes share the auth + cache + Gemini-key helpers with the
 * habits routes. Re-export instead of re-implementing so a single change
 * (e.g. switching auth model) lands for both surfaces at once.
 */

export {
  requireAuthedContext,
  getApiKeyOrFail,
  withInsightCache,
  errorResponse,
  type AuthedContext,
  type WithCacheArgs,
} from "@/app/api/ai/habits/_shared";
