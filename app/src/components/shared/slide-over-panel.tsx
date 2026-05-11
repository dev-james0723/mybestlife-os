"use client";

import { type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const widthClasses = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-2xl",
  "2xl": "sm:max-w-3xl",
};

export function SlideOverPanel({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  footer,
  width = "lg",
}: SlideOverPanelProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className={cn("flex flex-col p-0", widthClasses[width])}>
        <SheetHeader className="shrink-0 border-b border-border px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <SheetTitle>{title}</SheetTitle>
              {description && (
                <SheetDescription className="mt-1">{description}</SheetDescription>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 shrink-0">{actions}</div>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="px-6 py-4">{children}</div>
        </ScrollArea>
        {footer && (
          <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
