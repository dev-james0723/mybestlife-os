/**
 * Knowledge provider adapters. Each adapter owns extraction + normalization
 * for one source family; the mutations layer orchestrates which one to call
 * based on classifyKnowledgeInput().
 */

export { ingestArticle } from "./article";
export { ingestYouTube, type YouTubeIngestOptions } from "./youtube-provider";
export { ingestGitHubRepo } from "./github-provider";
export { ingestSocialPost } from "./social";
export { ingestMarkupInput, type MarkupIngestInput } from "./markup";
export type { NormalizedIngest } from "./types";

// ── Cascade-based provider pipeline (Wave 2+) ──
export { runProviderCascade, type CascadeOptions } from "./cascade";
export {
  REGISTRY,
  isSuccessRenderMode,
  makeFailureResult,
  defaultTimeoutFor,
  type SocialProvider,
  type ProviderContext,
  type ScreenshotService,
} from "./registry";
