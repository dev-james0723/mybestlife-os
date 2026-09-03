"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DocumentIntakeDialog,
  type DocumentIntakeSaveInput,
} from "@/components/documents/DocumentIntakeDialog";
import { useAssets } from "@/hooks/use-assets";
import { useCreateDocument } from "@/hooks/use-documents";
import {
  assetDocumentsKey,
} from "@/hooks/use-asset-media";
import { assetDocumentsRepository } from "@/lib/repositories/asset-media";

type ConnectedDocumentIntakeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Connects the reusable intake UI to the existing Documents and Assets data
 * layers. Keeping this orchestration out of the visual component lets the same
 * intake experience power both global quick-add and the Resources page.
 */
export function ConnectedDocumentIntakeDialog({
  open,
  onOpenChange,
}: ConnectedDocumentIntakeDialogProps) {
  const { data: assets = [] } = useAssets();
  const createDocument = useCreateDocument();
  const queryClient = useQueryClient();
  const [isLinkingAssets, setIsLinkingAssets] = useState(false);

  const handleSave = async (
    input: DocumentIntakeSaveInput,
    lifecycle: { markSourceCommitted: () => void },
  ) => {
    const uploaded = input.upload;
    const document = await createDocument.mutateAsync({
      name: input.name.trim(),
      document_type: input.document_type || null,
      expiration_date: input.expiration_date || null,
      file_url: input.file_url || null,
      source_kind: uploaded
        ? uploaded.sourceKind
        : input.file_url
          ? "external_link"
          : "manual",
      storage_bucket: uploaded?.storageBucket ?? null,
      storage_path: uploaded?.storagePath ?? null,
      original_file_name: uploaded?.fileName ?? null,
      mime_type: uploaded?.mimeType ?? null,
      file_size: uploaded?.fileSize ?? null,
      ai_status: input.ai?.status ?? "not_requested",
      ai_confidence: input.ai?.confidence ?? null,
      ai_metadata: input.ai?.metadata ?? {},
      notes: input.notes || null,
    });

    // Once the Document row owns the storage path, dialog unmount cleanup must
    // never remove that file—even if optional Asset linking is still running.
    lifecycle.markSourceCommitted();

    if (!input.assetLinks.length) return;

    setIsLinkingAssets(true);
    try {
      const linkResults = await Promise.allSettled(
        input.assetLinks.map((link) =>
          assetDocumentsRepository.create({
            asset_id: link.assetId,
            document_id: document.id,
            document_role: link.role,
            confidence: null,
          }),
        ),
      );

      const failedCount = linkResults.filter(
        (result) => result.status === "rejected",
      ).length;

      for (const link of input.assetLinks) {
        queryClient.invalidateQueries({
          queryKey: assetDocumentsKey(link.assetId),
        });
      }

      if (failedCount) {
        toast.warning(
          `Document saved, but ${failedCount} asset link${failedCount === 1 ? "" : "s"} could not be added.`,
        );
      }
    } finally {
      setIsLinkingAssets(false);
    }
  };

  return (
    <DocumentIntakeDialog
      open={open}
      onOpenChange={onOpenChange}
      assets={assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        category: asset.category_key ?? asset.category,
      }))}
      onSave={handleSave}
      isSaving={createDocument.isPending || isLinkingAssets}
    />
  );
}
