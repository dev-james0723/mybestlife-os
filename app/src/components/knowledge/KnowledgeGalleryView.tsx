"use client";

import type { KnowledgeItem } from "@/types/knowledge";
import { KnowledgeCard } from "./KnowledgeCard";
import { AnimatePresence } from "framer-motion";

interface KnowledgeGalleryViewProps {
  items: KnowledgeItem[];
}

export function KnowledgeGalleryView({ items }: KnowledgeGalleryViewProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <KnowledgeCard key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}
