"use client";

import { FolderOpen, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";

interface VaultEmptyStateProps {
  copy: CareerVaultCopy;
  onUpload: () => void;
  variant?: "empty" | "noResults";
}

export function VaultEmptyState({
  copy,
  onUpload,
  variant = "empty",
}: VaultEmptyStateProps) {
  const isNoResults = variant === "noResults";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center"
    >
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-muted">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">
        {isNoResults ? copy.empty.noResultsTitle : copy.empty.title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {isNoResults ? copy.empty.noResultsDescription : copy.empty.description}
      </p>

      {!isNoResults ? (
        <>
          <Button onClick={onUpload} className="mt-6 h-11 px-4 sm:h-8 sm:px-2.5">
            <Plus className="mr-2 h-4 w-4" />
            {copy.uploadButton}
          </Button>

          <div className="mt-8 w-full max-w-sm rounded-xl bg-muted/50 p-4 text-left">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.empty.suggestionsTitle}
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span aria-hidden>📄</span>
                <span>{copy.empty.suggestionMasterResume}</span>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden>📸</span>
                <span>{copy.empty.suggestionPhoto}</span>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden>✍️</span>
                <span>{copy.empty.suggestionBio}</span>
              </li>
            </ul>
          </div>
        </>
      ) : null}
    </motion.div>
  );
}
