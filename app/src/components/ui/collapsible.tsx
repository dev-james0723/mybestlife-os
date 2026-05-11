"use client"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

import { cn } from "@/lib/utils"

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  )
}

/** Base UI drives `--collapsible-panel-height`; height + transition enable smooth open/close. */
const collapsiblePanelAnimationClasses =
  "box-border h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none data-[starting-style]:h-0 data-[ending-style]:h-0"

function CollapsibleContent({
  className,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(collapsiblePanelAnimationClasses, className)}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
