/**
 * Web Worker entry point for correlation analysis.
 *
 * The main-thread path (computeInsights) is fine for n<500 rows. When the
 * user eventually has >1y of logs and we add more metric pairs, this
 * worker is the swap-in. Reserved for a follow-up PR — kept here so the
 * folder structure is frozen.
 *
 * To enable: `new Worker(new URL("./correlate.worker.ts", import.meta.url))`
 * and wire messages:
 *   postMessage({ rows }) -> main thread
 *   onmessage -> { insights }
 */

/// <reference lib="webworker" />

import { computeInsights, type JoinedDay } from "./correlationEngine";

type InMessage = { rows: JoinedDay[]; max?: number };

self.addEventListener("message", (event: MessageEvent<InMessage>) => {
  const { rows, max = 3 } = event.data;
  const insights = computeInsights(rows, max);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ insights });
});

export {};
