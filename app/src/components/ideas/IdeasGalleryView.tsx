"use client";

import { IdeaCard } from "./IdeaCard";
import { AnimatePresence } from "framer-motion";
import type { Idea } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";

export function IdeasGalleryView({
  items,
  language,
  onOpen,
}: {
  items: Idea[];
  language: AppLocale;
  onOpen: (idea: Idea) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {items.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} language={language} onOpen={onOpen} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function IdeasListView({
  items,
  language,
  onOpen,
}: {
  items: Idea[];
  language: AppLocale;
  onOpen: (idea: Idea) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {items.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} language={language} onOpen={onOpen} className="min-h-0" />
        ))}
      </AnimatePresence>
    </div>
  );
}
