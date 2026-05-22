"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { JournalUiCopy } from "@/lib/i18n/journal-ui";

interface UnsavedChangesDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  copy: JournalUiCopy;
}

export function UnsavedChangesDialog({
  open,
  onCancel,
  onConfirm,
  copy,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.unsavedTitle}</AlertDialogTitle>
          <AlertDialogDescription>{copy.unsavedDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{copy.unsavedStay}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {copy.unsavedLeave}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
