"use client";

import { BucketTravelMap } from "@/components/bucket-list/travel-map";
import { DetailHubDialog } from "@/components/bucket-list/detail-hub-dialog";
import { ActivateDreamModal } from "@/components/bucket-list/activate-dream-modal";

export default function BucketTravelMapPage() {
  return (
    <>
      <BucketTravelMap />
      <DetailHubDialog />
      <ActivateDreamModal />
    </>
  );
}
