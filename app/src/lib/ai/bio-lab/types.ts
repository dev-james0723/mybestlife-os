/**
 * Shared type signatures for the Bio Lab AI features. The Zod schemas in
 * `lib/ai/schemas/bio-lab/*` are the runtime parsers; these types are
 * convenient `z.infer` aliases so client code can talk in plain TypeScript
 * without importing Zod.
 *
 * No business logic lives here — only the wire shapes the API routes and
 * the client fetcher modules agree on.
 */

import type { z } from "zod";
import type {
  StateInferenceSchema,
  MindLabelSchema,
  MindTriageSchema,
  FocusRecommendationSchema,
  ResetSequenceSchema,
  WeeklyInsightSchema,
} from "@/lib/ai/schemas/bio-lab/index";

// --- State Scan ----------------------------------------------------------
export type StateInferenceResult = z.infer<typeof StateInferenceSchema>;

// --- Mind Sweep ----------------------------------------------------------
export type MindLabelResult = z.infer<typeof MindLabelSchema>;
export type MindTriageResult = z.infer<typeof MindTriageSchema>;

// --- Focus Sprint --------------------------------------------------------
export type FocusRecommendationResult = z.infer<typeof FocusRecommendationSchema>;

// --- System Reset --------------------------------------------------------
export type ResetSequenceResult = z.infer<typeof ResetSequenceSchema>;

// --- Hub Weekly Insight --------------------------------------------------
export type WeeklyInsightResult = z.infer<typeof WeeklyInsightSchema>;
