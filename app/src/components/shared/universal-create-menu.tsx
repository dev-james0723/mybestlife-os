"use client";

import type { ReactElement } from "react";
import { Plus, type LucideIcon } from "lucide-react";
import { OSPrimaryAction } from "@/components/ui/os-primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type CreateMenuOption = {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
};

interface UniversalCreateMenuProps {
  options: CreateMenuOption[];
  /** Custom trigger element; defaults to a primary button showing `label`. */
  trigger?: ReactElement;
  label?: string;
  title?: string;
  align?: "start" | "center" | "end";
}

/**
 * Reusable "+ New" dropdown (Quick / Manual / AI etc). Generic enough to be
 * shared by Tasks, Projects and other modules.
 */
export function UniversalCreateMenu({
  options,
  trigger,
  label,
  title,
  align = "end",
}: UniversalCreateMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          trigger ?? (
            <OSPrimaryAction>
              <Plus className="h-4 w-4" />
              {label}
            </OSPrimaryAction>
          )
        }
      />
      <DropdownMenuContent align={align} className="w-64">
        {title && <DropdownMenuLabel>{title}</DropdownMenuLabel>}
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <DropdownMenuItem
              key={opt.id}
              onSelect={opt.onSelect}
              disabled={opt.disabled}
              variant={opt.variant}
              className="items-start gap-2 py-2"
            >
              {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
              <span className="flex flex-col">
                <span className="text-sm font-medium">{opt.label}</span>
                {opt.description && (
                  <span className="text-xs text-muted-foreground">
                    {opt.description}
                  </span>
                )}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
