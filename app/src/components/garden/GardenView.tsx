"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Flame, Sparkles, Scissors, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlantStage } from "./PlantStage";
import { useWaterPlant, useHarvestPlant, useUseFertilizer, useGardenInventory } from "@/hooks/use-garden";
import { useAppStore } from "@/stores/app-store";
import { getGardenUiCopy } from "@/lib/i18n/garden-ui";
import type { PlantType, UserGarden } from "@/types/database";

const POINTS_PER_STAGE: Record<PlantType, number> = {
  grass: 3,
  sunflower: 5,
  lily: 6,
  orchid: 7,
  apple_tree: 10,
};

interface GardenViewProps {
  garden: UserGarden;
}

export function GardenView({ garden }: GardenViewProps) {
  const language = useAppStore((s) => s.language);
  const ui = getGardenUiCopy(language);
  const waterPlant = useWaterPlant();
  const harvestPlant = useHarvestPlant();
  const useFertilizer = useUseFertilizer();
  const { data: inventory } = useGardenInventory();
  const [showWaterDrop, setShowWaterDrop] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const alreadyWatered = garden.last_watered_at === today;
  const isFullyGrown = garden.growth_stage >= 5;

  const fertilizerCount = inventory?.find((i) => i.item_type === "fertilizer")?.quantity ?? 0;

  const threshold = POINTS_PER_STAGE[garden.plant_type];
  const progressPercent = isFullyGrown ? 100 : Math.min((garden.growth_points / threshold) * 100, 100);

  const handleWater = useCallback(async () => {
    setShowWaterDrop(true);
    setTimeout(() => setShowWaterDrop(false), 1200);
    await waterPlant.mutateAsync();
  }, [waterPlant]);

  const streakColor = garden.streak_days >= 7
    ? "text-orange-500"
    : garden.streak_days >= 3
      ? "text-amber-500"
      : "text-muted-foreground";

  return (
    <Card className="relative overflow-hidden border-0 shadow-none bg-gradient-to-b from-sky-50 to-green-50 dark:from-sky-950/30 dark:to-green-950/30">
      <CardContent className="flex flex-col items-center gap-6 py-8 px-4">
        {/* Streak badge */}
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <Flame className={`h-3.5 w-3.5 ${streakColor}`} />
            <span className="text-muted-foreground">{ui.streakDays(garden.streak_days)}</span>
          </Badge>
          {garden.streak_days >= 3 && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              {ui.growthBonus(garden.streak_days >= 7 ? 50 : 20)}
            </Badge>
          )}
        </div>

        {/* Plant display area */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72">
          <PlantStage
            plantType={garden.plant_type}
            stage={garden.growth_stage}
            isWilted={garden.is_wilted}
          />

          {/* Water drop animation */}
          <AnimatePresence>
            {showWaterDrop && (
              <motion.div
                initial={{ y: -40, opacity: 1 }}
                animate={{ y: 120, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: "easeIn" }}
                className="absolute top-0 left-1/2 -translate-x-1/2"
              >
                <Droplets className="h-8 w-8 text-blue-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Plant info */}
        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold">{ui.plantLabels[garden.plant_type]}</h3>
          <p className="text-sm text-muted-foreground">
            {ui.stageSummary(garden.growth_stage, 5, ui.stageNames[garden.growth_stage - 1] ?? "")}
          </p>
        </div>

        {/* Growth progress bar */}
        {!isFullyGrown && (
          <div className="w-full max-w-xs space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{ui.growthToNextStage}</span>
              <span className="tabular-nums">{garden.growth_points}/{threshold}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {isFullyGrown && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 px-4 py-2 rounded-lg text-sm font-medium text-center"
          >
            {ui.fullyBloomed}
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {!isFullyGrown && (
            <>
              <Button
                onClick={handleWater}
                disabled={alreadyWatered || waterPlant.isPending}
                className="gap-2"
              >
                <Droplets className="h-4 w-4" />
                {alreadyWatered ? ui.wateredToday : waterPlant.isPending ? ui.watering : ui.water}
              </Button>

              {fertilizerCount > 0 && (
                <Button
                  variant="outline"
                  onClick={() => useFertilizer.mutate()}
                  disabled={useFertilizer.isPending}
                  className="gap-2"
                >
                  <Leaf className="h-4 w-4 text-green-600" />
                  {ui.fertilize(fertilizerCount)}
                </Button>
              )}
            </>
          )}

          {isFullyGrown && (
            <Button
              onClick={() => harvestPlant.mutate()}
              disabled={harvestPlant.isPending}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Scissors className="h-4 w-4" />
              {harvestPlant.isPending ? ui.harvesting : ui.harvest}
            </Button>
          )}
        </div>

        {/* Variant badge */}
        {garden.variant !== "normal" && (
          <Badge variant="outline" className="capitalize border-amber-400 text-amber-700 dark:text-amber-300">
            {ui.variantBadge(ui.variantLabels[garden.variant])}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
