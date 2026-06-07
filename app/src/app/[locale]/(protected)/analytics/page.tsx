"use client";

import { useState } from "react";

import { AnalyticsControlCenter } from "@/components/analytics/AnalyticsControlCenter";
import { LoadingPage } from "@/components/shared/loading-state";
import { useLifeAnalytics } from "@/hooks/use-life-analytics";
import { DEFAULT_ANALYTICS_RANGE_SELECTION } from "@/lib/analytics/date-range";
import type { AnalyticsRangeSelection } from "@/lib/analytics/types";

export default function AnalyticsPage() {
  const [rangeSelection, setRangeSelection] = useState<AnalyticsRangeSelection>(
    DEFAULT_ANALYTICS_RANGE_SELECTION,
  );
  const { analytics, isLoading, failedBrainSlices } = useLifeAnalytics(rangeSelection);

  if (isLoading || !analytics) return <LoadingPage />;

  return (
    <AnalyticsControlCenter
      analytics={analytics}
      rangeSelection={rangeSelection}
      onRangeSelectionChange={setRangeSelection}
      failedBrainSlices={failedBrainSlices}
    />
  );
}
