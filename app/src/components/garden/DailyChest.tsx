"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Gift, Droplets, Sun, Leaf, Sparkles } from "lucide-react";
import { OSFrostedPanel, OSPrimaryAction, OSSolidPanel } from "@/components/ui/os-primitives";
import { useClaimDailyChest, useGardenTodayLog } from "@/hooks/use-garden";
import { useAppStore } from "@/stores/app-store";
import { getGardenUiCopy } from "@/lib/i18n/garden-ui";
import type { GardenItemType } from "@/types/database";

const ITEM_CONFIG: Record<GardenItemType, { icon: typeof Droplets; color: string; rarity: "common" | "uncommon" | "rare" | "legendary" }> = {
  water: { icon: Droplets, color: "text-blue-500", rarity: "common" },
  sunlight: { icon: Sun, color: "text-amber-500", rarity: "uncommon" },
  fertilizer: { icon: Leaf, color: "text-green-500", rarity: "rare" },
  rare_seed: { icon: Sparkles, color: "text-purple-500", rarity: "legendary" },
};

const RARITY_BG: Record<string, string> = {
  common: "from-blue-100 to-blue-50 dark:from-blue-950/40 dark:to-blue-900/20",
  uncommon: "from-amber-100 to-amber-50 dark:from-amber-950/40 dark:to-amber-900/20",
  rare: "from-green-100 to-green-50 dark:from-green-950/40 dark:to-green-900/20",
  legendary: "from-purple-100 to-purple-50 dark:from-purple-950/40 dark:to-purple-900/20",
};

export function DailyChest() {
  const language = useAppStore((s) => s.language);
  const ui = getGardenUiCopy(language);
  const { data: todayLog, isLoading } = useGardenTodayLog();
  const claimChest = useClaimDailyChest();
  const [revealedItems, setRevealedItems] = useState<{ type: GardenItemType; qty: number }[] | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const reduceMotion = useReducedMotion();

  const alreadyClaimed = todayLog?.chest_claimed === true;

  const handleOpen = async () => {
    setIsOpening(true);
    try {
      const result = await claimChest.mutateAsync();
      setTimeout(() => {
        setRevealedItems(result.items);
        setIsOpening(false);
      }, 800);
    } catch {
      setIsOpening(false);
    }
  };

  if (isLoading) return null;

  if (alreadyClaimed && !revealedItems) {
    return (
      <OSSolidPanel className="flex items-center gap-3 border-dashed px-4 py-3 opacity-70">
        <Gift className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{ui.dailyChestClaimed}</span>
      </OSSolidPanel>
    );
  }

  return (
    <OSFrostedPanel className="px-4 py-4">
      <AnimatePresence mode="wait">
        {revealedItems ? (
          <motion.div
            key="result"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-center text-sm font-medium">{ui.dailyChestReceived}</p>
            <div className="flex flex-wrap justify-center gap-3">
              {revealedItems.map((item, i) => {
                const cfg = ITEM_CONFIG[item.type];
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={i}
                    initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: reduceMotion ? 0 : i * 0.12, duration: reduceMotion ? 0 : 0.22 }}
                    className={`flex min-w-[100px] flex-col items-center gap-1.5 rounded-xl bg-gradient-to-b ${RARITY_BG[cfg.rarity]} p-4`}
                  >
                    <Icon className={`h-8 w-8 ${cfg.color}`} />
                    <span className="text-xs font-semibold">{ui.itemLabels[item.type]}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {ui.rarityLabels[cfg.rarity]}
                    </span>
                    {item.qty > 1 && (
                      <span className="text-xs font-bold">x{item.qty}</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chest"
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div
              animate={
                reduceMotion
                  ? undefined
                  : isOpening
                    ? {
                        rotate: [0, -8, 8, -8, 8, 0],
                        scale: [1, 1.08, 1.08, 1.08, 1.08, 1.16],
                      }
                    : {
                        y: [0, -3, 0],
                      }
              }
              transition={
                isOpening
                  ? { duration: 0.8 }
                  : {
                      repeat: reduceMotion ? 0 : Infinity,
                      duration: 2,
                      ease: "easeInOut",
                    }
              }
            >
              <div className="relative">
                <Gift className="h-12 w-12 text-amber-600 dark:text-amber-400" />
                {!isOpening && !reduceMotion && (
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -right-1 -top-1"
                  >
                    <Sparkles className="h-4 w-4 text-amber-400" />
                  </motion.div>
                )}
              </div>
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-medium">{ui.dailyChestTitle}</p>
              <p className="text-xs text-muted-foreground">{ui.dailyChestDescription}</p>
            </div>
            <OSPrimaryAction
              onClick={handleOpen}
              disabled={isOpening || claimChest.isPending}
              osSize="compact"
              className="gap-2"
            >
              <Gift className="h-4 w-4" />
              {isOpening ? ui.openingChest : ui.openChest}
            </OSPrimaryAction>
          </motion.div>
        )}
      </AnimatePresence>
    </OSFrostedPanel>
  );
}
