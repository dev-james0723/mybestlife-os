"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Lock, Sprout, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { osSheenClassName, osSolidPanelClassName } from "@/components/ui/os-glass";
import { usePlantSeed, useGardenCollection } from "@/hooks/use-garden";
import { getPlantUnlockRequirement } from "@/lib/repositories/garden";
import { useAppStore } from "@/stores/app-store";
import { getGardenUiCopy } from "@/lib/i18n/garden-ui";
import type { PlantType } from "@/types/database";

const PLANTS: {
  type: PlantType;
  bloomDays: number;
  color: string;
}[] = [
  {
    type: "grass",
    bloomDays: 3,
    color: "from-green-100 to-green-50 dark:from-green-950/40 dark:to-green-900/20 border-green-200 dark:border-green-800",
  },
  {
    type: "sunflower",
    bloomDays: 5,
    color: "from-amber-100 to-amber-50 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200 dark:border-amber-800",
  },
  {
    type: "lily",
    bloomDays: 6,
    color: "from-pink-100 to-pink-50 dark:from-pink-950/40 dark:to-pink-900/20 border-pink-200 dark:border-pink-800",
  },
  {
    type: "orchid",
    bloomDays: 7,
    color: "from-purple-100 to-purple-50 dark:from-purple-950/40 dark:to-purple-900/20 border-purple-200 dark:border-purple-800",
  },
  {
    type: "apple_tree",
    bloomDays: 10,
    color: "from-red-100 to-red-50 dark:from-red-950/40 dark:to-red-900/20 border-red-200 dark:border-red-800",
  },
];

export function SeedSelector() {
  const language = useAppStore((s) => s.language);
  const ui = getGardenUiCopy(language);
  const plantSeed = usePlantSeed();
  const { data: collection } = useGardenCollection();
  const totalHarvests = collection?.length ?? 0;
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <motion.div
          initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <Sprout className="h-12 w-12 mx-auto text-green-500" />
        </motion.div>
        <h2 className="text-xl font-bold">{ui.chooseSeedTitle}</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {ui.chooseSeedDescription}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {PLANTS.map((plant, i) => {
          const requiredHarvests = getPlantUnlockRequirement(plant.type);
          const isLocked = totalHarvests < requiredHarvests;

          return (
            <motion.button
              key={plant.type}
              type="button"
              disabled={isLocked || plantSeed.isPending}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={reduceMotion || isLocked ? undefined : { y: -2 }}
              whileTap={reduceMotion || isLocked ? undefined : { scale: 0.985 }}
              transition={{ delay: reduceMotion ? 0 : i * 0.05, duration: reduceMotion ? 0 : 0.22 }}
              onClick={() => plantSeed.mutate(plant.type)}
              className={cn(
                osSolidPanelClassName,
                osSheenClassName,
                "relative flex min-h-[190px] flex-col items-center gap-3 overflow-hidden border p-4 text-center transition-[border-color,box-shadow,transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60",
                isLocked
                  ? "cursor-not-allowed opacity-55"
                  : "cursor-pointer hover:border-lime-300/60 hover:shadow-[0_14px_36px_rgba(15,23,42,0.12)]",
                `bg-gradient-to-b ${plant.color}`,
              )}
            >
              {isLocked && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/62 backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-1">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {ui.unlockRequirement(requiredHarvests)}
                    </span>
                  </div>
                </div>
              )}

              <span className="text-3xl">
                {plant.type === "grass" && "🌿"}
                {plant.type === "sunflower" && "🌻"}
                {plant.type === "lily" && "🌸"}
                {plant.type === "orchid" && "🪻"}
                {plant.type === "apple_tree" && "🍎"}
              </span>

              <div className="space-y-1">
                <h3 className="font-semibold">{ui.plantLabels[plant.type]}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {ui.plantDescriptions[plant.type]}
                </p>
              </div>

              <Badge variant="outline" className="mt-auto gap-1 border-border/60 bg-background/70 text-xs">
                <Clock className="h-3 w-3" />
                {ui.bloomDays(plant.bloomDays)}
              </Badge>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
