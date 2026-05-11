"use client";

import { Droplets, Sun, Leaf, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGardenInventory } from "@/hooks/use-garden";
import { useAppStore } from "@/stores/app-store";
import { getGardenUiCopy } from "@/lib/i18n/garden-ui";
import type { GardenItemType } from "@/types/database";

const ITEM_CONFIG: Record<GardenItemType, { icon: typeof Droplets; color: string }> = {
  water: { icon: Droplets, color: "text-blue-500" },
  sunlight: { icon: Sun, color: "text-amber-500" },
  fertilizer: { icon: Leaf, color: "text-green-500" },
  rare_seed: { icon: Sparkles, color: "text-purple-500" },
};

export function InventoryBar() {
  const language = useAppStore((s) => s.language);
  const ui = getGardenUiCopy(language);
  const { data: inventory, isLoading } = useGardenInventory();

  if (isLoading) return null;

  const items = inventory?.filter((i) => i.quantity > 0) ?? [];

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">{ui.inventoryLabel}</span>
      {items.map((item) => {
        const cfg = ITEM_CONFIG[item.item_type];
        const Icon = cfg.icon;
        return (
          <Badge key={item.item_type} variant="outline" className="gap-1 text-xs">
            <Icon className={`h-3 w-3 ${cfg.color}`} />
            {ui.itemLabels[item.item_type]} x{item.quantity}
          </Badge>
        );
      })}
    </div>
  );
}
