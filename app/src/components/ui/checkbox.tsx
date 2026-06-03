"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-transparent transition-colors outline-none group-has-disabled/field:opacity-50 before:size-4 before:rounded-[4px] before:border before:border-input before:bg-transparent before:transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:before:border-destructive aria-invalid:aria-checked:before:border-primary dark:before:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:aria-invalid:before:border-destructive/50 data-checked:text-primary-foreground data-checked:before:border-primary data-checked:before:bg-primary dark:data-checked:before:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="absolute inset-0 grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
