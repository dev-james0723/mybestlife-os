"use client";

import { AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface PromptGridProps {
  children: ReactNode;
}

/**
 * Simple responsive grid that animates card entry/exit.
 *
 * 1 column on narrow phones, 2 on sm, 3 on lg, 4 on xl.
 */
export function PromptGrid({ children }: PromptGridProps) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </AnimatePresence>
  );
}
