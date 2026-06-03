"use client";

import type { VaultUiCopy } from "@/lib/i18n/vault-ui";
import { OSEmptyState } from "@/components/ui/os-primitives";
import { Layers } from "lucide-react";

type Props = {
  copy: VaultUiCopy["modes"];
};

export function VaultLibraryModePlaceholder({ copy }: Props) {
  return (
    <OSEmptyState
      icon={Layers}
      title={copy.wipTitle}
      description={copy.wipBody}
    />
  );
}
