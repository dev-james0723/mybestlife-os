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
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RelationshipForm,
  type RelationshipFormInitial,
} from "@/components/relationship/forms/relationship-form";
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
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="px-6 py-5">
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
      </DialogContent>
    </Dialog>
  );
}
