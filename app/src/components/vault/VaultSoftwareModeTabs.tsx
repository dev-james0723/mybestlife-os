"use client";

import { OSSegmentedControl } from "@/components/ui/os-primitives";
import type { VaultUiCopy } from "@/lib/i18n/vault-ui";
import {
  isVaultSoftwareMode,
  type VaultSoftwareMode,
} from "@/stores/vault-store";

type Props = {
  copy: VaultUiCopy["modes"];
  usageLabel: string;
  value: VaultSoftwareMode;
  onValueChange: (mode: VaultSoftwareMode) => void;
};

export function VaultSoftwareModeTabs({ copy, usageLabel, value, onValueChange }: Props) {
  const items = [
    { id: "my-vault" as const, label: copy.myVault },
    { id: "usage" as const, label: usageLabel },
    { id: "recommended-stacks" as const, label: copy.recommendedStacks },
    { id: "compare" as const, label: copy.compare },
    { id: "build-stack" as const, label: copy.buildMyStack },
  ];

  return (
    <OSSegmentedControl
      items={items}
      value={value}
      onValueChange={(v) => {
        if (isVaultSoftwareMode(v)) onValueChange(v);
      }}
      ariaLabel={copy.groupAria}
      className="w-full sm:w-fit"
      layoutId="vault-software-mode-active"
    />
  );
}
