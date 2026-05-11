"use client";

import { useEffect, useRef } from "react";
import { useBucketSettings, useRunBucketSeedOnce } from "@/hooks/use-bucket-list";

/**
 * First-visit seed orchestrator. Calls the `seed_bucket_list_starter` RPC on
 * mount if:
 *   - settings loaded AND
 *   - settings.seeds_cleared is false.
 *
 * Idempotent on the backend, but we also gate it client-side with a ref so
 * StrictMode double-mount doesn't fire two concurrent RPCs.
 */
export function useBucketListFirstVisit() {
  const settings = useBucketSettings();
  const seedMutation = useRunBucketSeedOnce();
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    if (!settings.data) return;
    if (settings.data.seeds_cleared) return;
    hasAttempted.current = true;
    seedMutation.mutate();
  }, [settings.data, seedMutation]);
}
