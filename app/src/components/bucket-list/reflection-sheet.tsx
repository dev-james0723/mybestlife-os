"use client";

import { useMemo } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import { useBucketListStore } from "@/stores/bucket-list-store";
import { useBucketItem } from "@/hooks/use-bucket-list";

import { RealizedDreamReflectionWizard } from "./memory/realized-dream-reflection-wizard";

/**
 * Hosts the "Capture the memory" reflection wizard. Preserves the existing
 * store wiring (`reflectionSheetBucketId` / `closeReflectionSheet`) so every
 * caller keeps working.
 */
export function ReflectionSheet() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const bucketId = useBucketListStore((s) => s.reflectionSheetBucketId);
  const close = useBucketListStore((s) => s.closeReflectionSheet);
  const bucket = useBucketItem(bucketId);

  return (
    <Sheet open={Boolean(bucketId)} onOpenChange={(v) => !v && close()}>
      <SheetContent
        side="right"
        className="flex w-full max-w-xl flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{copy.memoryCaptureTitle}</SheetTitle>
          <SheetDescription>{copy.reflectDescription}</SheetDescription>
        </SheetHeader>

        {bucket.data ? (
          <RealizedDreamReflectionWizard
            item={bucket.data}
            copy={copy}
            onClose={close}
          />
        ) : (
          <div className="flex-1" />
        )}
      </SheetContent>
    </Sheet>
  );
}
