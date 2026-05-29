"use client";

import { useState } from "react";

import { AnalyticsControlCenter } from "@/components/analytics/AnalyticsControlCenter";
import { LoadingPage } from "@/components/shared/loading-state";
import { useLifeAnalytics } from "@/hooks/use-life-analytics";
import type { AnalyticsRangeKey } from "@/lib/analytics/types";

export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRangeKey>("7D");
  const { analytics, isLoading, failedBrainSlices } = useLifeAnalytics(range);

  if (isLoading || !analytics) return <LoadingPage />;

  return (
    <AnalyticsControlCenter
      analytics={analytics}
      range={range}
      onRangeChange={setRange}
      failedBrainSlices={failedBrainSlices}
    />
  );
}
