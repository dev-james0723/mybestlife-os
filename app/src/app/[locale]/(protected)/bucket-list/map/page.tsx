"use client";

import { BucketTravelMap } from "@/components/bucket-list/travel-map";
import { AddDreamSheet } from "@/components/bucket-list/add-dream-sheet";
import { DetailHubDialog } from "@/components/bucket-list/detail-hub-dialog";
import { ActivateDreamModal } from "@/components/bucket-list/activate-dream-modal";

export default function BucketTravelMapPage() {
  return (
    <>
      <BucketTravelMap />
      <AddDreamSheet />
      <DetailHubDialog />
      <ActivateDreamModal />
    </>
  );
}
