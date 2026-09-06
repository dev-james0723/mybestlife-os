import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,filter,opacity] duration-150 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 motion-reduce:transition-none dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        "gradient-pink":
          "bg-[linear-gradient(135deg,var(--accent-pink-from),var(--accent-pink-to))] text-[var(--accent-pink-foreground)] shadow-[0_4px_14px_-4px_var(--accent-pink)] hover:shadow-[0_6px_20px_-4px_var(--accent-pink)] hover:brightness-[1.05] focus-visible:ring-[var(--accent-pink)]/40",
      },
      size: {
        default:
          "h-8 min-h-11 min-w-11 gap-1.5 px-2.5 sm:min-h-0 sm:min-w-0 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 min-h-11 min-w-11 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs sm:min-h-0 sm:min-w-0 in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 min-h-11 min-w-11 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] sm:min-h-0 sm:min-w-0 in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 min-h-11 min-w-11 gap-1.5 px-2.5 sm:min-h-0 sm:min-w-0 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0",
        "icon-xs":
          "size-6 min-h-11 min-w-11 rounded-[min(var(--radius-md),10px)] sm:min-h-0 sm:min-w-0 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 min-h-11 min-w-11 rounded-[min(var(--radius-md),12px)] sm:min-h-0 sm:min-w-0 in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  nativeButton,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  // Base UI defaults nativeButton to true; `render={<Link />}` yields an <a>, which triggers a
  // dev warning unless nativeButton is false. When `render` is omitted, keep native <button>.
  const resolvedNativeButton =
    nativeButton !== undefined
      ? nativeButton
      : render != null
        ? false
        : true

  return (
    <ButtonPrimitive
      data-slot="button"
      data-control-variant={variant}
      data-control-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      nativeButton={resolvedNativeButton}
      render={render}
      {...props}
    />
  )
}

export { Button, buttonVariants }
