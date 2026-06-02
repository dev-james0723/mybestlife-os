"use client";

import { Suspense } from "react";
import { LayoutGroup } from "framer-motion";

import { BucketWorkspaceTabs } from "@/components/bucket-list/bucket-workspace-tabs";
import { AddDreamSheet } from "@/components/bucket-list/add-dream-sheet";
import { AIDreamCaptureWizard } from "@/components/bucket-list/ai/ai-dream-capture-wizard";
import { DetailHubDialog } from "@/components/bucket-list/detail-hub-dialog";
import { ActivateDreamModal } from "@/components/bucket-list/activate-dream-modal";

export default function BucketListPage() {
  return (
    <LayoutGroup id="bucket-list">
      {/* Suspense: BucketWorkspaceTabs reads `?tab=` via useSearchParams,
          which opts the subtree into client rendering during prerender. */}
      <Suspense fallback={null}>
        <BucketWorkspaceTabs />
      </Suspense>
      <AddDreamSheet />
      <AIDreamCaptureWizard />
      <DetailHubDialog />
      <ActivateDreamModal />
    </LayoutGroup>
  );
}
