"use client";

import { Suspense } from "react";

import { BucketWorkspaceTabs } from "@/components/bucket-list/bucket-workspace-tabs";
import { AddDreamSheet } from "@/components/bucket-list/add-dream-sheet";
import { DetailHubDialog } from "@/components/bucket-list/detail-hub-dialog";
import { ActivateDreamModal } from "@/components/bucket-list/activate-dream-modal";

export default function BucketListPage() {
  return (
    <>
      {/* Suspense: BucketWorkspaceTabs reads `?tab=` via useSearchParams,
          which opts the subtree into client rendering during prerender. */}
      <Suspense fallback={null}>
        <BucketWorkspaceTabs />
      </Suspense>
      <AddDreamSheet />
      <DetailHubDialog />
      <ActivateDreamModal />
    </>
  );
}
