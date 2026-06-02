"use client";

import { Plus } from "lucide-react";
import { OSPrimaryAction } from "@/components/ui/os-primitives";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import { cn } from "@/lib/utils";

export type QuickAddButtonProps = {
  copy: FinanceUiCopy;
  onClick: () => void;
};

export function QuickAddButton({ copy, onClick }: QuickAddButtonProps) {
  return (
    <OSPrimaryAction
      type="button"
      size="lg"
      osSize="none"
      className={cn(
        "fixed z-[100] flex h-14 w-14 items-center justify-center rounded-full p-0",
        "ring-4 ring-lime-300/25 ring-offset-2 ring-offset-background",
        "hover:scale-[1.04] active:scale-[0.98]",
        "bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))]",
        "right-[max(1.25rem,env(safe-area-inset-right,0px))]",
        "sm:bottom-8 sm:right-8",
      )}
      aria-label={copy.quickAddAria}
      onClick={onClick}
    >
      <Plus className="h-7 w-7" strokeWidth={2.25} aria-hidden />
    </OSPrimaryAction>
  );
}
