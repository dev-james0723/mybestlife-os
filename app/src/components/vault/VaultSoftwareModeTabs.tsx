"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VaultUiCopy } from "@/lib/i18n/vault-ui";
import {
  isVaultSoftwareMode,
  type VaultSoftwareMode,
} from "@/stores/vault-store";

type Props = {
  copy: VaultUiCopy["modes"];
  value: VaultSoftwareMode;
  onValueChange: (mode: VaultSoftwareMode) => void;
};

export function VaultSoftwareModeTabs({ copy, value, onValueChange }: Props) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => {
        if (isVaultSoftwareMode(v)) onValueChange(v);
      }}
      className="w-full min-w-0"
    >
      <TabsList
        variant="line"
        className="h-auto w-full min-w-0 flex-wrap justify-start gap-1 bg-transparent p-0 sm:flex-nowrap"
        aria-label={copy.groupAria}
      >
        <TabsTrigger value="my-vault" className="shrink-0 text-xs sm:text-sm">
          {copy.myVault}
        </TabsTrigger>
        <TabsTrigger value="recommended-stacks" className="shrink-0 text-xs sm:text-sm">
          {copy.recommendedStacks}
        </TabsTrigger>
        <TabsTrigger value="compare" className="shrink-0 text-xs sm:text-sm">
          {copy.compare}
        </TabsTrigger>
        <TabsTrigger value="build-stack" className="shrink-0 text-xs sm:text-sm">
          {copy.buildMyStack}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
