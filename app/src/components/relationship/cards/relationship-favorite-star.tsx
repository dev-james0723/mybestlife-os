"use client";

/**
 * Star toggle for the relationship card.
 *
 * Re-keys the icon span on `active` so framer-motion replays the spring
 * pop on every toggle. Reduced-motion users get a static icon. Click is
 * stop-propagated so the surrounding card's onClick doesn't also fire.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  active: boolean;
  onClick: () => void;
  /** Localized aria-label when not yet a favorite. */
  addLabel: string;
  /** Localized aria-label when currently a favorite. */
  removeLabel: string;
  className?: string;
};

export function RelationshipFavoriteStar({
  active,
  onClick,
  addLabel,
  removeLabel,
  className,
}: Props) {
  const reduce = useReducedMotion();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn(
        "h-8 w-8 p-0 shrink-0",
        active
          ? "text-amber-500 hover:text-amber-500"
          : "text-muted-foreground/60 hover:text-foreground",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={active ? removeLabel : addLabel}
      aria-pressed={active}
    >
      <motion.span
        key={String(active)}
        initial={reduce ? false : { scale: 0.7, rotate: -8 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 520, damping: 18 }}
        className="inline-flex"
      >
        <Star
          className="h-4 w-4"
          fill={active ? "currentColor" : "none"}
          strokeWidth={active ? 1.5 : 2}
        />
      </motion.span>
    </Button>
  );
}
