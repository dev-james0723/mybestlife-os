"use client";

/**
 * Wraps RelationshipForm in a Dialog. The dialog handles open/close +
 * title; the form handles draft state + submit. Mode is inferred from
 * whether `initial.id` is set:
 *   - id missing → create
 *   - id present → edit
 */

import { useMemo } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OSDialogSurface } from "@/components/ui/os-primitives";
import {
  RelationshipForm,
  type RelationshipFormInitial,
} from "@/components/relationship/forms/relationship-form";
import {
  relationshipDialogBodyClassName,
  relationshipDialogHeaderClassName,
} from "@/components/relationship/relationship-os";
import { useAppStore } from "@/stores/app-store";
import { getRelationshipUiCopy } from "@/lib/i18n/relationship-ui";
import type { RelationshipInsert } from "@/types/relationship";
import type { Project } from "@/types/database";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: RelationshipFormInitial;
  projects: readonly Project[];
  onSubmit: (payload: RelationshipInsert) => void;
  isSubmitting?: boolean;
};

export function RelationshipFormModal({
  open,
  onOpenChange,
  initial,
  projects,
  onSubmit,
  isSubmitting,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const isEdit = Boolean(initial?.id);
  const title = isEdit ? copy.relEditTitle : copy.relCreateTitle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <OSDialogSurface className="flex max-h-[88dvh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className={relationshipDialogHeaderClassName}>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className={relationshipDialogBodyClassName}>
            {/*
              `key` triggers a fresh mount whenever we switch between
              create (no id) and edit (with id), or between two different
              edits. This avoids the React-anti-pattern of resetting form
              state via useEffect+setState (cascading renders).
            */}
            <RelationshipForm
              key={initial?.id ?? "__new__"}
              initial={initial}
              projects={projects}
              onSubmit={onSubmit}
              onCancel={() => onOpenChange(false)}
              isSubmitting={isSubmitting}
            />
          </div>
        </ScrollArea>
      </OSDialogSurface>
    </Dialog>
  );
}
