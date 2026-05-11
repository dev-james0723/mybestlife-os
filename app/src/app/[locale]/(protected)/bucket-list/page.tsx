"use client";

import { BucketListShell } from "@/components/bucket-list/list-shell";
import { AddDreamSheet } from "@/components/bucket-list/add-dream-sheet";
import { DetailHubDialog } from "@/components/bucket-list/detail-hub-dialog";
import { ActivateDreamModal } from "@/components/bucket-list/activate-dream-modal";

export default function BucketListPage() {
  return (
    <>
      <BucketListShell />
      <AddDreamSheet />
      <DetailHubDialog />
      <ActivateDreamModal />
    </>
  );
}
