import { cn } from "@/lib/utils";

type LifeOsLogoProps = {
  className?: string;
  size?: "sm" | "md";
};

const sizeClass = {
  sm: "size-7",
  md: "size-8",
} as const;

/**
 * Interlocking rings mark used in the reference app header.
 */
export function LifeOsLogo({ className, size = "md" }: LifeOsLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn(sizeClass[size], "shrink-0 text-[color:var(--life-os-brand)]", className)}
      aria-hidden
    >
      <circle cx="12" cy="16" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.25" />
      <circle cx="20" cy="16" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.25" />
    </svg>
  );
}
