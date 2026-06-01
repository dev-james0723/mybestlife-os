"use client";

import { useMemo } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import { useBucketListStore } from "@/stores/bucket-list-store";
import { useBucketItem } from "@/hooks/use-bucket-list";

import {
  DreamActivationWizard,
  DreamActivationWizardLoading,
} from "./activate/dream-activation-wizard";

/**
 * The Dream Activation Engine entry point. Hosts the guided activation wizard
 * (mode → AI plan → review → confirmed writes). Preserves the existing store
 * wiring (`activateModalBucketId` / `closeActivateModal`) so every caller keeps
 * working.
 */
export function ActivateDreamModal() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const bucketId = useBucketListStore((s) => s.activateModalBucketId);
  const close = useBucketListStore((s) => s.closeActivateModal);
  const bucket = useBucketItem(bucketId);

  const open = Boolean(bucketId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent size="2xl" className="max-h-[min(90dvh,860px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.activateEngineTitle}</DialogTitle>
          <DialogDescription>{copy.activateEngineDescription}</DialogDescription>
        </DialogHeader>

        {bucket.data ? (
          <DreamActivationWizard item={bucket.data} copy={copy} onClose={close} />
        ) : (
          <DreamActivationWizardLoading />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Alias: the activation engine is the modal entry point. */
export const DreamActivationEngine = ActivateDreamModal;
