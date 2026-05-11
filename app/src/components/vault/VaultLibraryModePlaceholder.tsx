"use client";

import type { VaultUiCopy } from "@/lib/i18n/vault-ui";
import { EmptyState } from "@/components/shared/empty-state";
import { Layers } from "lucide-react";

type Props = {
  copy: VaultUiCopy["modes"];
};

export function VaultLibraryModePlaceholder({ copy }: Props) {
  return (
    <EmptyState
      icon={Layers}
      title={copy.wipTitle}
      description={copy.wipBody}
    />
  );
}
