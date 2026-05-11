"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileCard } from "./FileCard";
import type { CareerVaultFile } from "@/types/career-vault";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";

interface FileGridProps {
  files: CareerVaultFile[];
  copy: CareerVaultCopy;
  detailHref: (id: string) => string;
  onToggleStar: (file: CareerVaultFile) => void;
  onDownload: (file: CareerVaultFile) => void;
  onEdit: (file: CareerVaultFile) => void;
  onRequestDelete: (file: CareerVaultFile) => void;
  columnsClass?: string;
}

export function FileGrid({
  files,
  copy,
  detailHref,
  onToggleStar,
  onDownload,
  onEdit,
  onRequestDelete,
  columnsClass = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
}: FileGridProps) {
  return (
    <motion.div
      layout
      className={`grid ${columnsClass} gap-3`}
    >
      <AnimatePresence>
        {files.map((file, index) => (
          <motion.div
            key={file.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                delay: Math.min(index * 0.03, 0.24),
                duration: 0.22,
              },
            }}
            exit={{ opacity: 0, scale: 0.95, x: -32, transition: { duration: 0.18 } }}
          >
            <FileCard
              file={file}
              copy={copy}
              detailHref={detailHref(file.id)}
              onToggleStar={onToggleStar}
              onDownload={onDownload}
              onEdit={onEdit}
              onRequestDelete={onRequestDelete}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
